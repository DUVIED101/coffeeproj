export type MedicalBookStatus = 'none' | 'valid' | 'expiringSoon' | 'expired';

const EXPIRING_SOON_DAYS = 30;

const parseDateISO = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  // Parse as local date (YYYY-MM-DD) — toISOString round-trips ok for date-only.
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

export const computeMedicalBookStatus = (
  expiresOn: string | null | undefined,
  now: Date = new Date()
): MedicalBookStatus => {
  const expiry = parseDateISO(expiresOn);
  if (!expiry) return 'none';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (expiry.getTime() < today.getTime()) return 'expired';
  const soon = new Date(today);
  soon.setDate(soon.getDate() + EXPIRING_SOON_DAYS);
  if (expiry.getTime() < soon.getTime()) return 'expiringSoon';
  return 'valid';
};
