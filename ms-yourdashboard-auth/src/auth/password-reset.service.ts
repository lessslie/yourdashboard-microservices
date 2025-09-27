import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { 
  IPasswordResetToken, 
  ICreatePasswordResetTokenResponse, 
  IValidateTokenResult 
} from './interfaces/password-reset-token.interface';
import { randomUUID } from 'crypto'; // ← NATIVO DE NODE.JS

@Injectable()
export class PasswordResetService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Genera un token de recuperación para un email
   * Invalida tokens anteriores del mismo usuario
   * @param email - Email del usuario
   * @returns Token generado y fecha de expiración
   */
  async createResetToken(email: string): Promise<ICreatePasswordResetTokenResponse | null> {
    // 1. Buscar usuario por email
    const usuarioResult = await this.databaseService.query(
      'SELECT id, email FROM usuarios_principales WHERE email = $1',
      [email]
    );

    // Si no existe el usuario, retornamos null (por seguridad no revelamos que no existe)
    if (!usuarioResult.rows || usuarioResult.rows.length === 0) {
      return null;
    }

    const usuarioId = usuarioResult.rows[0].id;
    const usuarioEmail = usuarioResult.rows[0].email;

    // 2. Invalidar tokens anteriores del mismo usuario
    await this.databaseService.query(
      'UPDATE password_reset_tokens SET usado = true WHERE usuario_principal_id = $1 AND usado = false',
      [usuarioId]
    );

    // 3. Generar nuevo token UUID con crypto nativo
    const token = randomUUID();

    // 4. Calcular fecha de expiración (15 minutos desde ahora)
    const expiraEn = new Date();
    expiraEn.setMinutes(expiraEn.getMinutes() + 15);

    // 5. Insertar nuevo token en BD
    await this.databaseService.query(
      `INSERT INTO password_reset_tokens 
       (usuario_principal_id, email, token, expira_en) 
       VALUES ($1, $2, $3, $4)`,
      [usuarioId, usuarioEmail, token, expiraEn]
    );

    // 6. Retornar información del token creado
    return {
      token,
      expira_en: expiraEn,
      email: usuarioEmail
    };
  }

  /**
   * Valida si un token es válido (existe, no usado, no expirado)
   * @param token - Token a validar
   * @returns Resultado de la validación con mensaje
   */
  async validateToken(token: string): Promise<IValidateTokenResult> {
    // 1. Buscar token en BD
    const result = await this.databaseService.query<IPasswordResetToken>(
      `SELECT id, usuario_principal_id, token, expira_en, usado 
       FROM password_reset_tokens 
       WHERE token = $1`,
      [token]
    );

    // Token no existe
    if (!result.rows || result.rows.length === 0) {
      return {
        valid: false,
        message: 'Token inválido o no existe'
      };
    }

    const tokenData = result.rows[0];

    // Token ya fue usado
    if (tokenData.usado) {
      return {
        valid: false,
        message: 'Este token ya fue utilizado'
      };
    }

    // Token expirado
    const ahora = new Date();
    if (new Date(tokenData.expira_en) < ahora) {
      return {
        valid: false,
        message: 'El token ha expirado'
      };
    }

    // Token válido
    return {
      valid: true,
      message: 'Token válido',
      userId: tokenData.usuario_principal_id
    };
  }

  /**
   * Marca un token como usado (para que no pueda reutilizarse)
   * @param token - Token a invalidar
   */
  async markTokenAsUsed(token: string): Promise<void> {
    await this.databaseService.query(
      'UPDATE password_reset_tokens SET usado = true WHERE token = $1',
      [token]
    );
  }

  /**
   * Limpia tokens expirados de la BD (mantenimiento)
   * Se puede llamar con un CRON job
   */
  async cleanExpiredTokens(): Promise<number> {
    const result = await this.databaseService.query(
      'DELETE FROM password_reset_tokens WHERE expira_en < NOW() RETURNING id'
    );
    
    return result.rows?.length || 0;
  }

  /**
   * Obtiene información del usuario asociado a un token válido
   * @param token - Token de recuperación
   * @returns ID del usuario o null si token inválido
   */
  async getUserIdByToken(token: string): Promise<string | null> {
    const validation = await this.validateToken(token);
    
    if (!validation.valid) {
      return null;
    }

    return validation.userId || null;
  }
}