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

export const NAME_MAX_LENGTH = 25;

// Cyrillic + Latin + space + hyphen + apostrophe (for names like O'Brien). Used
// as a per-keystroke sanitizer in TextInput onChangeText so users can only ever
// type allowed characters; non-matching keystrokes are silently dropped.
const NAME_ALLOWED_RE = /[A-Za-zА-Яа-яЁё\s'\-]/g;

export const sanitizeNameInput = (raw: string): string => {
  const filtered = raw.match(NAME_ALLOWED_RE)?.join('') ?? '';
  return filtered.slice(0, NAME_MAX_LENGTH);
};

// Years of experience: digits with optional decimal (comma or period). We
// normalize commas to periods so downstream parseFloat works, cap to a
// reasonable max length (e.g. "12.5" → 4 chars) AND clamp to YEARS_MAX_VALUE
// so the field can't hold an absurd value like "999" career years.
export const YEARS_MAX_LENGTH = 4;
export const YEARS_MAX_VALUE = 50;

export const sanitizeYearsInput = (raw: string): string => {
  // Replace comma with period (Russian decimal convention).
  const normalized = raw.replace(/,/g, '.');
  // Keep only digits and a single period.
  let result = '';
  let sawDot = false;
  for (const ch of normalized) {
    if (ch >= '0' && ch <= '9') {
      result += ch;
    } else if (ch === '.' && !sawDot && result.length > 0) {
      result += ch;
      sawDot = true;
    }
    if (result.length >= YEARS_MAX_LENGTH) break;
  }
  if (!result || result === '.') return result;
  const parsed = parseFloat(result);
  if (!Number.isNaN(parsed) && parsed > YEARS_MAX_VALUE) {
    return String(YEARS_MAX_VALUE);
  }
  return result;
};

// Integer-only sanitizer: strips everything that isn't a decimal digit and
// truncates to maxLength. Used for compensation amounts, founded year, etc.
export const sanitizeDigitsInput = (raw: string, maxLength: number): string => {
  const filtered = raw.replace(/\D+/g, '');
  return filtered.slice(0, maxLength);
};

// Limits for common free-text fields. These are length caps only — we don't
// restrict character set because users legitimately mix Cyrillic + Latin +
// punctuation + digits inside titles, descriptions, addresses, etc.
export const TITLE_MAX_LENGTH = 80;
export const DESCRIPTION_MAX_LENGTH = 1000;
export const SHORT_TEXT_MAX_LENGTH = 120;
export const ADDRESS_MAX_LENGTH = 200;
export const HANDLE_MAX_LENGTH = 100;
export const URL_MAX_LENGTH = 200;
export const COMPENSATION_MAX_DIGITS = 6;
export const YEAR_MAX_DIGITS = 4;
