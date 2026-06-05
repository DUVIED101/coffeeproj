import { supabase } from '../config/supabase';
import type {
  BaristaProfile,
  CreateBaristaProfileData,
  ReliabilityScore,
  UpdateBaristaProfileData,
} from '../types/baristaProfile';
import type { UserId } from '../types/ids';
import { canAddPhoto, PHOTO_LIMIT } from '../utils/storage';

// Detect "column not found in schema cache" so we can degrade gracefully when
// migration 071 (medical_book_expires_on) hasn't been applied yet. PostgREST
// returns PGRST204 plus a message naming the missing column.
const isMissingMedicalBookColumn = (e: unknown): boolean => {
  const code = (e as { code?: string } | null)?.code;
  const message = (e as { message?: string } | null)?.message ?? '';
  return code === 'PGRST204' && message.includes('medical_book_expires_on');
};

export class BaristaProfileService {
  /**
   * Create a new barista profile
   */
  static async createProfile(data: CreateBaristaProfileData): Promise<BaristaProfile> {
    try {
      const baseRow: Record<string, unknown> = {
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
      };
      if (data.medicalBookExpiresOn !== undefined) {
        baseRow.medical_book_expires_on = data.medicalBookExpiresOn;
      }

      let { data: profile, error } = await supabase
        .from('barista_profiles')
        .insert(baseRow)
        .select()
        .single();

      // Migration 071 may not have been applied yet on the target Supabase
      // project — retry without the optional column so the user can still
      // create / edit their profile.
      if (error && isMissingMedicalBookColumn(error)) {
        console.warn(
          '[BaristaProfileService] medical_book_expires_on column not found; ' +
            'apply migration 071_barista_medical_book.sql. Saving without it.'
        );
        delete baseRow.medical_book_expires_on;
        const retry = await supabase.from('barista_profiles').insert(baseRow).select().single();
        profile = retry.data;
        error = retry.error;
      }

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
      if (updates.medicalBookExpiresOn !== undefined) {
        dbUpdates.medical_book_expires_on = updates.medicalBookExpiresOn ?? null;
      }

      let { data: profile, error } = await supabase
        .from('barista_profiles')
        .update(dbUpdates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error && isMissingMedicalBookColumn(error)) {
        console.warn(
          '[BaristaProfileService] medical_book_expires_on column not found; ' +
            'apply migration 071_barista_medical_book.sql. Saving without it.'
        );
        delete dbUpdates.medical_book_expires_on;
        const retry = await supabase
          .from('barista_profiles')
          .update(dbUpdates)
          .eq('user_id', userId)
          .select()
          .single();
        profile = retry.data;
        error = retry.error;
      }

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
   * Upload portfolio photo. Enforces the 5-photo limit on the client;
   * a DB CHECK is the backstop (migration 045).
   */
  static async uploadPortfolioPhoto(userId: string, photoUri: string): Promise<string> {
    try {
      const profile = await this.getProfileByUserId(userId);
      if (!profile) throw new Error('Profile not found');
      if (!canAddPhoto(profile.portfolioPhotos)) {
        throw new PortfolioPhotoLimitError();
      }

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
   * Remove a portfolio photo URL from the barista profile. Storage object is
   * left in place (soft-tombstone) so stale joined readers don't 404.
   */
  static async removePortfolioPhoto(userId: string, photoUrl: string): Promise<void> {
    const profile = await this.getProfileByUserId(userId);
    if (!profile) throw new Error('Profile not found');
    const nextPhotos = profile.portfolioPhotos.filter(url => url !== photoUrl);
    const { error } = await supabase
      .from('barista_profiles')
      .update({ portfolio_photos: nextPhotos })
      .eq('user_id', userId);
    if (error) throw error;
  }

  /**
   * Upload a certificate image to storage and return the public URL.
   * Does NOT touch barista_profiles — caller decides when to persist the list
   * (during initial signup the profile row may not exist yet).
   */
  static async uploadCertificateFile(userId: string, photoUri: string): Promise<string> {
    const fileName = `${userId}/certificates/cert_${Date.now()}.jpg`;

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

    return publicUrl;
  }

  /**
   * Upload a certificate AND persist it on an existing barista_profiles row.
   * Used by the profile-edit flow where the row already exists.
   */
  static async uploadCertificate(userId: string, photoUri: string): Promise<string> {
    try {
      const publicUrl = await this.uploadCertificateFile(userId, photoUri);

      const profile = await this.getProfileByUserId(userId);
      if (!profile) throw new Error('Profile not found');

      const updated = [...profile.certifications, publicUrl];
      const { error: updateError } = await supabase
        .from('barista_profiles')
        .update({ certifications: updated })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      return publicUrl;
    } catch (error) {
      console.error('Error in uploadCertificate:', error);
      throw error;
    }
  }

  /**
   * Replace the certifications array (used to remove an entry).
   */
  static async setCertifications(userId: string, certifications: string[]): Promise<void> {
    const { error } = await supabase
      .from('barista_profiles')
      .update({ certifications })
      .eq('user_id', userId);

    if (error) throw error;
  }

  static async getReliabilityScore(userId: UserId): Promise<ReliabilityScore | null> {
    // RPC replaces the prior `.from('barista_reliability')` view read. The
    // function is STABLE SECURITY DEFINER with a pinned search_path — same
    // behaviour, with the security_definer_view advisor flag retired.
    const { data, error } = await supabase
      .rpc('get_barista_reliability', { p_user_id: userId })
      .maybeSingle<{ incidents_30d: number | null; reliability_score: number | null }>();
    if (error) throw error;
    if (!data) return null;
    return {
      incidents30d: data.incidents_30d ?? 0,
      reliabilityScore: Number(data.reliability_score ?? 5),
    };
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
      medicalBookExpiresOn: db.medical_book_expires_on ?? undefined,
      isActivelyLooking: db.is_actively_looking,
      profileCompleteness: db.profile_completeness || 0,
      createdAt: db.created_at,
      updatedAt: db.updated_at,
    };
  }
}

export class PortfolioPhotoLimitError extends Error {
  constructor() {
    super(`Portfolio photo limit (${PHOTO_LIMIT}) reached`);
    this.name = 'PortfolioPhotoLimitError';
  }
}
