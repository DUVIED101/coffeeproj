// Business and Branch Types

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

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  businessType: BusinessType;
  isVerified: boolean;
  isAcceptingApplications?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  businessId: string;
  name: string;
  address: string;
  city: string;
  coordinates: GeoPoint;
  metroStation?: string;
  equipment: Equipment[];
  operatingHours?: OperatingHours;
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
}

export interface UpdateBusinessData {
  name?: string;
  description?: string;
  businessType?: BusinessType;
  isAcceptingApplications?: boolean;
}

export interface CreateBranchData {
  businessId: string;
  name: string;
  address: string;
  city: string;
  coordinates: GeoPoint;
  metroStation?: string;
  equipment?: Equipment[];
  operatingHours?: OperatingHours;
}

export interface UpdateBranchData {
  name?: string;
  address?: string;
  city?: string;
  coordinates?: GeoPoint;
  metroStation?: string;
  equipment?: Equipment[];
  operatingHours?: OperatingHours;
  isActive?: boolean;
}
