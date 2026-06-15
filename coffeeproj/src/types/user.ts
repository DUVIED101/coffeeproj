// User Types
export type AccountType = 'barista' | 'business';

export interface User {
  id: string;
  uid: string; // Alias for id (for backwards compatibility)
  email: string;
  accountType: AccountType;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  suspendedUntil: string | null;
  bannedAt: string | null;
  banReason: string | null;
  consentAcceptedAt: string | null;
}

export interface CreateUserData {
  email: string;
  password: string;
  accountType: AccountType;
}

export interface UpdateUserData {
  isActive?: boolean;
}
