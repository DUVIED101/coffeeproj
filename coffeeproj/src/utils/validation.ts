/**
 * Validation utility functions
 */

export const MAX_PASSWORD_LENGTH = 72;

/**
 * Validate email format. Rejects consecutive dots in the local part.
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^(?!.*\.\.)[^\s@.][^\s@]*@[^\s@.]+(?:\.[^\s@.]+)+$/;
  return emailRegex.test(email);
};

/**
 * Validate email and return error key if invalid. Caller maps via t().
 */
export const getEmailError = (email: string): string | null => {
  if (!email) {
    return 'auth.errors.emailRequired';
  }
  if (!validateEmail(email)) {
    return 'auth.errors.emailInvalid';
  }
  return null;
};

/**
 * Validate password strength
 * Requirements: 8–72 chars (bcrypt limit), 1 uppercase, 1 lowercase, 1 number
 */
export const validatePassword = (password: string): boolean => {
  if (password.length < 8 || password.length > MAX_PASSWORD_LENGTH) return false;

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return hasUpperCase && hasLowerCase && hasNumber;
};

/**
 * Get password validation error key. Caller maps via t().
 * For passwordTooLong the max can be interpolated: t(key, { max: MAX_PASSWORD_LENGTH }).
 */
export const getPasswordError = (password: string): string | null => {
  if (!password) {
    return 'auth.errors.passwordRequired';
  }
  if (password.length < 8) {
    return 'auth.errors.passwordTooShort';
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return 'auth.errors.passwordTooLong';
  }
  if (!/[A-Z]/.test(password)) {
    return 'auth.errors.passwordNoUpper';
  }
  if (!/[a-z]/.test(password)) {
    return 'auth.errors.passwordNoLower';
  }
  if (!/[0-9]/.test(password)) {
    return 'auth.errors.passwordNoNumber';
  }
  return null;
};

/**
 * Validate Russian phone number
 * Formats: +7XXXXXXXXXX, 8XXXXXXXXXX, 7XXXXXXXXXX
 */
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^(\+7|7|8)?[0-9]{10}$/;
  return phoneRegex.test(phone.replace(/[\s-()]/g, ''));
};

/**
 * Get phone validation error key. Caller maps via t().
 */
export const getPhoneError = (phone: string): string | null => {
  if (!phone) {
    return null; // Phone is optional
  }

  const cleanPhone = phone.replace(/[\s-()]/g, '');

  if (!validatePhone(cleanPhone)) {
    return 'auth.errors.phoneInvalid';
  }
  return null;
};

/**
 * Format phone number for display
 * Converts to +7 (XXX) XXX-XX-XX format
 */
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/[\s-()]/g, '');
  let digits = cleaned;

  // Remove leading +7, 7, or 8
  if (digits.startsWith('+7')) {
    digits = digits.substring(2);
  } else if (digits.startsWith('7') || digits.startsWith('8')) {
    digits = digits.substring(1);
  }

  if (digits.length !== 10) return phone;

  return `+7 (${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6, 8)}-${digits.substring(8)}`;
};

/**
 * Normalize phone number to +7XXXXXXXXXX format for storage
 */
export const normalizePhone = (phone: string): string => {
  const cleaned = phone.replace(/[\s-()]/g, '');
  let digits = cleaned;

  // Remove leading +7, 7, or 8
  if (digits.startsWith('+7')) {
    digits = digits.substring(2);
  } else if (digits.startsWith('7') || digits.startsWith('8')) {
    digits = digits.substring(1);
  }

  return `+7${digits}`;
};

/**
 * Validate required field
 */
export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

/**
 * Get required field error message
 */
export const getRequiredError = (value: string, fieldName: string): string | null => {
  if (!validateRequired(value)) {
    return `${fieldName} is required`;
  }
  return null;
};

/**
 * Validate min length
 */
export const validateMinLength = (value: string, minLength: number): boolean => {
  return value.length >= minLength;
};

/**
 * Validate max length
 */
export const validateMaxLength = (value: string, maxLength: number): boolean => {
  return value.length <= maxLength;
};
