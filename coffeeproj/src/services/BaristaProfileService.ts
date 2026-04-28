import { supabase } from '../config/supabase';
import type {
  BaristaProfile,
  CreateBaristaProfileData,
  UpdateBaristaProfileData,
} from '../types/baristaProfile';

export class BaristaProfileService {
  /**
   * Create a new barista profile
   */
  static async createProfile(data: CreateBaristaProfileData): Promise<BaristaProfile> {
    try {
      const { data: profile, error } = await supabase
        .from('barista_profiles')
        .insert({
          user_id: data.userId,
          first_name: data.firstName,
          last_name: data.lastName,
          city: data.city,
          date_of_birth: data.dateOfBirth,
          bio: data.bio,
          years_of_experience: data.yearsOfExperience,
          equipment_experience: data.equipmentExperience || [],
          certifications: data.certifications || [],
          languages: data.languages || [],
          preferred_metro_stations: data.preferredMetroStations || [],
          preferred_shift_times: data.preferredShiftTimes || [],
          hourly_rate_min: data.hourlyRateMin,
          hourly_rate_max: data.hourlyRateMax,
        })
        .select()
        .single();

      if (error) throw error;
      if (!profile) throw new Error('Failed to create profile');

      // profile_completeness is maintained by a DB trigger (migration 032).
      const updatedProfile = await this.getProfileByUserId(data.userId);
      if (!updatedProfile) throw new Error('Failed to retrieve profile');

      return updatedProfile;
    } catch (error) {
      console.error('Error in createProfile:', error);
      throw error;
    }
  }

  /**
   * Get barista profile by user ID
   */
  static async getProfileByUserId(userId: string): Promise<BaristaProfile | null> {
    try {
      const { data, error } = await supabase
        .from('barista_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data ? this.mapProfile(data) : null;
    } catch (error) {
      console.error('Error in getProfileByUserId:', error);
      throw error;
    }
  }

  /**
   * Update barista profile
   */
  static async updateProfile(
    userId: string,
    updates: UpdateBaristaProfileData
  ): Promise<BaristaProfile> {
    try {
      const dbUpdates: any = {};

      if (updates.firstName !== undefined) {
        dbUpdates.first_name = updates.firstName;
      }
      if (updates.lastName !== undefined) {
        dbUpdates.last_name = updates.lastName;
      }
      if (updates.city !== undefined) {
        dbUpdates.city = updates.city;
      }
      if (updates.dateOfBirth !== undefined) {
        dbUpdates.date_of_birth = updates.dateOfBirth;
      }
      if (updates.bio !== undefined) {
        dbUpdates.bio = updates.bio;
      }
      if (updates.yearsOfExperience !== undefined) {
        dbUpdates.years_of_experience = updates.yearsOfExperience;
      }
      if (updates.equipmentExperience !== undefined) {
        dbUpdates.equipment_experience = updates.equipmentExperience;
      }
      if (updates.certifications !== undefined) {
        dbUpdates.certifications = updates.certifications;
      }
      if (updates.languages !== undefined) {
        dbUpdates.languages = updates.languages;
      }
      if (updates.preferredMetroStations !== undefined) {
        dbUpdates.preferred_metro_stations = updates.preferredMetroStations;
      }
      if (updates.preferredShiftTimes !== undefined) {
        dbUpdates.preferred_shift_times = updates.preferredShiftTimes;
      }
      if (updates.hourlyRateMin !== undefined) {
        dbUpdates.hourly_rate_min = updates.hourlyRateMin;
      }
      if (updates.hourlyRateMax !== undefined) {
        dbUpdates.hourly_rate_max = updates.hourlyRateMax;
      }
      if (updates.availableFromDate !== undefined) {
        dbUpdates.available_from_date = updates.availableFromDate;
      }
      if (updates.isActivelyLooking !== undefined) {
        dbUpdates.is_actively_looking = updates.isActivelyLooking;
      }
      if (updates.avatarUrl !== undefined) {
        dbUpdates.avatar_url = updates.avatarUrl;
      }
      if (updates.portfolioPhotos !== undefined) {
        dbUpdates.portfolio_photos = updates.portfolioPhotos;
      }

      const { data: profile, error } = await supabase
        .from('barista_profiles')
        .update(dbUpdates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      if (!profile) throw new Error('Failed to update profile');

      // profile_completeness is maintained by a DB trigger (migration 032).
      const updatedProfile = await this.getProfileByUserId(userId);
      if (!updatedProfile) throw new Error('Failed to retrieve profile');

      return updatedProfile;
    } catch (error) {
      console.error('Error in updateProfile:', error);
      throw error;
    }
  }

  /**
   * Upload avatar photo
   */
  static async uploadAvatar(userId: string, photoUri: string): Promise<string> {
    try {
      console.log('[uploadAvatar] Starting upload, userId:', userId);
      console.log('[uploadAvatar] Photo URI:', photoUri);

      const fileName = `${userId}/avatar_${Date.now()}.jpg`;
      console.log('[uploadAvatar] File name:', fileName);

      // Read file as ArrayBuffer using XMLHttpRequest for React Native
      console.log('[uploadAvatar] Reading file as ArrayBuffer...');
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
          console.log('[uploadAvatar] ArrayBuffer loaded, byteLength:', xhr.response?.byteLength);
          resolve(xhr.response);
        };
        xhr.onerror = function (e) {
          console.error('[uploadAvatar] XHR error:', e);
          reject(new Error('Failed to read file'));
        };
        xhr.responseType = 'arraybuffer';
        xhr.open('GET', photoUri, true);
        xhr.send(null);
      });

      console.log('[uploadAvatar] Uploading to Supabase Storage...');
      const { data, error } = await supabase.storage
        .from('barista-avatars')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('[uploadAvatar] Supabase upload error:', error);
        throw error;
      }

      console.log('[uploadAvatar] Upload successful, data:', data);

      const {
        data: { publicUrl },
      } = supabase.storage.from('barista-avatars').getPublicUrl(fileName);

      console.log('[uploadAvatar] Public URL:', publicUrl);

      console.log('[uploadAvatar] Updating profile with avatar URL...');
      await supabase
        .from('barista_profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', userId);

      console.log('[uploadAvatar] Profile updated successfully!');
      return publicUrl;
    } catch (error) {
      console.error('[uploadAvatar] Error:', error);
      throw error;
    }
  }

  /**
   * Upload portfolio photo
   */
  static async uploadPortfolioPhoto(userId: string, photoUri: string): Promise<string> {
    try {
      const fileName = `${userId}/portfolio_${Date.now()}.jpg`;

      // Read file as ArrayBuffer using XMLHttpRequest for React Native
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
          resolve(xhr.response);
        };
        xhr.onerror = function () {
          reject(new Error('Failed to read file'));
        };
        xhr.responseType = 'arraybuffer';
        xhr.open('GET', photoUri, true);
        xhr.send(null);
      });

      const { error } = await supabase.storage
        .from('barista-portfolios')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from('barista-portfolios').getPublicUrl(fileName);

      const profile = await this.getProfileByUserId(userId);
      if (!profile) throw new Error('Profile not found');

      const updatedPhotos = [...profile.portfolioPhotos, publicUrl];
      await supabase
        .from('barista_profiles')
        .update({ portfolio_photos: updatedPhotos })
        .eq('user_id', userId);

      return publicUrl;
    } catch (error) {
      console.error('Error in uploadPortfolioPhoto:', error);
      throw error;
    }
  }

  /**
   * Map database profile object to BaristaProfile type
   */
  private static mapProfile(db: any): BaristaProfile {
    return {
      id: db.id,
      userId: db.user_id,
      firstName: db.first_name,
      lastName: db.last_name,
      dateOfBirth: db.date_of_birth,
      city: db.city,
      avatarUrl: db.avatar_url,
      bio: db.bio,
      yearsOfExperience: db.years_of_experience,
      equipmentExperience: db.equipment_experience || [],
      certifications: db.certifications || [],
      languages: db.languages || [],
      preferredMetroStations: db.preferred_metro_stations || [],
      preferredShiftTimes: db.preferred_shift_times || [],
      hourlyRateMin: db.hourly_rate_min,
      hourlyRateMax: db.hourly_rate_max,
      availableFromDate: db.available_from_date,
      portfolioPhotos: db.portfolio_photos || [],
      isActivelyLooking: db.is_actively_looking,
      profileCompleteness: db.profile_completeness || 0,
      createdAt: db.created_at,
      updatedAt: db.updated_at,
    };
  }
}
