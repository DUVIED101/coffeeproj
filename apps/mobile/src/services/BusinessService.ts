import { supabase } from '../config/supabase';
import type {
  Business,
  Branch,
  CreateBusinessData,
  UpdateBusinessData,
  CreateBranchData,
  UpdateBranchData,
} from '../types';
import {
  uploadImageToBucket,
  PHOTO_LIMIT,
  buildBusinessLogoPath,
  buildBranchPhotoPath,
  canAddPhoto,
} from '../utils/storage';

export class BranchHasActiveJobsError extends Error {
  public readonly count: number;

  constructor(count: number, message?: string) {
    super(message ?? `${count} active jobs exist on this branch`);
    this.name = 'BranchHasActiveJobsError';
    this.count = count;
  }
}

type BusinessCacheEntry = {
  timestamp: number;
  value?: Business | null;
  inflight?: Promise<Business | null>;
};

const CACHE_TTL_MS = 30_000;
const businessByOwnerCache = new Map<string, BusinessCacheEntry>();

export class BusinessService {
  /**
   * Map database business object to Business type
   */
  private static mapBusiness(db: any): Business {
    return {
      id: db.id,
      ownerId: db.owner_id,
      name: db.name,
      description: db.description,
      businessType: db.business_type,
      legalForm: db.legal_form ?? undefined,
      isVerified: db.is_verified,
      isAcceptingApplications: db.is_accepting_applications ?? true,
      logoUrl: db.logo_url ?? undefined,
      website: db.website ?? undefined,
      socialLinks: Array.isArray(db.social_links) ? db.social_links : [],
      createdAt: db.created_at,
      updatedAt: db.updated_at,
    };
  }

  /**
   * Map database branch object to Branch type
   */
  private static mapBranch(db: any): Branch {
    return {
      id: db.id,
      businessId: db.business_id,
      name: db.name,
      address: db.address,
      city: db.city,
      coordinates: db.coordinates,
      metroStation: db.metro_station,
      equipment: db.equipment || [],
      operatingHours: db.operating_hours,
      photos: db.photos || [],
      isActive: db.is_active,
      createdAt: db.created_at,
      updatedAt: db.updated_at,
    };
  }

  /**
   * Create a new business
   */
  static async createBusiness(data: CreateBusinessData): Promise<Business> {
    try {
      const { data: business, error } = await supabase
        .from('businesses')
        .insert({
          owner_id: data.ownerId,
          name: data.name,
          description: data.description,
          business_type: data.businessType,
          legal_form: data.legalForm,
          logo_url: data.logoUrl,
          website: data.website,
          social_links: data.socialLinks ?? [],
        })
        .select()
        .single();

      if (error) {
        // A row for this owner already exists (unique_owner). Fall back to update
        // so the wizard works as an upsert even if a previous attempt half-succeeded.
        if ((error as { code?: string }).code === '23505') {
          const existing = await this.getBusinessByOwnerId(data.ownerId);
          if (existing) {
            return this.updateBusiness(existing.id, {
              name: data.name,
              description: data.description,
              businessType: data.businessType,
              legalForm: data.legalForm,
              logoUrl: data.logoUrl,
              website: data.website,
              socialLinks: data.socialLinks,
            });
          }
        }
        throw error;
      }
      if (!business) throw new Error('Failed to create business');

      const mapped = this.mapBusiness(business);
      businessByOwnerCache.delete(data.ownerId);
      return mapped;
    } catch (error) {
      console.error('Error in createBusiness:', error);
      throw error;
    }
  }

  /**
   * Get business by ID
   */
  static async getBusiness(businessId: string): Promise<Business> {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Business not found');

      return this.mapBusiness(data);
    } catch (error) {
      console.error('Error in getBusiness:', error);
      throw error;
    }
  }

  /**
   * Get business by owner ID. Multiple screens (BusinessHome, profile,
   * settings, CreateJob) call this on the same focus event — the TTL cache
   * collapses those into a single network round-trip, which dominated the
   * "businesses" rows in the egress report.
   */
  static async getBusinessByOwnerId(ownerId: string): Promise<Business | null> {
    const cached = businessByOwnerCache.get(ownerId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.inflight ? cached.inflight : Promise.resolve(cached.value ?? null);
    }
    const inflight = (async () => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('owner_id', ownerId)
          .single();
        if (error) {
          if (error.code === 'PGRST116') {
            businessByOwnerCache.set(ownerId, { value: null, timestamp: Date.now() });
            return null;
          }
          throw error;
        }
        const mapped = data ? this.mapBusiness(data) : null;
        businessByOwnerCache.set(ownerId, { value: mapped, timestamp: Date.now() });
        return mapped;
      } catch (error) {
        businessByOwnerCache.delete(ownerId);
        console.error('Error in getBusinessByOwnerId:', error);
        throw error;
      }
    })();
    businessByOwnerCache.set(ownerId, { inflight, timestamp: Date.now() });
    return inflight;
  }

  /** Drop the cached business for the given owner — call after mutations. */
  static invalidateBusinessByOwner(ownerId: string): void {
    businessByOwnerCache.delete(ownerId);
  }

  /**
   * Update business
   */
  static async updateBusiness(businessId: string, updates: UpdateBusinessData): Promise<Business> {
    try {
      const dbUpdates: any = {};

      if (updates.name !== undefined) {
        dbUpdates.name = updates.name;
      }
      if (updates.description !== undefined) {
        dbUpdates.description = updates.description;
      }
      if (updates.businessType !== undefined) {
        dbUpdates.business_type = updates.businessType;
      }
      if (updates.legalForm !== undefined) {
        dbUpdates.legal_form = updates.legalForm;
      }
      if (updates.isAcceptingApplications !== undefined) {
        dbUpdates.is_accepting_applications = updates.isAcceptingApplications;
      }
      if (updates.logoUrl !== undefined) {
        dbUpdates.logo_url = updates.logoUrl;
      }
      if (updates.website !== undefined) {
        dbUpdates.website = updates.website;
      }
      if (updates.socialLinks !== undefined) {
        dbUpdates.social_links = updates.socialLinks;
      }

      const { data, error } = await supabase
        .from('businesses')
        .update(dbUpdates)
        .eq('id', businessId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to update business');

      const mapped = this.mapBusiness(data);
      if (mapped.ownerId) businessByOwnerCache.delete(mapped.ownerId);
      return mapped;
    } catch (error) {
      console.error('Error in updateBusiness:', error);
      throw error;
    }
  }

  /**
   * Create a new branch
   */
  static async createBranch(data: CreateBranchData): Promise<Branch> {
    try {
      const { data: branch, error } = await supabase
        .from('branches')
        .insert({
          business_id: data.businessId,
          name: data.name,
          address: data.address,
          city: data.city,
          coordinates: data.coordinates,
          metro_station: data.metroStation,
          equipment: data.equipment || [],
          operating_hours: data.operatingHours,
          photos: [],
        })
        .select()
        .single();

      if (error) throw error;
      if (!branch) throw new Error('Failed to create branch');

      return this.mapBranch(branch);
    } catch (error) {
      console.error('Error in createBranch:', error);
      throw error;
    }
  }

  /**
   * Get all branches for a business
   */
  static async getBranches(businessId: string): Promise<Branch[]> {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.mapBranch);
    } catch (error) {
      console.error('Error in getBranches:', error);
      throw error;
    }
  }

  /**
   * Get branch by ID
   */
  static async getBranch(branchId: string): Promise<Branch> {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', branchId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Branch not found');

      return this.mapBranch(data);
    } catch (error) {
      console.error('Error in getBranch:', error);
      throw error;
    }
  }

  /**
   * Update branch
   */
  static async updateBranch(branchId: string, updates: UpdateBranchData): Promise<Branch> {
    try {
      const dbUpdates: any = {};

      if (updates.name !== undefined) {
        dbUpdates.name = updates.name;
      }
      if (updates.address !== undefined) {
        dbUpdates.address = updates.address;
      }
      if (updates.city !== undefined) {
        dbUpdates.city = updates.city;
      }
      if (updates.coordinates !== undefined) {
        dbUpdates.coordinates = updates.coordinates;
      }
      if (updates.metroStation !== undefined) {
        dbUpdates.metro_station = updates.metroStation;
      }
      if (updates.equipment !== undefined) {
        dbUpdates.equipment = updates.equipment;
      }
      if (updates.operatingHours !== undefined) {
        dbUpdates.operating_hours = updates.operatingHours;
      }
      if (updates.photos !== undefined) {
        dbUpdates.photos = updates.photos;
      }
      if (updates.isActive !== undefined) {
        dbUpdates.is_active = updates.isActive;
      }

      const { data, error } = await supabase
        .from('branches')
        .update(dbUpdates)
        .eq('id', branchId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to update branch');

      return this.mapBranch(data);
    } catch (error) {
      console.error('Error in updateBranch:', error);
      throw error;
    }
  }

  /**
   * Delete branch (soft delete by setting is_active to false)
   */
  static async deleteBranch(branchId: string): Promise<void> {
    try {
      const { count, error: countError } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('branch_id', branchId)
        .in('status', ['open', 'in_review']);
      if (countError) throw countError;
      if ((count ?? 0) > 0) {
        throw new BranchHasActiveJobsError(count ?? 0);
      }

      const { error } = await supabase
        .from('branches')
        .update({ is_active: false })
        .eq('id', branchId);

      if (error) throw error;
    } catch (error) {
      console.error('Error in deleteBranch:', error);
      throw error;
    }
  }

  /**
   * Upload a business logo and persist the public URL on the business row.
   */
  static async uploadBusinessLogo(
    businessId: string,
    ownerId: string,
    photoUri: string
  ): Promise<string> {
    const path = buildBusinessLogoPath(ownerId, Date.now());
    const publicUrl = await uploadImageToBucket({
      bucket: 'business-logos',
      path,
      uri: photoUri,
    });

    const { error } = await supabase
      .from('businesses')
      .update({ logo_url: publicUrl })
      .eq('id', businessId);

    if (error) throw error;
    return publicUrl;
  }

  /**
   * Upload a branch photo and append it to the branch photos array.
   * Enforces the 5-photo limit on the client; a DB CHECK is the backstop.
   */
  static async addBranchPhoto(
    branchId: string,
    ownerId: string,
    photoUri: string
  ): Promise<Branch> {
    const branch = await this.getBranch(branchId);
    if (!canAddPhoto(branch.photos)) {
      throw new BranchPhotoLimitError();
    }

    const path = buildBranchPhotoPath(ownerId, branchId, Date.now());
    const publicUrl = await uploadImageToBucket({
      bucket: 'branch-photos',
      path,
      uri: photoUri,
    });

    const nextPhotos = [...branch.photos, publicUrl];
    return this.updateBranch(branchId, { photos: nextPhotos });
  }

  /**
   * Remove a photo URL from a branch's photo array.
   * Storage object is not deleted — leaves a soft-tombstone so other readers
   * with stale joined data don't 404.
   */
  static async removeBranchPhoto(branchId: string, photoUrl: string): Promise<Branch> {
    const branch = await this.getBranch(branchId);
    const nextPhotos = branch.photos.filter(url => url !== photoUrl);
    return this.updateBranch(branchId, { photos: nextPhotos });
  }

  static async getBusinessReliabilityScore(
    userId: string
  ): Promise<{ disputes30d: number; reliabilityScore: number } | null> {
    const { data, error } = await supabase
      .rpc('get_business_reliability', { p_user_id: userId })
      .maybeSingle<{ disputes_30d: number | null; reliability_score: number | null }>();
    if (error) throw error;
    if (!data) return null;
    return {
      disputes30d: data.disputes_30d ?? 0,
      reliabilityScore: Number(data.reliability_score ?? 5),
    };
  }
}

export class BranchPhotoLimitError extends Error {
  constructor() {
    super(`Branch photo limit (${PHOTO_LIMIT}) reached`);
    this.name = 'BranchPhotoLimitError';
  }
}
