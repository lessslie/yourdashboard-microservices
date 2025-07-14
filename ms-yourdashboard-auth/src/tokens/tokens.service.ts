import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokensService {
  constructor(
    private databaseService: DatabaseService,
    private configService: ConfigService
  ) {}

  /**
   * 🔑 Obtener access token válido de un usuario
   * Este es el endpoint que usarán otros microservicios
   */
  async getValidToken(userId: string) {
    try {
      console.log(`🔵 MS-AUTH - Solicitando token para usuario: ${userId}`);

      // Buscar tokens del usuario
      const query = `
        SELECT ut.access_token, ut.refresh_token, ut.expires_at, u.email, u.name
        FROM user_tokens ut
        JOIN users u ON ut.user_id = u.id
        WHERE ut.user_id = $1
      `;

      const result = await this.databaseService.query(query, [userId]);
      
      if (result.rows.length === 0) {
        throw new NotFoundException(`Usuario ${userId} no tiene tokens configurados`);
      }

      const { access_token, refresh_token, expires_at, email, name } = result.rows[0];

      // Verificar si el token expiró
      if (expires_at && new Date() >= new Date(expires_at)) {
        console.log(`🔄 MS-AUTH - Token expirado para ${email}, renovando...`);
        
        if (!refresh_token) {
          throw new NotFoundException(`Token expirado y no hay refresh_token para usuario ${userId}`);
        }

        // Renovar token
        const newAccessToken = await this.refreshAccessToken(userId, refresh_token);
        
        return {
          success: true,
          accessToken: newAccessToken,
          user: { id: userId, email, name },
          renewed: true
        };
      }

      console.log(`✅ MS-AUTH - Token válido para ${email}`);
      
      return {
        success: true,
        accessToken: access_token,
        user: { id: userId, email, name },
        renewed: false
      };

    } catch (error) {
      console.error(`❌ MS-AUTH - Error obteniendo token para usuario ${userId}:`, error);
      throw error;
    }
  }

  /**
   * 🔄 Renovar access token usando refresh token
   */
  private async refreshAccessToken(userId: string, refreshToken: string): Promise<string> {
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
      
      // Actualizar tokens en BD
      await this.databaseService.saveUserTokens(parseInt(userId), {
        access_token: credentials.access_token!,
        refresh_token: credentials.refresh_token || refreshToken,
        expiry_date: credentials.expiry_date || undefined
      });
      
      console.log(`✅ MS-AUTH - Token renovado para usuario ${userId}`);
      
      return credentials.access_token!;

    } catch (error) {
      console.error(`❌ MS-AUTH - Error renovando token para usuario ${userId}:`, error);
      throw new Error('Error al renovar access token');
    }
  }

  /**
   * 📊 Obtener estadísticas de tokens
   */
  async getTokensStats() {
    const query = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE expires_at > NOW()) as valid_tokens,
        COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_tokens
      FROM user_tokens
    `;

    const result = await this.databaseService.query(query);
    const stats = result.rows[0];

    return {
      totalUsers: parseInt(stats.total_users),
      validTokens: parseInt(stats.valid_tokens),
      expiredTokens: parseInt(stats.expired_tokens)
    };
  }

  /**
   * 👥 Listar usuarios con tokens
   */
  async getUsersList() {
    const query = `
      SELECT u.id, u.name, u.email, u.created_at,
             ut.expires_at,
             CASE WHEN ut.expires_at > NOW() THEN true ELSE false END as token_valid
      FROM users u
      LEFT JOIN user_tokens ut ON u.id = ut.user_id
      ORDER BY u.created_at DESC
    `;

    const result = await this.databaseService.query(query);
    
    return {
      users: result.rows,
      total: result.rows.length
    };
  }
}