import { supabase } from '../config/supabase';
import { withRetry } from '../utils/withRetry';
import type {
  Job,
  CreateJobData,
  JobStatus,
  JobFilters,
  JobType,
  ShiftDetails,
} from '../types/job';
import type { GeoPoint } from '../types/business';

// Explicit column list — `select=*` would also pull the PostGIS `geopoint`
// column (binary, hex-encoded by PostgREST, ~25-150 bytes/row, unused on the
// client). At list endpoints fetching 100 rows that's ~2-15 KB and a parse
// hit per page. Listed columns match what mapJob() reads.
const JOB_COLUMNS =
  'id,business_id,business_owner_id,branch_id,job_type,title,description,' +
  'requirements,required_equipment_experience,location,shift_details,' +
  'compensation,payment,payment_status,status,tags,application_count,views,' +
  'posted_at,expires_at,created_at,updated_at';

const JOB_COLUMNS_WITH_JOINS = `${JOB_COLUMNS},businesses(name,logo_url),branches(name,metro_station,photos)`;

// shift_details is JSONB without a runtime schema. Legacy rows pre-date `kind`,
// so we fall back to job_type and field shape. Permanent rows that still hold
// date-based shift_details (no hoursPerWeek) keep working by rendering as
// temporary until the owner edits and saves them under the new form.
function normalizeShiftDetails(raw: any, jobType: JobType): ShiftDetails {
  const r = (raw ?? {}) as Record<string, any>;
  const isPermanent =
    r.kind === 'permanent' || (jobType === 'permanent' && typeof r.hoursPerWeek === 'number');
  if (isPermanent) {
    return {
      kind: 'permanent',
      startDate: r.startDate,
      hoursPerWeek: Number(r.hoursPerWeek),
      preferredDays: r.preferredDays,
    };
  }
  return {
    kind: 'temporary',
    startDate: r.startDate,
    endDate: r.endDate,
    startTime: r.startTime,
    endTime: r.endTime,
    isRecurring: r.isRecurring ?? false,
    recurringDays: r.recurringDays,
  };
}

export class JobService {
  /**
   * Map database job object to Job type (without JOINs)
   */
  private static mapJob(db: any): Job {
    return {
      id: db.id,
      businessId: db.business_id,
      businessOwnerId: db.business_owner_id,
      branchId: db.branch_id,
      jobType: db.job_type,
      title: db.title,
      description: db.description,
      requirements: db.requirements || [],
      requiredEquipmentExperience: db.required_equipment_experience || [],
      location: db.location,
      shiftDetails: normalizeShiftDetails(db.shift_details, db.job_type),
      compensation: db.compensation,
      payment: db.payment,
      paymentStatus: db.payment_status,
      status: db.status,
      tags: db.tags || [],
      applicationCount: db.application_count ?? 0,
      views: db.views,
      postedAt: db.posted_at,
      expiresAt: db.expires_at,
      createdAt: db.created_at,
      updatedAt: db.updated_at,
    };
  }

  /**
   * Map database job object with JOINed business/branch data to Job type
   */
  private static mapJobWithJoins(db: any): Job {
    return {
      id: db.id,
      businessId: db.business_id,
      businessOwnerId: db.business_owner_id,
      branchId: db.branch_id,
      jobType: db.job_type,
      title: db.title,
      description: db.description,
      requirements: db.requirements || [],
      requiredEquipmentExperience: db.required_equipment_experience || [],
      location: db.location,
      shiftDetails: normalizeShiftDetails(db.shift_details, db.job_type),
      compensation: db.compensation,
      payment: db.payment,
      paymentStatus: db.payment_status,
      status: db.status,
      tags: db.tags || [],
      applicationCount: db.application_count ?? 0,
      views: db.views,
      postedAt: db.posted_at,
      expiresAt: db.expires_at,
      createdAt: db.created_at,
      updatedAt: db.updated_at,
      businessName: db.businesses?.name,
      businessLogoUrl: db.businesses?.logo_url ?? undefined,
      branchName: db.branches?.name,
      branchPhotos: db.branches?.photos ?? [],
      metroStation: db.branches?.metro_station,
    };
  }

  /**
   * Create a new job
   */
  static async createJob(jobData: Partial<Job>): Promise<Job> {
    try {
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .select('coordinates')
        .eq('id', jobData.branchId)
        .single();

      if (branchError) throw branchError;
      if (!branch) throw new Error('Branch not found');

      const coords = branch.coordinates as { latitude: number; longitude: number };
      const platformFee = (jobData.payment?.totalAmount || 0) * 0.15;
      const totalWithFee = (jobData.payment?.totalAmount || 0) + platformFee;

      const { data: job, error } = await supabase
        .from('jobs')
        .insert({
          business_id: jobData.businessId,
          business_owner_id: jobData.businessOwnerId,
          branch_id: jobData.branchId,
          job_type: jobData.jobType,
          title: jobData.title,
          description: jobData.description,
          requirements: jobData.requirements,
          required_equipment_experience: jobData.requiredEquipmentExperience,
          location: jobData.location,
          geopoint: `POINT(${coords.longitude} ${coords.latitude})`,
          shift_details: jobData.shiftDetails,
          compensation: jobData.compensation,
          payment: {
            ...jobData.payment,
            platformFee,
            totalWithFee,
          },
          tags: jobData.tags,
          expires_at: jobData.expiresAt,
        })
        .select()
        .single();

      if (error) throw error;
      if (!job) throw new Error('Failed to create job');

      return this.mapJob(job);
    } catch (error) {
      console.error('Error in createJob:', error);
      throw error;
    }
  }

  /**
   * Get job by ID with joined business and branch data
   */
  static async getJobById(jobId: string): Promise<Job> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(JOB_COLUMNS_WITH_JOINS)
        .eq('id', jobId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Job not found');

      return this.mapJobWithJoins(data);
    } catch (error) {
      console.error('Error in getJobById:', error);
      throw error;
    }
  }

  /**
   * Get all jobs for a business
   */
  static async getJobsByBusinessId(businessId: string): Promise<Job[]> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(JOB_COLUMNS_WITH_JOINS)
        .eq('business_id', businessId)
        .order('posted_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return (data || []).map(job => this.mapJobWithJoins(job));
    } catch (error) {
      console.error('Error in getJobsByBusinessId:', error);
      throw error;
    }
  }

  /**
   * Get jobs for a business by the owner's user id.
   * Defaults to open jobs only (activeOnly=true) for discovery use cases.
   */
  static async getJobsByOwnerId(ownerUserId: string, activeOnly = true): Promise<Job[]> {
    try {
      let query = supabase
        .from('jobs')
        .select(JOB_COLUMNS_WITH_JOINS)
        .eq('business_owner_id', ownerUserId)
        .order('posted_at', { ascending: false })
        .limit(200);

      if (activeOnly) {
        query = query.eq('status', 'open');
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(job => this.mapJobWithJoins(job));
    } catch (error) {
      console.error('Error in getJobsByOwnerId:', error);
      throw error;
    }
  }

  /**
   * Search jobs with filters and geolocation
   */
  static async searchJobs(
    filters: JobFilters,
    userLocation?: GeoPoint,
    limit = 20,
    offset = 0
  ): Promise<Job[]> {
    try {
      const params = {
        user_lat: userLocation?.latitude ?? null,
        user_lon: userLocation?.longitude ?? null,
        max_distance_meters: filters.maxDistance ?? null,
        metro_stations_filter: filters.metroStations ?? null,
        job_type_filter: filters.jobType ?? null,
        equipment_filter: filters.equipment ?? null,
        city_filter: filters.city ?? null,
        limit_count: limit,
        offset_count: offset,
      };

      const { data, error } = await withRetry(async () => {
        const res = await supabase.rpc('search_jobs', params);
        if (res.error) throw res.error;
        return res;
      });

      if (error) throw error;

      return (data || []).map((job: any) => ({
        id: job.id,
        businessId: job.business_id,
        businessOwnerId: job.business_owner_id,
        branchId: job.branch_id,
        jobType: job.job_type,
        title: job.title,
        description: job.description,
        requirements: job.requirements || [],
        requiredEquipmentExperience: job.required_equipment_experience || [],
        location: job.location,
        shiftDetails: normalizeShiftDetails(job.shift_details, job.job_type),
        compensation: job.compensation,
        payment: job.payment,
        paymentStatus: job.payment_status,
        status: job.status,
        tags: job.tags || [],
        applicationCount: job.application_count ?? 0,
        views: job.views,
        postedAt: job.posted_at,
        expiresAt: job.expires_at,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        businessName: job.business_name,
        businessLogoUrl: job.business_logo_url ?? undefined,
        branchName: job.branch_name,
        branchPhotos: job.branch_photos ?? [],
        metroStation: job.metro_station,
        distance: job.distance_meters ?? undefined,
      }));
    } catch (error) {
      console.error('Error in searchJobs:', error);
      throw error;
    }
  }

  /**
   * Update an open job. Refuses to update jobs that have moved past 'open'
   * (filled/cancelled/expired) so already-promised shifts stay frozen.
   * Ownership is enforced by matching business_owner_id alongside the jobId.
   */
  static async updateJob(
    jobId: string,
    data: Omit<CreateJobData, 'businessId' | 'businessOwnerId'>,
    ownerUserId: string
  ): Promise<void> {
    try {
      const { data: updated, error } = await supabase
        .from('jobs')
        .update({
          branch_id: data.branchId,
          job_type: data.jobType,
          title: data.title,
          description: data.description,
          requirements: data.requirements,
          required_equipment_experience: data.requiredEquipmentExperience,
          location: data.location,
          shift_details: data.shiftDetails,
          compensation: data.compensation,
          payment: {
            ...data.payment,
            platformFee: data.payment.totalAmount * 0.15,
            totalWithFee: data.payment.totalAmount * 1.15,
          },
          tags: data.tags ?? [],
          expires_at: data.expiresAt ?? null,
        })
        .eq('id', jobId)
        .eq('business_owner_id', ownerUserId)
        .eq('status', 'open')
        .select('id');

      if (error) throw error;
      if (!updated || updated.length === 0) {
        throw new Error('Not authorized or job is no longer open');
      }
    } catch (error) {
      console.error('Error in updateJob:', error);
      throw error;
    }
  }

  /**
   * Update job status. Requires ownerUserId as defence-in-depth:
   * the update only matches rows owned by the caller.
   */
  static async updateJobStatus(
    jobId: string,
    status: JobStatus,
    ownerUserId: string
  ): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .update({ status })
        .eq('id', jobId)
        .eq('business_owner_id', ownerUserId)
        .select('id');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Not authorized to update this job');
      }
    } catch (error) {
      console.error('Error in updateJobStatus:', error);
      throw error;
    }
  }
}
