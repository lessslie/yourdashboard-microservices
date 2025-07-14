import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { google } from 'googleapis';

@Injectable()
export class AuthService {
  constructor(private databaseService: DatabaseService) {}

  async handleGoogleCallback(userData: {
    googleId: string;
    email: string;
    name: string;
    accessToken: string;
    refreshToken: string;
  }) {
    try {
      console.log('🔵 MS-AUTH - Procesando callback de Google para:', userData.email);

      // 1. Guardar usuario en base de datos
      const user = await this.databaseService.upsertUser({
        googleId: userData.googleId,
        email: userData.email,
        name: userData.name,
        accessToken: userData.accessToken,
        refreshToken: userData.refreshToken,
      });

      console.log('✅ MS-AUTH - Usuario guardado:', user.email);

      // 2. Guardar tokens en tabla separada
      await this.databaseService.saveUserTokens(user.id, {
        access_token: userData.accessToken,
        refresh_token: userData.refreshToken,
        expiry_date: Date.now() + 3600000 // 1 hora
      });

      console.log('✅ MS-AUTH - Tokens guardados para usuario ID:', user.id);

      return {
        user: user,
        status: 'success',
      };
    } catch (error) {
      console.error('❌ MS-AUTH - Error handling Google callback:', error);
      throw error;
    }
  }



}