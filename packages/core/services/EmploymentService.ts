import { supabase } from '../config/supabase';
import type {
  Employment,
  EmploymentBaristaSummary,
  EmploymentJobSummary,
  RequestEmploymentEndData,
} from '@bystrobarista/core/types/employment';
import type { ApplicationId, JobId, UserId } from '@bystrobarista/core/types/ids';
import { mapEmploymentRow, type EmploymentRow } from '@bystrobarista/core/utils/employment';

const OPEN_STATUSES = ['pending_start', 'active', 'ending'] as const;

const JOB_EMBED = `
  jobs (
    id, title, job_type, status, shift_details, compensation,
    businesses (name, logo_url),
    branches (name, metro_station)
  )
`;

const BARISTA_EMBED = `
  users!employments_barista_id_fkey (
    barista_profiles (first_name, last_name, avatar_url, years_of_experience)
  )
`;

const one = <T>(value: T | T[] | null | undefined): T | undefined =>
  Array.isArray(value) ? value[0] : (value ?? undefined);

const mapJob = (raw: any): EmploymentJobSummary | undefined => {
  const job = one(raw);
  if (!job) return undefined;
  return {
    id: job.id as JobId,
    title: job.title,
    jobType: job.job_type,
    status: job.status,
    shiftDetails: job.shift_details ?? undefined,
    compensation: job.compensation ?? undefined,
    businessName: one(job.businesses)?.name ?? undefined,
    businessLogoUrl: one(job.businesses)?.logo_url ?? undefined,
    branchName: one(job.branches)?.name ?? undefined,
    metroStation: one(job.branches)?.metro_station ?? undefined,
  };
};

const mapBarista = (raw: any): EmploymentBaristaSummary | undefined => {
  const profile = one(one(raw)?.barista_profiles);
  if (!profile) return undefined;
  return {
    firstName: profile.first_name,
    lastName: profile.last_name,
    avatarUrl: profile.avatar_url ?? undefined,
    yearsOfExperience: profile.years_of_experience ?? undefined,
  };
};

const mapWithJoins = (row: any): Employment => ({
  ...mapEmploymentRow(row as EmploymentRow),
  job: mapJob(row.jobs),
  baristaProfile: mapBarista(row.users),
});

export class EmploymentService {
  static async getByApplicationId(applicationId: ApplicationId): Promise<Employment | null> {
    const { data, error } = await supabase
      .from('employments')
      .select('*')
      .eq('application_id', applicationId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapEmploymentRow(data as EmploymentRow) : null;
  }

  /** The barista's current (not yet ended) permanent employment, newest first. */
  static async getActiveForBarista(baristaId: UserId): Promise<Employment | null> {
    const { data, error } = await supabase
      .from('employments')
      .select(`*, ${JOB_EMBED}`)
      .eq('barista_id', baristaId)
      .in('status', [...OPEN_STATUSES])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? mapWithJoins(data) : null;
  }

  /** Every hire of a business owner (active and ended), newest first. */
  static async getForBusinessOwner(ownerId: UserId): Promise<Employment[]> {
    const { data, error } = await supabase
      .from('employments')
      .select(`*, ${JOB_EMBED}, ${BARISTA_EMBED}`)
      .eq('business_owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []).map(mapWithJoins);
  }

  static async getEmploymentMap(
    applicationIds: ApplicationId[]
  ): Promise<Record<string, Employment>> {
    if (applicationIds.length === 0) return {};
    const { data, error } = await supabase
      .from('employments')
      .select('*')
      .in('application_id', applicationIds);
    if (error) throw error;
    const map: Record<string, Employment> = {};
    for (const row of data ?? []) {
      const mapped = mapEmploymentRow(row as EmploymentRow);
      map[mapped.applicationId] = mapped;
    }
    return map;
  }

  static async confirmStart(applicationId: ApplicationId): Promise<Employment> {
    return this.callLifecycleRpc('confirm_employment_start', {
      p_application_id: applicationId,
    });
  }

  static async requestEnd(data: RequestEmploymentEndData): Promise<Employment> {
    return this.callLifecycleRpc('request_employment_end', {
      p_application_id: data.applicationId,
      p_reason: data.reason,
      p_comment: data.comment?.trim() ? data.comment.trim() : null,
    });
  }

  static async confirmEnd(applicationId: ApplicationId): Promise<Employment> {
    return this.callLifecycleRpc('confirm_employment_end', {
      p_application_id: applicationId,
    });
  }

  static async cancelEndRequest(applicationId: ApplicationId): Promise<Employment> {
    return this.callLifecycleRpc('cancel_employment_end_request', {
      p_application_id: applicationId,
    });
  }

  private static async callLifecycleRpc(
    fn:
      | 'confirm_employment_start'
      | 'request_employment_end'
      | 'confirm_employment_end'
      | 'cancel_employment_end_request',
    params: Record<string, unknown>
  ): Promise<Employment> {
    const { data, error } = await supabase.rpc(fn, params);
    if (error) throw error;
    const row = one(data as EmploymentRow | EmploymentRow[] | null);
    if (!row) throw new Error('EMPLOYMENT_NOT_FOUND');
    return mapEmploymentRow(row);
  }
}
