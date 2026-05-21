// Business and Branch Types

import type { CityCode } from './city';

export type BusinessType = 'singleLocation' | 'multiLocation';

export type Equipment =
  | 'La Marzocco'
  | 'Victoria Arduino'
  | 'Nuova Simonelli'
  | 'Synesso'
  | 'Slayer'
  | 'Dalla Corte'
  | 'Sanremo'
  | 'Rocket Espresso';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export type SocialPlatform = 'instagram' | 'telegram' | 'vk' | 'website' | 'other';

export interface SocialLink {
  platform: SocialPlatform;
  value: string;
}

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  businessType: BusinessType;
  isVerified: boolean;
  isAcceptingApplications?: boolean;
  logoUrl?: string;
  website?: string;
  socialLinks: SocialLink[];
  foundedYear?: number;
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
  logoUrl?: string;
  website?: string;
  socialLinks?: SocialLink[];
  foundedYear?: number;
}

export interface UpdateBusinessData {
  name?: string;
  description?: string;
  businessType?: BusinessType;
  isAcceptingApplications?: boolean;
  logoUrl?: string;
  website?: string;
  socialLinks?: SocialLink[];
  foundedYear?: number;
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
