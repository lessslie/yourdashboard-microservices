// ================================
// 📋 USUARIOS PRINCIPALES
// ================================

import { Profile } from "passport";

export interface UsuarioPrincipal {
  id: string; // ✅ number → string
  email: string;
  password_hash?: string; // Opcional al retornar al frontend
  nombre: string;
  fecha_registro: Date;
  ultima_actualizacion: Date;
  estado: 'activo' | 'suspendido' | 'eliminado';
  email_verificado: boolean;
}

export interface RegistroUsuarioDto {
  email: string;
  password: string;
  nombre: string;
}

export interface LoginUsuarioDto {
  email: string;
  password: string;
}

export interface UsuarioPrincipalResponse {
  id: string; // ✅ number → string
  email: string;
  nombre: string;
  fecha_registro: Date;
  estado: string;
  email_verificado: boolean;
  // NO incluimos password_hash por seguridad
}

// ================================
// 📧 CUENTAS GMAIL ASOCIADAS  
// ================================

export interface CuentaGmailAsociada {
  id: string; // ✅ number → string
  usuario_principal_id: string; // ✅ number → string
  email_gmail: string;
  nombre_cuenta: string;
  google_id: string;
  access_token?: string; // Opcional al retornar
  refresh_token?: string; // Opcional al retornar
  token_expira_en?: Date;
  fecha_conexion: Date;
  ultima_sincronizacion?: Date;
  esta_activa: boolean;
  alias_personalizado?: string;
}

export interface CuentaGmailResponse {
  id: string; // ✅ number → string
  email_gmail: string;
  nombre_cuenta: string;
  alias_personalizado?: string;
  fecha_conexion: Date;
  ultima_sincronizacion?: Date;
  esta_activa: boolean;
  emails_count: number; // Calculado dinámicamente
  events_count: number; // Número de eventos sincronizados
}

export interface ConectarGmailDto {
  usuario_principal_id: string; // ✅ number → string
  google_auth_code: string; // Code del OAuth callback
  alias_personalizado?: string;
}

// ================================
// 📨 EMAILS SINCRONIZADOS
// ================================

export interface EmailSincronizado {
  id: string; // ✅ number → string
  cuenta_gmail_id: string; // ✅ number → string
  gmail_message_id: string;
  asunto?: string;
  remitente_email?: string;
  remitente_nombre?: string;
  fecha_recibido?: Date;
  esta_leido: boolean;
  tiene_adjuntos: boolean;
  etiquetas_gmail?: string[];
  fecha_sincronizado: Date;
}

export interface EmailSincronizadoResponse {
  id: string; // ✅ number → string
  gmail_message_id: string;
  asunto: string;
  remitente_email: string;
  remitente_nombre: string;
  fecha_recibido: Date;
  esta_leido: boolean;
  tiene_adjuntos: boolean;
  // NO incluimos fecha_sincronizado (interno)
}

export interface SincronizarEmailsDto {
  cuenta_gmail_id: string; // ✅ number → string
  limite_emails?: number; // Default: 50
  solo_nuevos?: boolean; // Default: true
}

// ================================
// 🔐 SESIONES JWT
// ================================

export interface SesionJwt {
  id: string; // ✅ number → string
  usuario_principal_id: string; // ✅ number → string
  jwt_token: string;
  expira_en: Date;
  fecha_creacion: Date;
  esta_activa: boolean;
  ip_origen?: string;
  user_agent?: string;
}

export interface CrearSesionDto {
  usuario_principal_id: string; // ✅ number → string
  ip_origen?: string;
  user_agent?: string;
  duracion_horas?: number; // Default: 24
}

export interface SesionResponse {
  id: string; // ✅ number → string
  fecha_creacion: Date;
  expira_en: Date;
  ip_origen?: string;
  user_agent?: string;
  esta_activa: boolean;
}

// ================================
// 🔑 JWT PAYLOAD (CUSTOM)
// ================================

export interface CustomJwtPayload {
  sub: string; // ✅ number → string - usuario_principal_id (estándar JWT)
  email: string;
  nombre: string;
  sesionId?: string; // ✅ number → string - ID de la sesión específica
  iat?: number; // Issued at (automático por jsonwebtoken)
  exp?: number; // Expires (automático por jsonwebtoken)
}

// Alias para mayor claridad - ESTA es la que usas en el código
export type JwtPayload = CustomJwtPayload;
export interface UsuarioAutenticado {
  id: string; // ✅ number → string
  email: string;
  nombre: string;
  sesion_id: string; // ✅ number → string - Para invalidar sesión específica
}

// ================================
// 📡 RESPUESTAS DE AUTENTICACIÓN
// ================================

export interface RespuestaLogin {
  success: boolean;
  message: string;
  usuario: {
    id: string; // ✅ number → string
    email: string;
    nombre: string;
    fecha_registro: Date;
    estado: string;
    email_verificado: boolean;
  };
  token: string;
  sesion_id: string;
  
  // 🆕 CAMPOS ADICIONALES DEL PERFIL (opcionales para mantener compatibilidad)
  cuentas_gmail?: Array<{
    id: string; // ✅ number → string
    email_gmail: string;
    nombre_cuenta: string;
    alias_personalizado: string | null;
    fecha_conexion: Date;
    ultima_sincronizacion: Date | null;
    esta_activa: boolean;
    emails_count: number;
    events_count: number;
  }>;
  
  sesiones_activas?: Array<{
    id: string; // ✅ ya era string | number, ahora solo string
    fecha_creacion: Date;
    expira_en: Date;
    ip_origen: string | null;
    user_agent: string | null;
    esta_activa: boolean;
  }>;
  
  estadisticas?: {
    total_cuentas_gmail: number;
    cuentas_gmail_activas: number;
    total_emails_sincronizados: number;
    emails_no_leidos: number;
    total_eventos_sincronizados: number;
    eventos_proximos: number;
    eventos_pasados: number;
    ultima_sincronizacion: Date;
    cuenta_mas_activa: {
      email_gmail: string;
      emails_count: number;
    } | null;
  };
}

export interface RespuestaRegistro {
  success: boolean;
  message: string;
  usuario: UsuarioPrincipalResponse;
  token: string;
  sesion_id: string; // ✅ number → string
}

export interface RespuestaPerfil {
  success: boolean;
  usuario: UsuarioPrincipalResponse;
  cuentas_gmail: CuentaGmailResponse[];
  sesiones_activas: SesionResponse[];
  estadisticas: EstadisticasUsuario;
}

export interface RespuestaConexionGmail {
  success: true;
  message: string;
  cuenta_gmail: {
    id: string; // ✅ number → string
    email_gmail: string;
    nombre_cuenta: string;
    alias_personalizado?: string;
    fecha_conexion: Date;
    ultima_sincronizacion?: Date;
    esta_activa: boolean;
    emails_count: number;
  };
  emails_sincronizados: number;
}
// ================================
// para auth.controller.ts
// ===============================

export interface ReqUsuarioAutenticado extends Request {
  user: {
    id: string; // ✅ number → string
    email: string;
    nombre: string;
  };
}
export interface ReqCallbackGoogle extends Request {
  user: GoogleOAuthUser;
}


// ================================
// 🔧 INTERFACE INTERNA PARA GOOGLE PROFILe
// ===============================E
export interface GoogleProfile extends Profile {
  id: string;
  name: {
    familyName: string;
    givenName: string;
  };
  emails: Array<{
    value: string;
    verified: boolean;
  }>;
}
// ================================
// 📊 PAGINACIÓN Y LISTADOS
// ================================

export interface OpcionesPaginacion {
  page: number;
  limit: number;
  orden?: 'ASC' | 'DESC';
  campo_orden?: string;
}

export interface RespuestaPaginada<T> {
  datos: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

export interface ListarEmailsDto extends OpcionesPaginacion {
  cuenta_gmail_id: string; // ✅ number → string
  solo_no_leidos?: boolean;
  busqueda?: string; // Buscar en asunto o remitente
  fecha_desde?: Date;
  fecha_hasta?: Date;
}

// ================================
// 🔍 BÚSQUEDAS Y FILTROS
// ================================

export interface FiltrosEmails {
  cuenta_gmail_id?: string; // ✅ number → string
  esta_leido?: boolean;
  tiene_adjuntos?: boolean;
  remitente_email?: string;
  busqueda_texto?: string;
  fecha_desde?: Date;
  fecha_hasta?: Date;
}

export interface ResultadoBusqueda {
  emails: EmailSincronizadoResponse[];
  total_encontrados: number;
  termino_busqueda: string;
  tiempo_busqueda_ms: number;
}

// ================================
// 📈 ESTADÍSTICAS
// ================================

export interface EstadisticasUsuario {
  total_cuentas_gmail: number;
  cuentas_gmail_activas: number;
  total_emails_sincronizados: number;
  emails_no_leidos: number;
  // 🆕 NUEVOS CAMPOS DE EVENTOS
  total_eventos_sincronizados: number;
  eventos_proximos: number;
  eventos_pasados: number;
  ultima_sincronizacion: Date;
  cuenta_mas_activa: {
    email_gmail: string;
    emails_count: number;
    
  };
}


export interface EstadisticasCuentaGmail {
  cuenta_gmail_id: string; // ✅ number → string
  email_gmail: string;
  total_emails: number;
  emails_no_leidos: number;
  emails_hoy: number;
  primer_email: Date;
  ultimo_email: Date;
  remitentes_frecuentes: Array<{
    email: string;
    nombre: string;
    count: number;
  }>;
}

// ================================
// 🚨 MANEJO DE ERRORES
// ================================

export interface ErrorAutenticacion {
  codigo: string;
  mensaje: string;
  detalles?: any;
}

export interface ErrorResponse {
  success: false;
  error: ErrorAutenticacion;
  timestamp: string;
  path?: string;
}

// Códigos de error específicos
export enum CodigosErrorAuth {
  EMAIL_YA_EXISTE = 'EMAIL_YA_EXISTE',
  CREDENCIALES_INVALIDAS = 'CREDENCIALES_INVALIDAS',
  USUARIO_NO_ENCONTRADO = 'USUARIO_NO_ENCONTRADO',
  TOKEN_INVALIDO = 'TOKEN_INVALIDO',
  TOKEN_EXPIRADO = 'TOKEN_EXPIRADO',
  SESION_INACTIVA = 'SESION_INACTIVA',
  CUENTA_GMAIL_YA_CONECTADA = 'CUENTA_GMAIL_YA_CONECTADA',
  CUENTA_GMAIL_NO_ENCONTRADA = 'CUENTA_GMAIL_NO_ENCONTRADA',
  GOOGLE_OAUTH_ERROR = 'GOOGLE_OAUTH_ERROR',
  PERMISOS_INSUFICIENTES = 'PERMISOS_INSUFICIENTES'
}

// ================================
// 🔄 INTEGRACIONES EXTERNAS
// ================================

export interface GoogleOAuthData {
  google_id: string;
  email: string;
  nombre: string;
  access_token: string;
  refresh_token?: string;
  token_expira_en?: number;
}

// Interfaz específica para el usuario de Google OAuth en guards
export interface GoogleOAuthUser {
  googleId: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiraEn?: number;
  profilePicture?: string; // Opcional, si se obtiene de Google
  locale?: string; // Opcional, si se obtiene de Google
}

export interface RefreshTokenResponse {
  access_token: string;
  expires_in: number;
  token_renovado: boolean;
}

// ================================
// 🎯 TYPES PARA DATABASE SERVICE
// ================================

export interface DatabaseQueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command: string;
}

export interface TransaccionDatabase {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  query<T>(sql: string, params?: any[]): Promise<DatabaseQueryResult<T>>;
}

// ================================
// 🔧 CONFIGURACIÓN Y HEALTH
// ================================

export interface HealthResponse {
  service: string;
  status: 'OK' | 'ERROR';
  timestamp: string;
  uptime: number;
  database: {
    connected: boolean;
    query_time_ms?: number;
  };
  estadisticas: {
    usuarios_activos: number;
    cuentas_gmail_conectadas: number;
    sesiones_activas: number;
  };
}

export interface ConfiguracionAuth {
  jwt_secret: string;
  jwt_expiration: string;
  bcrypt_rounds: number;
  google_client_id: string;
  google_client_secret: string;
  frontend_url: string;
}

// ================================
// 🎭 RESPUESTAS PARA FRONTEND
// ================================

export interface DashboardData {
  usuario: UsuarioPrincipalResponse;
  estadisticas: EstadisticasUsuario;
  cuentas_gmail: CuentaGmailResponse[];
  emails_recientes: EmailSincronizadoResponse[];
}

export interface SelectorCuentasGmail {
  cuentas: Array<{
    id: string; // ✅ number → string
    email_gmail: string;
    alias_personalizado?: string;
    emails_no_leidos: number;
    ultima_sincronizacion?: Date;
    esta_activa: boolean;
  }>;
  cuenta_seleccionada_id?: string; // ✅ number → string
}

// ================================
// ✅ EXPORT DEFAULT (para fácil importación)
// ================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ErrorAutenticacion;
  timestamp: string;
}

// ================================
// 🔑 TIPOS PARA TOKENS SERVICE
//Tipos para TokensService
// ================================

export interface ValidTokenResponse {
  success: boolean;
  accessToken: string;
  user: {
    id: string; // ✅ Ya estaba bien
    email: string;
    name: string;
    cuentaGmailId: string;
  };
  renewed: boolean;
}

export interface TokenStats {
  totalUsers: number;
  validTokens: number;
  expiredTokens: number;
}

export interface UserWithToken {
  id: string; // ✅ number → string
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
  expiry_date?: string | number | Date;
}