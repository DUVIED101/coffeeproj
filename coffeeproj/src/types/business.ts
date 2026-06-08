// Business and Branch Types

import type { CityCode } from './city';
import { EQUIPMENT_TYPES } from '../config/constants';

export type BusinessType = 'singleLocation' | 'multiLocation';

// Single source of truth: equipment brands live in config/constants. Deriving
// the union from the array prevents the two from drifting when we add brands.
export type Equipment = (typeof EQUIPMENT_TYPES)[number];

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export type SocialPlatform = 'instagram' | 'telegram' | 'vk' | 'website' | 'other';

export interface SocialLink {
  platform: SocialPlatform;
  value: string;
}

export type LegalForm = 'organization' | 'individual_entrepreneur';

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  businessType: BusinessType;
  legalForm?: LegalForm;
  isVerified: boolean;
  isAcceptingApplications?: boolean;
  logoUrl?: string;
  website?: string;
  socialLinks: SocialLink[];
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  businessId: string;
  name: string;
  address: string;
  city: CityCode;
  coordinates: GeoPoint;
  metroStation?: string;
  equipment: Equipment[];
  operatingHours?: OperatingHours;
  photos: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OperatingHours {
  [day: string]: {
    open: string; // HH:mm format
    close: string; // HH:mm format
    closed?: boolean;
  };
}

export interface CreateBusinessData {
  ownerId: string;
  name: string;
  description?: string;
  businessType: BusinessType;
  legalForm?: LegalForm;
  logoUrl?: string;
  website?: string;
  socialLinks?: SocialLink[];
}

export interface UpdateBusinessData {
  name?: string;
  description?: string;
  businessType?: BusinessType;
  legalForm?: LegalForm;
  isAcceptingApplications?: boolean;
  logoUrl?: string;
  website?: string;
  socialLinks?: SocialLink[];
}

export interface CreateBranchData {
  businessId: string;
  name: string;
  address: string;
  city: CityCode;
  coordinates: GeoPoint;
  metroStation?: string;
  equipment?: Equipment[];
  operatingHours?: OperatingHours;
}

export interface UpdateBranchData {
  name?: string;
  address?: string;
  city?: CityCode;
  coordinates?: GeoPoint;
  metroStation?: string;
  equipment?: Equipment[];
  operatingHours?: OperatingHours;
  photos?: string[];
  isActive?: boolean;
}
