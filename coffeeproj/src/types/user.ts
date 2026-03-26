// User Types
export type AccountType = 'barista' | 'business';

export interface User {
  id: string;
  uid: string; // Alias for id (for backwards compatibility)
  email: string;
  phoneNumber?: string;
  accountType: AccountType;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  phoneNumber?: string;
  accountType: AccountType;
}

export interface UpdateUserData {
  phoneNumber?: string;
  isActive?: boolean;
}
