// Barista Profile Types

import type { Equipment } from './business';
import type { CityCode } from './city';
import type { WorkExperience } from './workExperience';

export type ShiftTime = 'morning' | 'afternoon' | 'evening' | 'night';

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type WorkloadType = 'full_time' | 'part_time' | 'freelance' | 'weekends_only' | 'flexible';

export const DAYS_OF_WEEK: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const WORKLOAD_TYPES: WorkloadType[] = [
  'full_time',
  'part_time',
  'freelance',
  'weekends_only',
  'flexible',
];

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
  availableDays: DayOfWeek[];
  workloadTypes: WorkloadType[];

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
  availableFromDate?: string;
  availableDays?: DayOfWeek[];
  workloadTypes?: WorkloadType[];
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
  availableFromDateMax?: string; // ISO date; barista is ready on or before this date
  availableDaysAny?: DayOfWeek[]; // any-of overlap
  workloadTypesAny?: WorkloadType[]; // any-of overlap
  // "У моих точек" preset. When set, restricts the search to baristas whose
  // city is one of these AND whose preferred stations overlap `metroStations`
  // *without* the METRO_ANY fallback — the preset must be strict, otherwise
  // "any station" baristas dominate the result and it's unclear why they matched.
  branchCitiesAny?: CityCode[];
};

export type ReliabilityScore = {
  incidents30d: number;
  reliabilityScore: number;
};
