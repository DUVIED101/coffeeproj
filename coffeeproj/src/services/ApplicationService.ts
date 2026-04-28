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
      completedByBarista: db.completed_by_barista || false,
      completedByBusiness: db.completed_by_business || false,
      completedAt: db.completed_at,
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
      completedByBarista: db.completed_by_barista || false,
      completedByBusiness: db.completed_by_business || false,
      completedAt: db.completed_at,
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
      // First, get applications
      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (appsError) throw appsError;
      if (!applications || applications.length === 0) return [];

      // Get unique barista IDs
      const baristaIds = [...new Set(applications.map(app => app.barista_id))];

      // Fetch barista data separately (bypasses RLS issues with JOINs)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select(
          `
          id,
          email,
          barista_profiles(
            first_name,
            last_name,
            avatar_url,
            bio,
            equipment_experience,
            years_of_experience
          )
        `
        )
        .in('id', baristaIds);

      if (usersError) throw usersError;

      // Create a map of user data by ID.
      // PostgREST returns barista_profiles as an array even though user_id is UNIQUE (1:0..1),
      // so normalise to a single row here.
      const usersMap = new Map(
        (users || []).map(user => {
          const profileRow = Array.isArray(user.barista_profiles)
            ? user.barista_profiles[0]
            : user.barista_profiles;
          return [
            user.id,
            {
              email: user.email,
              profile: profileRow,
            },
          ];
        })
      );

      // Map applications with user data
      return applications.map(app => {
        const userData = usersMap.get(app.barista_id);
        return {
          ...this.mapApplication(app),
          baristaEmail: userData?.email,
          baristaProfile: userData?.profile
            ? {
                firstName: userData.profile.first_name,
                lastName: userData.profile.last_name,
                avatarUrl: userData.profile.avatar_url,
                bio: userData.profile.bio,
                equipmentExperience: userData.profile.equipment_experience || [],
                yearsOfExperience: userData.profile.years_of_experience,
              }
            : undefined,
        };
      });
    } catch (error) {
      console.error('Error in getApplicationsByJob:', error);
      throw error;
    }
  }

  /**
   * Verify caller owns the job the application belongs to.
   * Throws if not the owner — defence-in-depth on top of RLS.
   */
  private static async assertOwnsApplicationJob(
    applicationId: string,
    ownerUserId: string
  ): Promise<void> {
    const { data, error } = await supabase
      .from('applications')
      .select('id, jobs!inner(business_owner_id)')
      .eq('id', applicationId)
      .single();
    if (error) throw error;
    const jobs = (data as any)?.jobs;
    const ownerId = Array.isArray(jobs) ? jobs[0]?.business_owner_id : jobs?.business_owner_id;
    if (!ownerId || ownerId !== ownerUserId) {
      throw new Error('Not authorized to update this application');
    }
  }

  /**
   * Update application status (business can accept/reject).
   * Requires ownerUserId for defence-in-depth ownership check.
   */
  static async updateApplicationStatus(
    applicationId: string,
    status: ApplicationStatus,
    ownerUserId: string
  ): Promise<void> {
    try {
      await this.assertOwnsApplicationJob(applicationId, ownerUserId);

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

  /**
   * Mark work as completed by barista
   * When both parties mark completed, status auto-updates to 'completed' via trigger
   */
  static async markCompletedByBarista(applicationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ completed_by_barista: true })
        .eq('id', applicationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error in markCompletedByBarista:', error);
      throw error;
    }
  }

  /**
   * Mark work as completed by business.
   * Requires ownerUserId for defence-in-depth ownership check.
   */
  static async markCompletedByBusiness(applicationId: string, ownerUserId: string): Promise<void> {
    try {
      await this.assertOwnsApplicationJob(applicationId, ownerUserId);

      const { error } = await supabase
        .from('applications')
        .update({ completed_by_business: true })
        .eq('id', applicationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error in markCompletedByBusiness:', error);
      throw error;
    }
  }
}
