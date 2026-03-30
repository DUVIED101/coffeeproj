import { supabase } from '../config/supabase';
import type {
  Business,
  Branch,
  CreateBusinessData,
  UpdateBusinessData,
  CreateBranchData,
  UpdateBranchData,
} from '../types';

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
      isVerified: db.is_verified,
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
        })
        .select()
        .single();

      if (error) throw error;
      if (!business) throw new Error('Failed to create business');

      return this.mapBusiness(business);
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
   * Get business by owner ID
   */
  static async getBusinessByOwnerId(ownerId: string): Promise<Business | null> {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', ownerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      return data ? this.mapBusiness(data) : null;
    } catch (error) {
      console.error('Error in getBusinessByOwnerId:', error);
      throw error;
    }
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

      const { data, error } = await supabase
        .from('businesses')
        .update(dbUpdates)
        .eq('id', businessId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to update business');

      return this.mapBusiness(data);
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
}
