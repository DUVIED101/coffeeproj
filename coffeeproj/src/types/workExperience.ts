import type { BaristaProfileId, WorkExperienceId } from './ids';

export type WorkExperience = {
  id: WorkExperienceId;
  baristaProfileId: BaristaProfileId;
  employer: string;
  position: string;
  startYear: number;
  startMonth: number;
  endYear: number | null;
  endMonth: number | null;
  isCurrent: boolean;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateWorkExperienceData = Omit<WorkExperience, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateWorkExperienceData = Partial<
  Omit<WorkExperience, 'id' | 'baristaProfileId' | 'createdAt' | 'updatedAt'>
>;

export type WorkExperienceDraft = {
  id?: WorkExperienceId;
  employer: string;
  position: string;
  startYear: number | null;
  startMonth: number | null;
  endYear: number | null;
  endMonth: number | null;
  isCurrent: boolean;
  description: string | null;
};

export type Duration = { years: number; months: number };

export type DurationInput = {
  startYear: number;
  startMonth: number;
  endYear: number | null;
  endMonth: number | null;
  isCurrent: boolean;
};

export const MAX_WORK_EXPERIENCES = 10;

export function computeDuration(input: DurationInput, now: Date = new Date()): Duration {
  const startTotal = input.startYear * 12 + input.startMonth;

  let endTotal: number;
  if (input.isCurrent) {
    endTotal = now.getFullYear() * 12 + (now.getMonth() + 1);
  } else if (input.endYear !== null && input.endMonth !== null) {
    endTotal = input.endYear * 12 + input.endMonth;
  } else {
    return { years: 0, months: 0 };
  }

  const totalMonths = Math.max(0, endTotal - startTotal + 1);
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
  };
}

export function computeTotalDuration(
  inputs: readonly DurationInput[],
  now: Date = new Date()
): Duration {
  const totalMonths = inputs.reduce((acc, input) => {
    const d = computeDuration(input, now);
    return acc + d.years * 12 + d.months;
  }, 0);
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
  };
}

export function makeEmptyDraft(): WorkExperienceDraft {
  return {
    employer: '',
    position: '',
    startYear: null,
    startMonth: null,
    endYear: null,
    endMonth: null,
    isCurrent: false,
    description: null,
  };
}

export function isDraftValid(d: WorkExperienceDraft): boolean {
  if (d.employer.trim().length === 0) return false;
  if (d.position.trim().length === 0) return false;
  if (d.startYear === null || d.startMonth === null) return false;
  if (d.isCurrent) {
    return d.endYear === null && d.endMonth === null;
  }
  if (d.endYear === null || d.endMonth === null) return false;
  const startTotal = d.startYear * 12 + d.startMonth;
  const endTotal = d.endYear * 12 + d.endMonth;
  return endTotal >= startTotal;
}

export type WorkExperienceFieldError = 'employer' | 'position' | 'startDate' | 'endDate';

/**
 * Returns the set of fields preventing this draft from being saved. Empty
 * when the draft is valid. Callers use this to gate save AND highlight the
 * specific inputs in the editor card.
 */
export function findDraftErrors(d: WorkExperienceDraft): WorkExperienceFieldError[] {
  const errors: WorkExperienceFieldError[] = [];
  if (d.employer.trim().length === 0) errors.push('employer');
  if (d.position.trim().length === 0) errors.push('position');
  if (d.startYear === null || d.startMonth === null) errors.push('startDate');
  if (!d.isCurrent) {
    if (d.endYear === null || d.endMonth === null) {
      errors.push('endDate');
    } else if (
      d.startYear !== null &&
      d.startMonth !== null &&
      d.endYear * 12 + d.endMonth < d.startYear * 12 + d.startMonth
    ) {
      errors.push('endDate');
    }
  }
  return errors;
}
