import type { ShiftDetails } from '../types/job';

const HOURS_PER_DAY = 24;
const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY = MS_PER_HOUR * HOURS_PER_DAY;

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const parseTimeToHours = (time: string): number => {
  const [h, m] = time.split(':').map(part => parseInt(part, 10));
  return h + (m || 0) / 60;
};

const dailyHours = (startTime: string, endTime: string): number => {
  const start = parseTimeToHours(startTime);
  const endRaw = parseTimeToHours(endTime);
  const end = endRaw <= start ? endRaw + HOURS_PER_DAY : endRaw;
  return end - start;
};

const round1 = (value: number): number => Math.round(value * 10) / 10;

const dateAtUtcMidnight = (isoDate: string): Date => {
  const [y, m, d] = isoDate.split('-').map(part => parseInt(part, 10));
  return new Date(Date.UTC(y, m - 1, d));
};

const countMatchingWeekdays = (
  startIso: string,
  endIso: string,
  recurringDays: string[]
): number => {
  const allowed = new Set(
    recurringDays.map(d => WEEKDAY_INDEX[d.toLowerCase()]).filter(idx => idx !== undefined)
  );
  if (allowed.size === 0) return 0;

  const start = dateAtUtcMidnight(startIso);
  const end = dateAtUtcMidnight(endIso);
  const totalDays = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
  if (totalDays <= 0) return 0;

  let matches = 0;
  for (let i = 0; i < totalDays; i++) {
    const day = new Date(start.getTime() + i * MS_PER_DAY);
    if (allowed.has(day.getUTCDay())) matches += 1;
  }
  return matches;
};

export const computeShiftHours = (shift: ShiftDetails): number => {
  const perDay = dailyHours(shift.startTime, shift.endTime);

  if (shift.isRecurring && shift.recurringDays && shift.endDate) {
    const matchingDays = countMatchingWeekdays(shift.startDate, shift.endDate, shift.recurringDays);
    return round1(matchingDays * perDay);
  }

  if (shift.endDate && shift.endDate !== shift.startDate) {
    const start = dateAtUtcMidnight(shift.startDate);
    const end = dateAtUtcMidnight(shift.endDate);
    const dayDelta = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY);
    const startHours = parseTimeToHours(shift.startTime);
    const endHours = parseTimeToHours(shift.endTime);
    return round1(dayDelta * HOURS_PER_DAY + (endHours - startHours));
  }

  return round1(perDay);
};
