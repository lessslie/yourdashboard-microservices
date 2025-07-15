// src/auth/interfaces/auth.interfaces.ts

export interface UserAccount {
  id: number;
  email: string;
  name: string;
  password_hash?: string;
  is_email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user: {
    id: number;
    email: string;
    name: string;
    isEmailVerified: boolean;
  };
  token: string;
}

export interface ProfileResponse {
  success: boolean;
  user: {
    id: number;
    email: string;
    name: string;
    isEmailVerified: boolean;
    createdAt: Date;
  };
  connections: OAuthConnection[];
}

export interface OAuthConnection {
  provider: string;
  is_connected: boolean;
  connected_at: Date;
  expires_at: Date | null;
}

export interface JWTPayload {
  userId: number;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

export interface Session {
  id: number;
  account_id: number;
  jwt_token: string;
  expires_at: Date;
  is_active: boolean;
  created_at: Date;
}

export interface OAuthData {
  providerUserId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface GoogleUserProfile {
  googleId: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string;
}

export interface DatabaseQueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command: string;
}

// Tipos para TokensService
export interface ValidTokenResponse {
  success: boolean;
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  renewed: boolean;
}

export interface TokenStats {
  totalUsers: number;
  validTokens: number;
  expiredTokens: number;
}

export interface UserWithToken {
  id: number;
  name: string;
  email: string;
  created_at: Date;
  expires_at: Date | null;
  token_valid: boolean;
}

export interface UsersListResponse {
  users: UserWithToken[];
  total: number;
}

// Tipos para Database
export interface TokenData {
  access_token: string;
  refresh_token: string | null;
  expires_at: Date;
  email: string;
  name: string;
}

export interface UserTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

export interface DbUser {
  id: number;
  google_id: string;
  email: string;
  name: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: Date;
  provider: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserData {
  googleId: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken?: string;
}