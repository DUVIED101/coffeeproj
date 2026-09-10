import { describe, it, expect } from '@jest/globals';
import {
  SCHEDULE_PATTERN_DRAFT,
  isSchedulePattern,
  parseSchedulePattern,
  withSchedulePart,
} from './schedulePatterns';

describe(isSchedulePattern, () => {
  it.each(['5/2', '2/2', '3/3', '6/1'])('accepts %s', pattern => {
    expect(isSchedulePattern(pattern)).toBe(true);
  });

  it.each([
    ['letters', 'a/b'],
    ['missing off days', '5/'],
    ['the empty draft', SCHEDULE_PATTERN_DRAFT],
    ['zero on days', '0/2'],
    ['two-digit part', '10/2'],
    ['spaces', '5 / 2'],
    ['empty', ''],
  ])('rejects %s', (_label, value) => {
    expect(isSchedulePattern(value)).toBe(false);
  });
});

describe(parseSchedulePattern, () => {
  it.each([
    ['a complete pattern', '5/2', { on: '5', off: '2' }],
    ['a half-typed draft', '5/', { on: '5', off: '' }],
    ['the empty draft', SCHEDULE_PATTERN_DRAFT, { on: '', off: '' }],
    ['stray characters', '5a/2b', { on: '5', off: '2' }],
    ['extra digits', '55/22', { on: '5', off: '2' }],
  ])('splits %s', (_label, raw, expected) => {
    expect(parseSchedulePattern(raw)).toEqual(expected);
  });
});

describe(withSchedulePart, () => {
  it('replaces the on-days half and keeps the other', () => {
    expect(withSchedulePart('5/2', 'on', '3')).toBe('3/2');
  });

  it('replaces the off-days half and keeps the other', () => {
    expect(withSchedulePart('5/2', 'off', '4')).toBe('5/4');
  });

  it('clears a half when the input is emptied', () => {
    expect(withSchedulePart('5/2', 'off', '')).toBe('5/');
  });

  it('keeps only the first digit of a pasted value', () => {
    expect(withSchedulePart(SCHEDULE_PATTERN_DRAFT, 'on', '52')).toBe('5/');
  });
});
