// Work rotations a barista prefers, stored as "on/off" day counts — the
// same shape businesses enter as customSchedulePatterns on a job.
export const SCHEDULE_PATTERN_PRESETS: readonly string[] = ['5/2', '2/2', '3/3', '6/1', '4/2'];

export const isSchedulePattern = (value: string): boolean => /^[1-9]\/[1-9]$/.test(value);
