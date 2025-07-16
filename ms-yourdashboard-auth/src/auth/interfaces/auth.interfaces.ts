// ================================
// INTERFACES EXISTENTES (mantener)
// ================================

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
    profilePicture?: string | null;
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

// ================================
//  INTERFACES PARA OAUTH + JWT
// ================================

// Para el callback de Google OAuth
export interface GoogleCallbackUser {
  googleId: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string;
}

// Respuesta del callback OAuth mejorado
export interface GoogleCallbackResult {
  user: {
    id: number;
    email: string;
    name: string;
    google_id: string;
  };
  jwt: string;
  accountId: number;
  status: string;
}

// Para consultas de la tabla accounts
export interface AccountRow {
  id: number;
  email: string;
  name: string;
  password_hash?: string;
  is_email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

// Para el request autenticado de Express
export interface AuthenticatedRequest {
  user: GoogleCallbackUser;
}

// Para respuestas del controlador
export interface ProfileControllerResponse {
  success: boolean;
  user: {
    id: number;
    email: string;
    name: string;
    isEmailVerified: boolean;
    createdAt: Date;
    profilePicture: string | null;
  };
  connections: any[];
}

export interface HealthResponse {
  service: string;
  status: string;
  timestamp: string;
  port: string | number;
  features: {
    traditional_auth: boolean;
    oauth_google: boolean;
    jwt_sessions: boolean;
    multi_provider_support: boolean;
  };
}

export interface InfoResponse {
  service: string;
  description: string;
  endpoints: {
    traditional: {
      register: string;
      login: string;
      profile: string;
      logout: string;
    };
    oauth: {
      google: string;
      callback: string;
    };
    tokens: {
      get_token: string;
    };
  };
  supported_providers: string[];
  upcoming_providers: string[];
}