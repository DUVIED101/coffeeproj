import type { GeoPoint, Equipment } from './business';
import type { CityCode } from './city';

// Job Types
export type JobType = 'temporary' | 'permanent';
export type JobStatus = 'open' | 'in_review' | 'filled' | 'expired' | 'cancelled';
export type PaymentStatus = 'not_required' | 'pending' | 'escrowed' | 'completed' | 'refunded';
export type CompensationType = 'hourly' | 'daily' | 'fixed';

export interface Job {
  id: string;
  businessId: string;
  businessOwnerId: string;
  branchId: string;
  jobType: JobType;
  title: string;
  description?: string;
  requirements: string[];
  requiredEquipmentExperience: Equipment[];
  location: JobLocation;
  shiftDetails: ShiftDetails;
  compensation: Compensation;
  payment: Payment;
  paymentStatus: PaymentStatus;
  status: JobStatus;
  tags: string[];
  applicationCount: number;
  views: number;
  postedAt: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;

  // Joined fields (from database queries)
  businessName?: string;
  businessLogoUrl?: string;
  branchName?: string;
  branchPhotos?: string[];
  metroStation?: string;
  distance?: number; // in meters
}

export interface JobLocation {
  address: string;
  city: CityCode;
  coordinates: GeoPoint;
  metroStation?: string;
}

export interface ShiftDetails {
  startDate: string; // ISO date string
  endDate?: string; // ISO date string
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  isRecurring: boolean;
  recurringDays?: string[]; // ['monday', 'tuesday', ...]
}

export interface Compensation {
  type: CompensationType;
  amount: number;
  currency: string; // 'RUB'
}

export interface Payment {
  hourlyRate?: number;
  totalHours?: number;
  totalAmount: number;
  platformFee: number; // 15% of totalAmount
  totalWithFee: number; // totalAmount + platformFee
}

export interface CreateJobData {
  businessId: string;
  businessOwnerId: string;
  branchId: string;
  jobType: JobType;
  title: string;
  description?: string;
  requirements: string[];
  requiredEquipmentExperience: Equipment[];
  location: JobLocation;
  shiftDetails: ShiftDetails;
  compensation: Compensation;
  payment: Omit<Payment, 'platformFee' | 'totalWithFee'>; // Platform fee calculated automatically
  tags?: string[];
  expiresAt?: string;
}

export interface UpdateJobData {
  title?: string;
  description?: string;
  requirements?: string[];
  requiredEquipmentExperience?: Equipment[];
  shiftDetails?: ShiftDetails;
  compensation?: Compensation;
  status?: JobStatus;
  tags?: string[];
  expiresAt?: string;
}

export interface JobFilters {
  jobType?: JobType;
  equipment?: string[];
  metroStations?: string[]; // Changed from metroStation (singular) to metroStations (plural array)
  maxDistance?: number; // meters, default 50000
  city?: CityCode;
}

export interface JobSearchParams extends JobFilters {
  limit?: number;
  offset?: number;
}
