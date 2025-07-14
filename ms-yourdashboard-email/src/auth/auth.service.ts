import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmailsService } from '../emails/emails.service';

@Injectable()
export class AuthService {
  constructor(
    private databaseService: DatabaseService,
    private emailsService: EmailsService,
  ) {}

  async handleGoogleCallback(userData: {
    googleId: string;
    email: string;
    name: string;
    accessToken: string;
    refreshToken: string;
  }) {
    try {
      // 1. Guardar usuario en base de datos
      const user = await this.databaseService.upsertUser({
        googleId: userData.googleId,
        email: userData.email,
        name: userData.name,
        accessToken: userData.accessToken,
        refreshToken: userData.refreshToken,
      });

      console.log('Usuario guardado:', user);

      // 2. ✅ GUARDAR TOKENS EN user_tokens (directamente)
      await this.saveTokensDirectly(user.id.toString(), userData.accessToken, userData.refreshToken);

      console.log('✅ Tokens guardados para consultas en tiempo real');

      return {
        user: user,
        emailsCount: 0, // Ya no importa este número
        status: 'success',
      };
    } catch (error) {
      console.error('Error handling Google callback:', error);
      throw error;
    }
  }

  /**
   * 💾 Guardar tokens directamente en user_tokens
   */
  private async saveTokensDirectly(userId: string, accessToken: string, refreshToken: string) {
    const query = `
      INSERT INTO user_tokens (user_id, access_token, refresh_token, expires_at, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        access_token = $2,
        refresh_token = $3,
        expires_at = $4,
        updated_at = NOW()
    `;

    // Los tokens de Google duran 1 hora por defecto
    const expiresAt = new Date(Date.now() + 3600000); // 1 hora desde ahora

    await this.databaseService.query(query, [
      userId,
      accessToken,
      refreshToken,
      expiresAt
    ]);
  }
}