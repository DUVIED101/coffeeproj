import { supabase } from '../config/supabase';
import type { Job, CreateJobData, JobStatus, JobFilters } from '../types/job';
import type { GeoPoint } from '../types/business';

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
      shiftDetails: db.shift_details,
      compensation: db.compensation,
      payment: db.payment,
      paymentStatus: db.payment_status,
      status: db.status,
      tags: db.tags || [],
      applicationCount: db.application_count,
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
      shiftDetails: db.shift_details,
      compensation: db.compensation,
      payment: db.payment,
      paymentStatus: db.payment_status,
      status: db.status,
      tags: db.tags || [],
      applicationCount: db.application_count,
      views: db.views,
      postedAt: db.posted_at,
      expiresAt: db.expires_at,
      createdAt: db.created_at,
      updatedAt: db.updated_at,
      businessName: db.businesses?.name,
      branchName: db.branches?.name,
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
        .select(
          `
          *,
          businesses (name),
          branches (name, metro_station)
        `
        )
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
        .select(
          `
          *,
          businesses (name),
          branches (name, metro_station)
        `
        )
        .eq('business_id', businessId)
        .order('posted_at', { ascending: false });

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
        .select(
          `
          *,
          businesses (name),
          branches (name, metro_station)
        `
        )
        .eq('business_owner_id', ownerUserId)
        .order('posted_at', { ascending: false });

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
        max_distance_meters: filters.maxDistance ?? 100000, // Default 100km radius
        metro_stations_filter: filters.metroStations ?? null, // Changed from metro_station_filter to metro_stations_filter (array)
        job_type_filter: filters.jobType ?? null,
        equipment_filter: filters.equipment ?? null,
        city_filter: filters.city ?? null,
        limit_count: limit,
        offset_count: offset,
      };

      console.log('🔧 JobService.searchJobs params:', JSON.stringify(params, null, 2));

      const { data, error } = await supabase.rpc('search_jobs', params);

      console.log('📡 RPC error:', error);
      console.log('📡 RPC data count:', data?.length);

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
        shiftDetails: job.shift_details,
        compensation: job.compensation,
        payment: job.payment,
        paymentStatus: job.payment_status,
        status: job.status,
        tags: job.tags || [],
        applicationCount: job.application_count,
        views: job.views,
        postedAt: job.posted_at,
        expiresAt: job.expires_at,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        businessName: job.business_name,
        branchName: job.branch_name,
        metroStation: job.metro_station,
        distance: job.distance_meters,
      }));
    } catch (error) {
      console.error('Error in searchJobs:', error);
      throw error;
    }
  }

  /**
   * Update job status
   */
  static async updateJobStatus(jobId: string, status: JobStatus): Promise<void> {
    try {
      const { error } = await supabase.from('jobs').update({ status }).eq('id', jobId);

      if (error) throw error;
    } catch (error) {
      console.error('Error in updateJobStatus:', error);
      throw error;
    }
  }
}
