/**
 * Centralized year/date caps for every picker in the app.
 *
 * The job-shift picker caused crashes when a user picked Jan 1 4001 (the
 * native date wheel went into a broken state and stopped responding to taps).
 * Capping max year at 2050 keeps the picker within values the OS renders sanely,
 * while floor-at-today blocks scheduling shifts in the past.
 *
 * All helpers return fresh Date objects so callers can safely keep them in
 * state without aliasing.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const JOB_DATE_MAX_YEAR = 2050;

const todayAtMidnight = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfYear = (year: number): Date => {
  const d = new Date(year, 11, 31);
  d.setHours(23, 59, 59, 999);
  return d;
};

/** Earliest date a business can schedule a shift for. */
export const jobMinDate = (): Date => todayAtMidnight();

/** Latest date a business can schedule a shift for. */
export const jobMaxDate = (): Date => endOfYear(JOB_DATE_MAX_YEAR);

/** Earliest valid birthday (≈ 100 years ago). */
export const dobMinDate = (): Date => {
  const d = todayAtMidnight();
  d.setFullYear(d.getFullYear() - 100);
  return d;
};

/** Latest valid birthday — enforces the 16+ minimum hiring age. */
export const dobMaxDate = (): Date => {
  const d = todayAtMidnight();
  d.setFullYear(d.getFullYear() - 16);
  return d;
};

/**
 * Clamp a Date into [min, max]. Used to defensively repair state loaded from
 * the DB or from an unconstrained picker so downstream logic never sees a date
 * outside the allowed window.
 */
export const clampDate = (date: Date, min: Date, max: Date): Date => {
  const t = date.getTime();
  if (t < min.getTime()) return new Date(min);
  if (t > max.getTime()) return new Date(max);
  return date;
};

/** Days between two dates ignoring time-of-day. Positive when `b` is after `a`. */
export const daysBetween = (a: Date, b: Date): number => {
  const aMid = new Date(a);
  aMid.setHours(0, 0, 0, 0);
  const bMid = new Date(b);
  bMid.setHours(0, 0, 0, 0);
  return Math.round((bMid.getTime() - aMid.getTime()) / MS_PER_DAY);
};
