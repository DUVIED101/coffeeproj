import type { TFunction } from 'i18next';
import type { Employment } from '@bystrobarista/core/types/employment';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// `start_date` is a calendar date (YYYY-MM-DD); parsing it with `new Date`
// would treat it as UTC midnight and roll it back a day west of Greenwich.
const parseEmploymentDate = (value: string): Date =>
  DATE_ONLY.test(value)
    ? new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)))
    : new Date(value);

export const formatEmploymentDate = (value: string | undefined, locale: string): string =>
  value ? parseEmploymentDate(value).toLocaleDateString(locale) : '';

export const employmentStageLine = (
  employment: Pick<Employment, 'status' | 'startDate' | 'startedAt' | 'endedAt'>,
  t: TFunction,
  locale: string
): string => {
  switch (employment.status) {
    case 'pending_start':
      return t('employment.stage.pending_start', {
        date: formatEmploymentDate(employment.startDate, locale),
      });
    case 'active':
      return t('employment.stage.active', {
        date: formatEmploymentDate(employment.startedAt ?? employment.startDate, locale),
      });
    case 'ending':
      return t('employment.stage.ending');
    case 'ended':
      return t('employment.stage.ended', {
        date: formatEmploymentDate(employment.endedAt, locale),
      });
  }
};

export const employmentEndedByKeys = (
  employment: Pick<Employment, 'endRequestedBy' | 'endConfirmedBy'>
): string[] => {
  const keys: string[] = [];
  if (employment.endRequestedBy === 'barista') keys.push('employment.end.endedByBarista');
  if (employment.endRequestedBy === 'business') keys.push('employment.end.endedByBusiness');
  if (employment.endConfirmedBy === 'auto') keys.push('employment.end.endedAuto');
  return keys;
};
