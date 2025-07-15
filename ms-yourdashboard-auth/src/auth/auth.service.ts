import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

interface GoogleCallbackUser {
  googleId: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string;
}

interface GoogleCallbackResult {
  user: {
    id: number;
    email: string;
    name: string;
    google_id: string;
  };
  status: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly databaseService: DatabaseService) {}

  async handleGoogleCallback(userData: GoogleCallbackUser): Promise<GoogleCallbackResult> {
    try {
      console.log('🔵 MS-AUTH - Procesando callback de Google para:', userData.email);

      // Validar datos de entrada
      if (!userData.googleId || !userData.email || !userData.name) {
        throw new Error('Datos de usuario incompletos de Google');
      }

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
        expiry_date: Date.now() + 86400000 // 24 hora
      });

      console.log('✅ MS-AUTH - Tokens guardados para usuario ID:', user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          google_id: user.google_id
        },
        status: 'success',
      };
    } catch (error) {
      console.error('❌ MS-AUTH - Error handling Google callback:', error);
      throw error;
    }
  }
}