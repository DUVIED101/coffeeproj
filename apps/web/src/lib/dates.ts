// Date-only strings ("2000-01-15") parsed via `new Date(iso)` land on UTC
// midnight, which renders as the PREVIOUS day in negative-offset timezones.
// Parse them as local calendar dates instead; full ISO timestamps pass
// through unchanged.
export const formatDateOnly = (
  iso: string,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? new Date(`${iso}T00:00:00`)
    : new Date(iso);
  return date.toLocaleDateString(locale, options);
};
