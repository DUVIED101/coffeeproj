import { sanitizeYearsInput, YEARS_MAX_VALUE } from './validation';

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
