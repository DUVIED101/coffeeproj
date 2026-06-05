import {
  sanitizeYearsInput,
  YEARS_MAX_VALUE,
  isCommonWeakPassword,
  validatePassword,
  getPasswordError,
} from './validation';

describe('sanitizeYearsInput', () => {
  it('passes through small valid integers', () => {
    expect(sanitizeYearsInput('5')).toBe('5');
    expect(sanitizeYearsInput('12')).toBe('12');
    expect(sanitizeYearsInput('50')).toBe('50');
  });

  it('passes through valid decimals (comma is normalised to period)', () => {
    expect(sanitizeYearsInput('5.5')).toBe('5.5');
    expect(sanitizeYearsInput('5,5')).toBe('5.5');
    expect(sanitizeYearsInput('12.5')).toBe('12.5');
  });

  it('strips non-digit/period characters', () => {
    expect(sanitizeYearsInput('abc5xyz')).toBe('5');
    expect(sanitizeYearsInput('5 years')).toBe('5');
  });

  it('keeps only the first decimal point and drops subsequent ones', () => {
    // '1.2.3' → '1' '.' '2' (skip second '.') '3' → '1.23'
    expect(sanitizeYearsInput('1.2.3')).toBe('1.23');
  });

  it('clamps integer values above the cap to YEARS_MAX_VALUE', () => {
    expect(sanitizeYearsInput('55')).toBe(String(YEARS_MAX_VALUE));
    expect(sanitizeYearsInput('99')).toBe(String(YEARS_MAX_VALUE));
    expect(sanitizeYearsInput('999')).toBe(String(YEARS_MAX_VALUE));
  });

  it('clamps decimal values above the cap to YEARS_MAX_VALUE', () => {
    expect(sanitizeYearsInput('50.5')).toBe(String(YEARS_MAX_VALUE));
    expect(sanitizeYearsInput('99.9')).toBe(String(YEARS_MAX_VALUE));
  });

  it('returns an empty string for an empty input', () => {
    expect(sanitizeYearsInput('')).toBe('');
  });

  it('does not promote a lone period into a numeric value', () => {
    expect(sanitizeYearsInput('.')).toBe('');
    expect(sanitizeYearsInput(',')).toBe('');
  });
});

describe('isCommonWeakPassword', () => {
  it.each(['password123', 'qwerty123', '12345678', 'admin123', 'iloveyou', 'qwerty2026'])(
    'rejects known leaked password %s',
    p => {
      expect(isCommonWeakPassword(p)).toBe(true);
    }
  );

  it('is case-insensitive', () => {
    expect(isCommonWeakPassword('Password123')).toBe(true);
    expect(isCommonWeakPassword('PASSWORD123')).toBe(true);
  });

  it.each(['Tr0ub4dor&3', 'CorrectHorseBatteryStaple9!', 'My$ecur3Cof33', 'D@vid2026X'])(
    'allows strong password %s',
    p => {
      expect(isCommonWeakPassword(p)).toBe(false);
    }
  );
});

describe('validatePassword + getPasswordError integration', () => {
  it('rejects a leaked password that otherwise meets char-class requirements', () => {
    // Password123 has upper, lower, digit AND ≥ 8 chars — pre-existing rules pass.
    // The new check must still reject because it's a known leaked pattern.
    expect(validatePassword('Password123')).toBe(false);
    expect(getPasswordError('Password123')).toBe('auth.errors.passwordTooCommon');
  });

  it('keeps existing char-class errors when password is short and weak', () => {
    // 'qwerty12' is a weak pattern AND lacks an uppercase letter. Char-class
    // error wins because it surfaces first — that's intentional, more
    // actionable feedback.
    expect(getPasswordError('qwerty12')).toBe('auth.errors.passwordNoUpper');
  });

  it('accepts a strong, non-leaked password', () => {
    expect(validatePassword('Tr0ub4dor&3')).toBe(true);
    expect(getPasswordError('Tr0ub4dor&3')).toBeNull();
  });
});
