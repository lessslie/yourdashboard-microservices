// orchestrator/auth/interfaces/auth.interfaces.ts
export { RegisterDto, LoginDto } from '../dto/auth-dto';
export { 
  AuthResponseDto, 
  ProfileResponseDto,
  CuentasGmailResponseDto,
  CuentaGmailResponseDto,
  CuentaGmailDto
} from '../dto/auth-response.dto';

// Respuestas del Orchestrator Auth
export interface OrchestratorAuthResponse<T = any> {
  success: boolean;
  source: 'orchestrator';
  data?: T;
  message?: string;
}

// Para el endpoint /auth/start
export interface AuthStartResponse {
  success: boolean;
  message: string;
  authUrl: string;
  orchestratorUrl: string;
  instructions: string;
}

// Para respuestas de MS-Auth (cuando llamemos a sus endpoints)
export interface MSAuthResponse {
  success: boolean;
  message: string;
  data?: any;
}

// Para manejo de errores
export interface AuthError {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
  message: string;
}

// Para health check específico de auth
export interface AuthHealthResponse {
  service: string;
  status: 'OK' | 'ERROR';
  timestamp: string;
  msAuthConnection: {
    url: string;
    status: 'connected' | 'disconnected';
  };
}