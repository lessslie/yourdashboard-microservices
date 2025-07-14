import Cookies from 'js-cookie';
import axios from 'axios';

const MS_AUTH_URL = process.env.NEXT_PUBLIC_MS_AUTH_URL || 'http://localhost:3001';

// Tipos
export interface User {
  id: number;
  email: string;
  name: string;
  isEmailVerified: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user: User;
  token: string;
}

export interface ProfileResponse {
  success: boolean;
  user: User;
  connections: Array<{
    provider: string;
    is_connected: boolean;
    connected_at: string;
  }>;
}

// Configurar axios con interceptor para token
const authApi = axios.create({
  baseURL: MS_AUTH_URL,
});

// Interceptor para agregar token automáticamente
authApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Funciones de autenticación
export const authService = {
  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const response = await authApi.post('/auth/register', {
      email,
      password,
      name,
    });
    return response.data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await authApi.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  async getProfile(): Promise<ProfileResponse> {
    const response = await authApi.get('/auth/me');
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await authApi.post('/auth/logout');
    } finally {
      // Limpiar token local independientemente del resultado
      removeToken();
    }
  },

  async connectGoogle(): Promise<string> {
    // Devuelve la URL para redirigir al usuario
    return `${MS_AUTH_URL}/auth/google`;
  },
};

// Funciones de manejo de tokens
export const saveToken = (token: string): void => {
  Cookies.set('auth_token', token, {
    expires: 7, // 7 días
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
};

export const getToken = (): string | undefined => {
  return Cookies.get('auth_token');
};

export const removeToken = (): void => {
  Cookies.remove('auth_token');
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

// ✅ Hook personalizado SIMPLE (sin loops)
export const useAuth = () => {
  const token = getToken();
  const isLoggedIn = !!token;

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    if (response.success) {
      saveToken(response.token);
      return response;
    }
    throw new Error(response.message);
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await authService.register(email, password, name);
    if (response.success) {
      saveToken(response.token);
      return response;
    }
    throw new Error(response.message);
  };

  const logout = async () => {
    await authService.logout();
    window.location.href = '/login';
  };

  return {
    isLoggedIn,
    token,
    login,
    register,
    logout,
    getProfile: authService.getProfile,
    connectGoogle: authService.connectGoogle,
  };
};