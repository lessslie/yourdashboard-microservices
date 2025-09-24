import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import { TokenStats, UsersListResponse, UserWithToken, ValidTokenResponse } from 'src/auth/interfaces/auth.interfaces';

@Injectable()
export class TokensService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService
  ) {}

  /**
   * 🔑 Obtener access token válido de un usuario PRINCIPAL
   * LEGACY: Busca en cuentas_gmail_asociadas del usuario principal
   */
  async getValidToken(userId: string): Promise<ValidTokenResponse> {
    try {
      console.log(`🔵 MS-AUTH - Solicitando token para usuario PRINCIPAL: ${userId}`);

      // ✅ CORREGIDO: Validar que userId sea un UUID válido
      if (!userId || userId.trim() === '') {
        throw new NotFoundException(`ID de usuario inválido: ${userId}`);
      }

      // 🎯 BUSCAR PRIMERA CUENTA GMAIL ACTIVA DEL USUARIO PRINCIPAL
      const query = `
        SELECT 
          cga.id as cuenta_gmail_id,
          cga.access_token, 
          cga.refresh_token, 
          cga.token_expira_en as expires_at, 
          cga.email_gmail as email, 
          cga.nombre_cuenta as name,
          up.email as usuario_principal_email,
          up.nombre as usuario_principal_nombre
        FROM cuentas_gmail_asociadas cga
        JOIN usuarios_principales up ON cga.usuario_principal_id = up.id
        WHERE cga.usuario_principal_id = $1 
        AND cga.esta_activa = TRUE
        ORDER BY cga.fecha_conexion DESC
        LIMIT 1
      `;

      const result = await this.databaseService.query<{
        cuenta_gmail_id: string; // ✅ CORREGIDO: number → string
        access_token: string;
        refresh_token: string;
        expires_at: Date;
        email: string;
        name: string;
        usuario_principal_email: string;
        usuario_principal_nombre: string;
      }>(query, [userId]); // ✅ CORREGIDO: userIdNum → userId
      
      if (result.rows.length === 0) {
        throw new NotFoundException(`Usuario ${userId} no tiene cuentas Gmail conectadas`);
      }

      const { cuenta_gmail_id, access_token, refresh_token, expires_at, email, name } = result.rows[0];

      // Verificar si el token expiró
      if (expires_at && new Date() >= new Date(expires_at)) {
        console.log(`🔄 MS-AUTH - Token expirado para ${email}, renovando...`);
        
        if (!refresh_token) {
          throw new NotFoundException(`Token expirado y no hay refresh_token para usuario ${userId}`);
        }

        // Renovar token usando la cuenta Gmail específica
        const newAccessToken = await this.refreshAccessToken(email, refresh_token);
        
        return {
          success: true,
          accessToken: newAccessToken,
          user: { 
            id: userId, 
            email, 
            name,
            cuentaGmailId: cuenta_gmail_id // ✅ CORREGIDO: .toString() eliminado
          },
          renewed: true
        };
      }

      console.log(`✅ MS-AUTH - Token válido para ${email} (usuario ${userId}, cuenta Gmail ${cuenta_gmail_id})`);
      
      return {
        success: true,
        accessToken: access_token,
        user: { 
          id: userId, 
          email, 
          name,
          cuentaGmailId: cuenta_gmail_id // ✅ CORREGIDO: .toString() eliminado
        },
        renewed: false
      };

    } catch (error) {
      console.error(`❌ MS-AUTH - Error obteniendo token para usuario ${userId}:`, error);
      throw error;
    }
  }

  /**
   * 🔑 🎯 NUEVO: Obtener access token por CUENTA GMAIL específica
   */
  async getValidTokenByGmailAccount(cuentaGmailId: string): Promise<ValidTokenResponse> {
    try {
      console.log(`🔵 MS-AUTH - Solicitando token para cuenta Gmail: ${cuentaGmailId}`);

      // ✅ CORREGIDO: Validar que cuentaGmailId sea un UUID válido
      if (!cuentaGmailId || cuentaGmailId.trim() === '') {
        throw new NotFoundException(`ID de cuenta Gmail inválido: ${cuentaGmailId}`);
      }

      // 🎯 BUSCAR CUENTA GMAIL ESPECÍFICA
      const query = `
        SELECT 
          cga.id as cuenta_gmail_id,
          cga.access_token, 
          cga.refresh_token, 
          cga.token_expira_en as expires_at, 
          cga.email_gmail as email, 
          cga.nombre_cuenta as name,
          cga.usuario_principal_id,
          up.email as usuario_principal_email,
          up.nombre as usuario_principal_nombre
        FROM cuentas_gmail_asociadas cga
        JOIN usuarios_principales up ON cga.usuario_principal_id = up.id
        WHERE cga.id = $1 
        AND cga.esta_activa = TRUE
      `;

      const result = await this.databaseService.query<{
        cuenta_gmail_id: string; // ✅ CORREGIDO: number → string
        access_token: string;
        refresh_token: string;
        expires_at: Date;
        email: string;
        name: string;
        usuario_principal_id: string; // ✅ CORREGIDO: number → string
        usuario_principal_email: string;
        usuario_principal_nombre: string;
      }>(query, [cuentaGmailId]); // ✅ CORREGIDO: cuentaIdNum → cuentaGmailId
      
      if (result.rows.length === 0) {
        throw new NotFoundException(`Cuenta Gmail ${cuentaGmailId} no encontrada o inactiva`);
      }

      const { cuenta_gmail_id, access_token, refresh_token, expires_at, email, name, usuario_principal_id } = result.rows[0];

      // Verificar si el token expiró
      if (expires_at && new Date() >= new Date(expires_at)) {
        console.log(`🔄 MS-AUTH - Token expirado para cuenta Gmail ${email}, renovando...`);
        
        if (!refresh_token) {
          throw new NotFoundException(`Token expirado y no hay refresh_token para cuenta Gmail ${cuentaGmailId}`);
        }

        // Renovar token usando la cuenta Gmail específica
        const newAccessToken = await this.refreshAccessToken(email, refresh_token);
        
        return {
          success: true,
          accessToken: newAccessToken,
          user: { 
            id: usuario_principal_id, // ✅ CORREGIDO: .toString() eliminado
            email, 
            name,
            cuentaGmailId: cuenta_gmail_id // ✅ CORREGIDO: .toString() eliminado
          },
          renewed: true
        };
      }

      console.log(`✅ MS-AUTH - Token válido para cuenta Gmail ${email} (ID: ${cuenta_gmail_id})`);
      
      return {
        success: true,
        accessToken: access_token,
        user: { 
          id: usuario_principal_id, // ✅ CORREGIDO: .toString() eliminado
          email, 
          name,
          cuentaGmailId: cuenta_gmail_id // ✅ CORREGIDO: .toString() eliminado
        },
        renewed: false
      };

    } catch (error) {
      console.error(`❌ MS-AUTH - Error obteniendo token para cuenta Gmail ${cuentaGmailId}:`, error);
      throw error;
    }
  }

  /**
   * 🔄 Renovar access token usando refresh token
   * ACTUALIZADO: para nueva arquitectura
   */
  private async refreshAccessToken(emailGmail: string, refreshToken: string): Promise<string> {
    try {
      const oauth2Client = new google.auth.OAuth2(
        this.configService.get<string>('GOOGLE_CLIENT_ID'),
        this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
        this.configService.get<string>('GOOGLE_REDIRECT_URI')
      );

      oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      const { credentials } = await oauth2Client.refreshAccessToken();
      
      if (!credentials.access_token) {
        throw new Error('No se pudo obtener el nuevo access token');
      }

      // 🎯 ACTUALIZAR EN NUEVA TABLA
      const updateQuery = `
        UPDATE cuentas_gmail_asociadas 
        SET 
          access_token = $1,
          refresh_token = $2,
          token_expira_en = $3,
          ultima_sincronizacion = NOW()
        WHERE email_gmail = $4
      `;

      const expiresAt = credentials.expiry_date 
        ? new Date(credentials.expiry_date) 
        : new Date(Date.now() + 3600000); // 1 hora por defecto

      await this.databaseService.query(updateQuery, [
        credentials.access_token,
        credentials.refresh_token || refreshToken,
        expiresAt,
        emailGmail
      ]);
      
      console.log(`✅ MS-AUTH - Token renovado para ${emailGmail}`);
      
      return credentials.access_token;

    } catch (error) {
      console.error(`❌ MS-AUTH - Error renovando token para ${emailGmail}:`, error);
      throw new Error('Error al renovar access token');
    }
  }

  /**
   * 📊 Obtener estadísticas de tokens
   * NUEVA ARQUITECTURA
   */
  async getTokensStats(): Promise<TokenStats> {
    const query = `
      SELECT 
        COUNT(DISTINCT up.id) as total_users,
        COUNT(cga.id) FILTER (WHERE cga.token_expira_en > NOW() AND cga.esta_activa = TRUE) as valid_tokens,
        COUNT(cga.id) FILTER (WHERE cga.token_expira_en <= NOW() OR cga.esta_activa = FALSE) as expired_tokens
      FROM usuarios_principales up
      LEFT JOIN cuentas_gmail_asociadas cga ON up.id = cga.usuario_principal_id
    `;

    const result = await this.databaseService.query<{
      total_users: string;
      valid_tokens: string;
      expired_tokens: string;
    }>(query);
    
    const stats = result.rows[0];

    return {
      totalUsers: parseInt(stats.total_users, 10),
      validTokens: parseInt(stats.valid_tokens, 10),
      expiredTokens: parseInt(stats.expired_tokens, 10)
    };
  }

  /**
   * 👥 Listar usuarios con tokens
   * NUEVA ARQUITECTURA
   */
  async getUsersList(): Promise<UsersListResponse> {
    const query = `
      SELECT 
        up.id, 
        up.nombre as name, 
        up.email, 
        up.fecha_registro as created_at,
        cga.token_expira_en as expires_at,
        CASE 
          WHEN cga.token_expira_en > NOW() AND cga.esta_activa = TRUE 
          THEN true 
          ELSE false 
        END as token_valid,
        COUNT(cga.id) as cuentas_gmail_count
      FROM usuarios_principales up
      LEFT JOIN cuentas_gmail_asociadas cga ON up.id = cga.usuario_principal_id
      GROUP BY up.id, up.nombre, up.email, up.fecha_registro, cga.token_expira_en, cga.esta_activa
      ORDER BY up.fecha_registro DESC
    `;

    const result = await this.databaseService.query<UserWithToken & { cuentas_gmail_count: number }>(query);
    
    return {
      users: result.rows,
      total: result.rows.length
    };
  }
}