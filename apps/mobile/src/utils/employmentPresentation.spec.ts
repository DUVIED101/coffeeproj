import type { TFunction } from 'i18next';
import {
  employmentEndedByKeys,
  employmentStageLine,
  formatEmploymentDate,
} from './employmentPresentation';

const fakeT = ((key: string, options?: Record<string, unknown>) =>
  options ? `${key}|${JSON.stringify(options)}` : key) as unknown as TFunction;

const START_DATE = '2026-09-03';
const STARTED_AT = '2026-09-05T12:00:00Z';
const ENDED_AT = '2026-11-20T12:00:00Z';

describe('formatEmploymentDate', () => {
  it.each([
    [START_DATE, 'ru-RU', '03.09.2026'],
    [START_DATE, 'en-US', '9/3/2026'],
    [STARTED_AT, 'ru-RU', '05.09.2026'],
    [undefined, 'ru-RU', ''],
  ])('formats %s in %s as %s', (value, locale, expected) => {
    expect(formatEmploymentDate(value, locale)).toEqual(expected);
  });
});

describe('employmentStageLine', () => {
  it.each([
    [
      { status: 'pending_start', startDate: START_DATE },
      'employment.stage.pending_start|{"date":"03.09.2026"}',
    ],
    [
      { status: 'active', startDate: START_DATE, startedAt: STARTED_AT },
      'employment.stage.active|{"date":"05.09.2026"}',
    ],
    [{ status: 'active', startDate: START_DATE }, 'employment.stage.active|{"date":"03.09.2026"}'],
    [{ status: 'ending', startDate: START_DATE }, 'employment.stage.ending'],
    [
      { status: 'ended', startDate: START_DATE, endedAt: ENDED_AT },
      'employment.stage.ended|{"date":"20.11.2026"}',
    ],
  ] as const)('renders %o as %s', (employment, expected) => {
    expect(employmentStageLine(employment, fakeT, 'ru-RU')).toEqual(expected);
  });
});

describe('employmentEndedByKeys', () => {
  it.each([
    [{ endRequestedBy: 'barista', endConfirmedBy: 'business' }, ['employment.end.endedByBarista']],
    [{ endRequestedBy: 'business', endConfirmedBy: 'barista' }, ['employment.end.endedByBusiness']],
    [
      { endRequestedBy: 'business', endConfirmedBy: 'auto' },
      ['employment.end.endedByBusiness', 'employment.end.endedAuto'],
    ],
    [{ endConfirmedBy: 'auto' }, ['employment.end.endedAuto']],
    [{}, []],
  ] as const)('maps %o to %j', (employment, expected) => {
    expect(employmentEndedByKeys(employment)).toEqual(expected);
  });
});
