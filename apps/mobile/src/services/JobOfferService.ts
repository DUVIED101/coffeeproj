import { supabase } from '../config/supabase';
import { ApplicationService } from './ApplicationService';
import type {
  CreateJobOfferData,
  JobOffer,
  JobOfferStatus,
  RespondToJobOfferResult,
} from '../types/jobOffer';
import type { Job } from '../types/job';
import type { ApplicationId, JobId, JobOfferId, UserId } from '../types/ids';

export class JobOfferAlreadyAppliedError extends Error {
  constructor() {
    super('baristaAlreadyApplied');
    this.name = 'JobOfferAlreadyAppliedError';
  }
}

export class JobOfferDuplicatePendingError extends Error {
  constructor() {
    super('offerAlreadyPending');
    this.name = 'JobOfferDuplicatePendingError';
  }
}

export class JobOfferJobUnavailableError extends Error {
  constructor() {
    super('jobUnavailable');
    this.name = 'JobOfferJobUnavailableError';
  }
}

export class JobOfferTerminalError extends Error {
  constructor() {
    super('offerTerminal');
    this.name = 'JobOfferTerminalError';
  }
}

type JobOfferRow = {
  id: string;
  business_owner_id: string;
  barista_id: string;
  job_id: string;
  message: string | null;
  status: JobOfferStatus;
  application_id: string | null;
  created_at: string;
  responded_at: string | null;
};

type JobOfferRowWithJoins = JobOfferRow & {
  jobs?: Record<string, unknown> & {
    businesses?: { name?: string; logo_url?: string | null };
    branches?: { name?: string; metro_station?: string; photos?: string[] | null };
  };
  barista_profiles?: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string | null;
  };
};

const SELECT_WITH_JOB = `
  *,
  jobs (
    *,
    businesses (name, logo_url),
    branches (name, metro_station, photos)
  )
` as const;

function mapJoinedJob(raw: NonNullable<JobOfferRowWithJoins['jobs']>): Job {
  return {
    id: raw.id as string,
    businessId: raw.business_id as string,
    businessOwnerId: raw.business_owner_id as string,
    branchId: raw.branch_id as string,
    jobType: raw.job_type as Job['jobType'],
    title: raw.title as string,
    description: (raw.description as string | undefined) ?? undefined,
    requirements: (raw.requirements as string[] | null) ?? [],
    requiredEquipmentExperience:
      (raw.required_equipment_experience as Job['requiredEquipmentExperience']) ?? [],
    location: raw.location as Job['location'],
    shiftDetails: raw.shift_details as Job['shiftDetails'],
    compensation: raw.compensation as Job['compensation'],
    payment: raw.payment as Job['payment'],
    paymentStatus: (raw.payment_status as Job['paymentStatus']) ?? 'not_required',
    status: raw.status as Job['status'],
    tags: (raw.tags as string[] | null) ?? [],
    applicationCount: (raw.application_count as number | null) ?? 0,
    views: (raw.views as number | null) ?? 0,
    postedAt: raw.posted_at as string,
    expiresAt: raw.expires_at as string | undefined,
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string,
    businessName: raw.businesses?.name,
    businessLogoUrl: raw.businesses?.logo_url ?? undefined,
    branchName: raw.branches?.name,
    branchPhotos: raw.branches?.photos ?? [],
    metroStation: raw.branches?.metro_station,
  };
}

function mapOffer(row: JobOfferRowWithJoins): JobOffer {
  const job = row.jobs ? mapJoinedJob(row.jobs) : undefined;

  return {
    id: row.id as JobOfferId,
    businessOwnerId: row.business_owner_id as UserId,
    baristaId: row.barista_id as UserId,
    jobId: row.job_id as JobId,
    message: row.message,
    status: row.status,
    applicationId: (row.application_id as ApplicationId | null) ?? null,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
    job,
    businessName: row.jobs?.businesses?.name,
    businessLogoUrl: row.jobs?.businesses?.logo_url ?? undefined,
  };
}

function mapPgErrorToOfferError(message: string): Error {
  if (message.includes('OFFER_NOT_FOUND')) return new Error('offerNotFound');
  if (message.includes('FORBIDDEN')) return new Error('forbidden');
  if (message.includes('JOB_UNAVAILABLE')) return new JobOfferJobUnavailableError();
  if (message.includes('OFFER_TERMINAL')) return new JobOfferTerminalError();
  return new Error(message);
}

export class JobOfferService {
  /**
   * Business owner sends a vacancy offer to a barista. Preflights the
   * applications table so the UI can show a friendly "already applied" error
   * before hitting the RLS check.
   */
  static async createOffer(data: CreateJobOfferData): Promise<JobOffer> {
    const existingApplication = await ApplicationService.checkApplicationExists(
      data.jobId,
      data.baristaId
    );
    if (existingApplication) {
      throw new JobOfferAlreadyAppliedError();
    }

    const trimmedMessage = data.message?.trim();
    const messageValue =
      typeof trimmedMessage === 'string' && trimmedMessage.length > 0 ? trimmedMessage : null;

    const { data: row, error } = await supabase
      .from('job_offers')
      .insert({
        business_owner_id: data.businessOwnerId,
        barista_id: data.baristaId,
        job_id: data.jobId,
        message: messageValue,
      })
      .select(SELECT_WITH_JOB)
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new JobOfferDuplicatePendingError();
      }
      throw error;
    }
    if (!row) throw new Error('Failed to create job offer');
    return mapOffer(row as JobOfferRowWithJoins);
  }

  /**
   * Barista accepts or declines an offer. RPC is idempotent and atomic; for
   * 'accepted' returns the new application id.
   */
  static async respondToOffer(
    offerId: JobOfferId,
    response: 'accepted' | 'declined'
  ): Promise<RespondToJobOfferResult> {
    const { data, error } = await supabase.rpc('respond_to_job_offer', {
      p_offer_id: offerId,
      p_response: response,
    });

    if (error) {
      throw mapPgErrorToOfferError(error.message);
    }

    if (response === 'declined') {
      return { status: 'declined' };
    }

    if (typeof data !== 'string' || data.length === 0) {
      throw new Error('Accept RPC returned no applicationId');
    }
    return { status: 'accepted', applicationId: data as ApplicationId };
  }

  /**
   * Business owner cancels a still-pending offer.
   */
  static async cancelOffer(offerId: JobOfferId): Promise<void> {
    const { error } = await supabase.rpc('cancel_job_offer', {
      p_offer_id: offerId,
    });
    if (error) {
      throw mapPgErrorToOfferError(error.message);
    }
  }

  /**
   * Fetch a single offer by id, including job + business join. Returns null
   * when the row is not visible to the caller (PGRST116) — matches the
   * convention used in ApplicationService.checkApplicationExists.
   */
  static async getOfferById(offerId: JobOfferId): Promise<JobOffer | null> {
    const { data, error } = await supabase
      .from('job_offers')
      .select(SELECT_WITH_JOB)
      .eq('id', offerId)
      .maybeSingle();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    if (!data) return null;
    return mapOffer(data as JobOfferRowWithJoins);
  }

  /**
   * Pending offers for a single job — drives the "Pending offers" section
   * on the business Applicants screen. Barista profiles are fetched separately
   * because PostgREST cannot infer a direct FK between `job_offers` and
   * `barista_profiles` (the FK on job_offers.barista_id points at users.id).
   */
  static async getPendingOffersForJob(jobId: JobId): Promise<JobOffer[]> {
    const { data, error } = await supabase
      .from('job_offers')
      .select('*')
      .eq('job_id', jobId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const baristaIds = Array.from(new Set(data.map(row => row.barista_id)));
    const { data: profiles, error: profilesError } = await supabase
      .from('barista_profiles')
      .select('user_id, first_name, last_name, avatar_url')
      .in('user_id', baristaIds);

    if (profilesError) throw profilesError;

    const profileByUserId = new Map<
      string,
      { first_name?: string; last_name?: string; avatar_url?: string | null }
    >();
    for (const profile of profiles ?? []) {
      profileByUserId.set(profile.user_id, profile);
    }

    return data.map(row => {
      const offer = mapOffer(row as JobOfferRowWithJoins);
      const profile = profileByUserId.get(row.barista_id);
      return {
        ...offer,
        baristaFirstName: profile?.first_name ?? undefined,
        baristaLastName: profile?.last_name ?? undefined,
        baristaAvatarUrl: profile?.avatar_url ?? undefined,
      };
    });
  }

  /**
   * Pending offers from a specific business owner to a specific barista — drives
   * the "already offered" greying on OfferJobScreen and the disabled-button
   * gating on ViewBaristaProfileScreen. Returns only minimal fields (no joins)
   * since the caller only needs the job id set.
   */
  static async getPendingOffersFromOwnerToBarista(
    businessOwnerId: UserId,
    baristaId: UserId
  ): Promise<JobOffer[]> {
    const { data, error } = await supabase
      .from('job_offers')
      .select('*')
      .eq('business_owner_id', businessOwnerId)
      .eq('barista_id', baristaId)
      .eq('status', 'pending');

    if (error) throw error;

    return (data ?? []).map(row => mapOffer(row as JobOfferRowWithJoins));
  }
}
