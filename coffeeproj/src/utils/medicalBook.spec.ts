import { computeMedicalBookStatus } from './medicalBook';

describe('computeMedicalBookStatus', () => {
  const today = new Date(2026, 5, 1); // 2026-06-01

  it('returns "none" for null/undefined/empty', () => {
    expect(computeMedicalBookStatus(null, today)).toBe('none');
    expect(computeMedicalBookStatus(undefined, today)).toBe('none');
    expect(computeMedicalBookStatus('', today)).toBe('none');
  });

  it('returns "expired" for past dates', () => {
    expect(computeMedicalBookStatus('2026-05-31', today)).toBe('expired');
    expect(computeMedicalBookStatus('2020-01-01', today)).toBe('expired');
  });

  it('returns "expiringSoon" within 30 days', () => {
    expect(computeMedicalBookStatus('2026-06-15', today)).toBe('expiringSoon');
    expect(computeMedicalBookStatus('2026-06-30', today)).toBe('expiringSoon');
  });

  it('returns "valid" for dates more than 30 days out', () => {
    expect(computeMedicalBookStatus('2027-01-01', today)).toBe('valid');
    expect(computeMedicalBookStatus('2026-07-15', today)).toBe('valid');
  });
});
