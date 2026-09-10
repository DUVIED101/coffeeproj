// Work rotations as "on/off" day counts — what a barista prefers on the
// profile and what a business enters as customSchedulePatterns on a job.
export const SCHEDULE_PATTERN_DRAFT = '/';

export const isSchedulePattern = (value: string): boolean => /^[1-9]\/[1-9]$/.test(value);

// Splits a draft like "5/" into its two single-digit halves for the paired
// numeric inputs; anything that is not a digit is dropped.
export const parseSchedulePattern = (raw: string): { on: string; off: string } => {
  const [rawOn = '', rawOff = ''] = raw.split('/');
  return {
    on: rawOn.replace(/\D/g, '').slice(0, 1),
    off: rawOff.replace(/\D/g, '').slice(0, 1),
  };
};

export const withSchedulePart = (pattern: string, side: 'on' | 'off', raw: string): string => {
  const digit = raw.replace(/\D/g, '').slice(0, 1);
  const current = parseSchedulePattern(pattern);
  return side === 'on' ? `${digit}/${current.off}` : `${current.on}/${digit}`;
};
