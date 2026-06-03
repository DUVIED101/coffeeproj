// Barista Profile Types

import type { Equipment } from './business';
import type { CityCode } from './city';
import type { WorkExperience } from './workExperience';

export type ShiftTime = 'morning' | 'afternoon' | 'evening' | 'night';

export interface BaristaProfile {
  id: string;
  userId: string;

  // Personal Info
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  city: CityCode;
  avatarUrl?: string;

  // Professional Info
  bio?: string;
  yearsOfExperience?: number;
  equipmentExperience: string[];
  certifications: string[];
  languages: string[];

  // Work Preferences
  preferredMetroStations: string[];
  preferredShiftTimes: ShiftTime[];
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  availableFromDate?: string;

  // Compliance
  medicalBookExpiresOn?: string; // ISO date (YYYY-MM-DD)

  // Portfolio
  portfolioPhotos: string[];

  // Work history (loaded separately from work_experiences table)
  workExperiences?: WorkExperience[];

  // Status
  isActivelyLooking: boolean;
  profileCompleteness: number;

  createdAt: string;
  updatedAt: string;
}

export interface CreateBaristaProfileData {
  userId: string;
  firstName: string;
  lastName: string;
  city: CityCode;
  dateOfBirth?: string;
  bio?: string;
  yearsOfExperience?: number;
  equipmentExperience?: string[];
  certifications?: string[];
  languages?: string[];
  preferredMetroStations?: string[];
  preferredShiftTimes?: ShiftTime[];
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  medicalBookExpiresOn?: string;
}

export interface UpdateBaristaProfileData extends Partial<
  Omit<BaristaProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'profileCompleteness'>
> {}

export type BaristaFilters = {
  city?: CityCode;
  equipment?: Equipment[];
  metroStations?: string[];
  minYearsExperience?: number;
  hourlyRateMax?: number;
  shiftTimes?: ShiftTime[];
  languages?: string[];
  certifications?: string[];
  minCompleteness?: number;
};

export type ReliabilityScore = {
  incidents30d: number;
  reliabilityScore: number;
};
