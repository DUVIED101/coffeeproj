import { supabase } from '../config/supabase';
import type { BaristaProfile, BaristaFilters } from '../types/baristaProfile';
import { METRO_ANY } from '../components/MetroSelector';

const PAGE_SIZE = 20;
const DEFAULT_MIN_COMPLETENESS = 30;

export class BaristaSearchService {
  static async searchBaristas(filters: BaristaFilters, page = 0): Promise<BaristaProfile[]> {
    try {
      let query = supabase.from('barista_profiles').select('*').eq('is_actively_looking', true);

      if (filters.city) {
        query = query.eq('city', filters.city);
      }
      if (filters.equipment?.length) {
        query = query.overlaps('equipment_experience', filters.equipment);
      }
      if (filters.metroStations?.length) {
        // Include METRO_ANY in the overlap so baristas who said "any station"
        // still match a specific-station filter — saying "any" means "I'm
        // willing to work near any metro" and shouldn't exclude them from
        // recruiter searches.
        query = query.overlaps('preferred_metro_stations', [...filters.metroStations, METRO_ANY]);
      }
      if (filters.shiftTimes?.length) {
        query = query.overlaps('preferred_shift_times', filters.shiftTimes);
      }
      if (filters.languages?.length) {
        query = query.overlaps('languages', filters.languages);
      }
      if (filters.certifications?.length) {
        query = query.overlaps('certifications', filters.certifications);
      }
      if (filters.minYearsExperience !== undefined) {
        query = query.gte('years_of_experience', filters.minYearsExperience);
      }
      if (filters.hourlyRateMax !== undefined) {
        // Some profiles only set hourly_rate_min (single desired rate);
        // a cap should match when EITHER bound is within the cap.
        const cap = filters.hourlyRateMax;
        query = query.or(`hourly_rate_max.lte.${cap},hourly_rate_min.lte.${cap}`);
      }

      query = query.gte(
        'profile_completeness',
        filters.minCompleteness ?? DEFAULT_MIN_COMPLETENESS
      );

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await query
        .order('profile_completeness', { ascending: false })
        .order('updated_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return (data || []).map(row => this.mapProfile(row));
    } catch (error) {
      console.error('Error in searchBaristas:', error);
      throw error;
    }
  }

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
