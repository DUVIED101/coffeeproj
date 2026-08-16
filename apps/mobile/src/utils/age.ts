// Whole-years-since-birth helper. Accepts the loose ISO formats we end up
// with from DateTimePicker / Postgres (`YYYY-MM-DD` or full ISO with a time
// component) and returns null when the input is missing or unparseable so the
// caller can decide whether to render anything.
export const yearsBetween = (
  dobIso: string | null | undefined,
  now: Date = new Date()
): number | null => {
  if (!dobIso) return null;
  const datePart = dobIso.split('T')[0];
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, yStr, mStr, dStr] = match;
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  if (!year || !month || !day) return null;

  let age = now.getFullYear() - year;
  const beforeBirthdayThisYear =
    now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day);
  if (beforeBirthdayThisYear) age -= 1;
  return age >= 0 ? age : null;
};
