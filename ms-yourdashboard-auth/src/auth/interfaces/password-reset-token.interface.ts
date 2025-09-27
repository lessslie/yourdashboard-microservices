/**
 * Interface que representa un token de recuperación de contraseña
 * Mapea la estructura de la tabla 'password_reset_tokens' en la BD
 */
export interface IPasswordResetToken {
  /** UUID único del token */
  id: string;

  /** ID del usuario principal al que pertenece el token */
  usuario_principal_id: string;

  /** Email del usuario (desnormalizado para consultas rápidas) */
  email: string;

  /** Token único generado (UUID) para la recuperación */
  token: string;

  /** Fecha y hora de expiración (15 minutos desde creación) */
  expira_en: Date;

  /** Fecha y hora de creación del token */
  fecha_creacion: Date;

  /** Indica si el token ya fue usado (un solo uso) */
  usado: boolean;
}

/**
 * Interface para la respuesta al crear un token
 */
export interface ICreatePasswordResetTokenResponse {
  token: string;
  expira_en: Date;
  email: string;
}

/**
 * Interface para validar un token
 */
export interface IValidateTokenResult {
  valid: boolean;
  message: string;
  userId?: string; // Solo si es válido
}