import { supabase } from '../config/supabase';
import type { BaristaProfileId, WorkExperienceId } from '../types/ids';
import type {
  CreateWorkExperienceData,
  UpdateWorkExperienceData,
  WorkExperience,
  WorkExperienceDraft,
} from '../types/workExperience';
import { isDraftValid } from '../types/workExperience';

type DbWorkExperience = {
  id: string;
  barista_profile_id: string;
  employer: string;
  position: string;
  start_year: number;
  start_month: number;
  end_year: number | null;
  end_month: number | null;
  is_current: boolean;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const mapRow = (row: DbWorkExperience): WorkExperience => ({
  id: row.id as WorkExperienceId,
  baristaProfileId: row.barista_profile_id as BaristaProfileId,
  employer: row.employer,
  position: row.position,
  startYear: row.start_year,
  startMonth: row.start_month,
  endYear: row.end_year,
  endMonth: row.end_month,
  isCurrent: row.is_current,
  description: row.description,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toInsertRow = (data: CreateWorkExperienceData) => ({
  barista_profile_id: data.baristaProfileId,
  employer: data.employer.trim(),
  position: data.position.trim(),
  start_year: data.startYear,
  start_month: data.startMonth,
  end_year: data.isCurrent ? null : data.endYear,
  end_month: data.isCurrent ? null : data.endMonth,
  is_current: data.isCurrent,
  description: data.description?.trim() ? data.description.trim() : null,
  sort_order: data.sortOrder,
});

const toUpdateRow = (patch: UpdateWorkExperienceData): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (patch.employer !== undefined) row.employer = patch.employer.trim();
  if (patch.position !== undefined) row.position = patch.position.trim();
  if (patch.startYear !== undefined) row.start_year = patch.startYear;
  if (patch.startMonth !== undefined) row.start_month = patch.startMonth;
  if (patch.endYear !== undefined) row.end_year = patch.endYear;
  if (patch.endMonth !== undefined) row.end_month = patch.endMonth;
  if (patch.isCurrent !== undefined) {
    row.is_current = patch.isCurrent;
    if (patch.isCurrent) {
      row.end_year = null;
      row.end_month = null;
    }
  }
  if (patch.description !== undefined) {
    row.description = patch.description?.trim() ? patch.description.trim() : null;
  }
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  return row;
};

export class WorkExperienceService {
  static async listForProfile(profileId: BaristaProfileId): Promise<WorkExperience[]> {
    const { data, error } = await supabase
      .from('work_experiences')
      .select('*')
      .eq('barista_profile_id', profileId)
      .order('is_current', { ascending: false })
      .order('start_year', { ascending: false })
      .order('start_month', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapRow);
  }

  static async create(data: CreateWorkExperienceData): Promise<WorkExperience> {
    const { data: row, error } = await supabase
      .from('work_experiences')
      .insert(toInsertRow(data))
      .select()
      .single();

    if (error) throw error;
    if (!row) throw new Error('Failed to create work experience');
    return mapRow(row);
  }

  static async update(
    id: WorkExperienceId,
    patch: UpdateWorkExperienceData
  ): Promise<WorkExperience> {
    const { data: row, error } = await supabase
      .from('work_experiences')
      .update(toUpdateRow(patch))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!row) throw new Error('Failed to update work experience');
    return mapRow(row);
  }

  static async remove(id: WorkExperienceId): Promise<void> {
    const { error } = await supabase.from('work_experiences').delete().eq('id', id);
    if (error) throw error;
  }

  /**
   * Reconcile a profile's work-experience list against an array of drafts.
   * Drafts with `id` are updated, drafts without `id` are inserted, and
   * existing rows whose id is no longer in the draft list are deleted.
   * Invalid drafts (per isDraftValid) are skipped silently.
   */
  static async replaceAll(
    profileId: BaristaProfileId,
    drafts: WorkExperienceDraft[]
  ): Promise<WorkExperience[]> {
    const existing = await this.listForProfile(profileId);
    const keptIds = new Set<string>();

    const validDrafts = drafts.filter(isDraftValid);

    for (let i = 0; i < validDrafts.length; i++) {
      const d = validDrafts[i];
      const sortOrder = validDrafts.length - i;
      if (d.id) {
        keptIds.add(d.id);
        await this.update(d.id, {
          employer: d.employer,
          position: d.position,
          startYear: d.startYear ?? undefined,
          startMonth: d.startMonth ?? undefined,
          endYear: d.endYear,
          endMonth: d.endMonth,
          isCurrent: d.isCurrent,
          description: d.description,
          sortOrder,
        });
      } else {
        await this.create({
          baristaProfileId: profileId,
          employer: d.employer,
          position: d.position,
          startYear: d.startYear as number,
          startMonth: d.startMonth as number,
          endYear: d.isCurrent ? null : (d.endYear as number),
          endMonth: d.isCurrent ? null : (d.endMonth as number),
          isCurrent: d.isCurrent,
          description: d.description,
          sortOrder,
        });
      }
    }

    const toDelete = existing.filter(e => !keptIds.has(e.id));
    for (const row of toDelete) {
      await this.remove(row.id);
    }

    return this.listForProfile(profileId);
  }
}
