import { supabase } from '../config/supabase';
import type { Application, ApplicationStatus, CreateApplicationData } from '../types/application';

export class ApplicationService {
  /**
   * Map database application object to Application type (without JOINs)
   */
  private static mapApplication(db: any): Application {
    return {
      id: db.id,
      jobId: db.job_id,
      baristaId: db.barista_id,
      status: db.status,
      coverLetter: db.cover_letter,
      createdAt: db.created_at,
      updatedAt: db.updated_at,
    };
  }

  /**
   * Map database application object with JOINed job data to Application type
   */
  private static mapApplicationWithJob(db: any): Application {
    return {
      id: db.id,
      jobId: db.job_id,
      baristaId: db.barista_id,
      status: db.status,
      coverLetter: db.cover_letter,
      createdAt: db.created_at,
      updatedAt: db.updated_at,
      job: db.jobs
        ? {
            id: db.jobs.id,
            businessId: db.jobs.business_id,
            businessOwnerId: db.jobs.business_owner_id,
            branchId: db.jobs.branch_id,
            jobType: db.jobs.job_type,
            title: db.jobs.title,
            description: db.jobs.description,
            requirements: db.jobs.requirements || [],
            requiredEquipmentExperience: db.jobs.required_equipment_experience || [],
            location: db.jobs.location,
            shiftDetails: db.jobs.shift_details,
            compensation: db.jobs.compensation,
            payment: db.jobs.payment,
            paymentStatus: db.jobs.payment_status,
            status: db.jobs.status,
            tags: db.jobs.tags || [],
            applicationCount: db.jobs.application_count,
            views: db.jobs.views,
            postedAt: db.jobs.posted_at,
            expiresAt: db.jobs.expires_at,
            createdAt: db.jobs.created_at,
            updatedAt: db.jobs.updated_at,
            businessName: db.jobs.businesses?.name,
            branchName: db.jobs.branches?.name,
            metroStation: db.jobs.branches?.metro_station,
          }
        : undefined,
    };
  }

  /**
   * Create a new application
   * Checks that job is open and prevents duplicates
   * Application count is incremented automatically by database trigger
   */
  static async createApplication(data: CreateApplicationData): Promise<Application> {
    try {
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('status')
        .eq('id', data.jobId)
        .single();

      if (jobError) throw jobError;
      if (!job) throw new Error('Job not found');
      if (job.status !== 'open') {
        throw new Error('Job is not open for applications');
      }

      const { data: application, error } = await supabase
        .from('applications')
        .insert({
          job_id: data.jobId,
          barista_id: data.baristaId,
          cover_letter: data.coverLetter,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('You have already applied to this job');
        }
        throw error;
      }
      if (!application) throw new Error('Failed to create application');

      return this.mapApplication(application);
    } catch (error) {
      console.error('Error in createApplication:', error);
      throw error;
    }
  }

  /**
   * Get all applications for a barista with JOINed job, business, and branch data
   */
  static async getApplicationsByBarista(baristaId: string): Promise<Application[]> {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(
          `
          *,
          jobs (
            *,
            businesses (name),
            branches (name, metro_station)
          )
        `
        )
        .eq('barista_id', baristaId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(app => this.mapApplicationWithJob(app));
    } catch (error) {
      console.error('Error in getApplicationsByBarista:', error);
      throw error;
    }
  }

  /**
   * Get all applications for a specific job (business view)
   * Includes barista email and profile information
   */
  static async getApplicationsByJob(jobId: string): Promise<Application[]> {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(
          `
          *,
          users!barista_id(email),
          barista_profiles!barista_id(
            first_name,
            last_name,
            avatar_url,
            bio,
            equipment_experience,
            years_of_experience
          )
        `
        )
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(app => ({
        ...this.mapApplication(app),
        baristaEmail: app.users?.email,
        baristaProfile: app.barista_profiles
          ? {
              firstName: app.barista_profiles.first_name,
              lastName: app.barista_profiles.last_name,
              avatarUrl: app.barista_profiles.avatar_url,
              bio: app.barista_profiles.bio,
              equipmentExperience: app.barista_profiles.equipment_experience || [],
              yearsOfExperience: app.barista_profiles.years_of_experience,
            }
          : undefined,
      }));
    } catch (error) {
      console.error('Error in getApplicationsByJob:', error);
      throw error;
    }
  }

  /**
   * Update application status (business can accept/reject)
   */
  static async updateApplicationStatus(
    applicationId: string,
    status: ApplicationStatus
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status })
        .eq('id', applicationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error in updateApplicationStatus:', error);
      throw error;
    }
  }

  /**
   * Withdraw application (barista can withdraw)
   */
  static async withdrawApplication(applicationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: 'withdrawn' })
        .eq('id', applicationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error in withdrawApplication:', error);
      throw error;
    }
  }

  /**
   * Check if barista has already applied to a job
   * Returns the application if exists, null otherwise
   */
  static async checkApplicationExists(
    jobId: string,
    baristaId: string
  ): Promise<Application | null> {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('job_id', jobId)
        .eq('barista_id', baristaId)
        .single();

      if (error) {
        // PGRST116 means no rows found, which is fine
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data ? this.mapApplication(data) : null;
    } catch (error) {
      console.error('Error in checkApplicationExists:', error);
      throw error;
    }
  }
}
