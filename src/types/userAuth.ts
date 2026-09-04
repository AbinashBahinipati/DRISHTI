export interface CitizenUser {
  id: string;
  fullName: string;
  emailOrPhone: string;
  hashedPassword?: string;
  salt?: string;
  createdAt: string;
  avatarColor?: string;
  emergencyContacts?: Array<{
    name: string;
    phone: string;
    relation?: string;
  }>;
}

export interface UserAuthState {
  user: CitizenUser | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  hasVisitedBefore: boolean;
}
