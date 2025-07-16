import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';
import { sign } from 'jsonwebtoken';

import {
  GoogleCallbackUser,
  GoogleCallbackResult,
  AccountRow,
  JWTPayload,
  DbUser,
} from './interfaces/auth.interfaces';

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService
  ) {}

  async handleGoogleCallback(userData: GoogleCallbackUser): Promise<GoogleCallbackResult> {
    try {
      console.log('🔵 MS-AUTH - Procesando callback de Google para:', userData.email);

      // Validar datos de entrada
      if (!userData.googleId || !userData.email || !userData.name) {
        throw new Error('Datos de usuario incompletos de Google');
      }

      // 1. Guardar usuario OAuth en base de datos
      const user = await this.databaseService.upsertUser({
        googleId: userData.googleId,
        email: userData.email,
        name: userData.name,
        accessToken: userData.accessToken,
        refreshToken: userData.refreshToken,
      });

      console.log('✅ MS-AUTH - Usuario OAuth guardado:', user.email);

      // 2. Guardar tokens OAuth en base de datos
      await this.databaseService.saveUserTokens(user.id, {
        access_token: userData.accessToken,
        refresh_token: userData.refreshToken,
        expiry_date: Date.now() + 86400000 // 24 horas
      });

      console.log('✅ MS-AUTH - Tokens OAuth guardados para usuario ID:', user.id);

      // 3: Crear o actualizar cuenta vinculada
      const accountId = await this.ensureAccountExists(user);

      //  4: Generar JWT para el usuario OAuth
      const jwt = this.generateJWTForOAuthUser(accountId, user);

      //  5: Guardar sesión JWT
      await this.saveJWTSession(accountId, jwt);

      console.log('✅ MS-AUTH - JWT generado y sesión guardada para:', user.email);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          google_id: user.google_id
        },
        jwt: jwt,
        accountId: accountId,
        status: 'success',
      };
    } catch (error) {
      console.error('❌ MS-AUTH - Error handling Google callback:', error);
      throw error;
    }
  }

  //  Asegurar que existe cuenta vinculada
  private async ensureAccountExists(user: DbUser): Promise<number> {
    try {
      // Buscar si ya existe una cuenta con este email
      const existingAccountQuery = `
        SELECT id FROM accounts WHERE email = $1
      `;
      const existingResult = await this.databaseService.query<AccountRow>(existingAccountQuery, [user.email]);

      if (existingResult.rows.length > 0) {
        const accountId = existingResult.rows[0].id;
        console.log(`✅ MS-AUTH - Cuenta existente encontrada: ${accountId} para ${user.email}`);
        return accountId;
      }

      // Si no existe, crear nueva cuenta vinculada
      const createAccountQuery = `
        INSERT INTO accounts (email, password_hash, name, is_email_verified, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id
      `;

      // Para cuentas OAuth, no hay password (usamos hash dummy)
      const dummyHash = '$2b$10$dummyHashForOAuthAccounts';
      
      const createResult = await this.databaseService.query<AccountRow>(createAccountQuery, [
        user.email,
        dummyHash,
        user.name,
        true // Email verificado por Google
      ]);

      const newAccountId = createResult.rows[0].id;
      console.log(`✅ MS-AUTH - Nueva cuenta creada: ${newAccountId} para ${user.email}`);
      
      return newAccountId;

    } catch (error) {
      console.error('❌ MS-AUTH - Error ensuring account exists:', error);
      throw error;
    }
  }

  //  Generar JWT para usuario OAuth
  private generateJWTForOAuthUser(accountId: number, user: DbUser): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    const expiresIn = this.configService.get<string>('JWT_EXPIRATION') || '24h';

    if (!secret) {
      throw new Error('JWT_SECRET no está configurado en las variables de entorno');
    }

    const payload: JWTPayload = {
      userId: accountId, //  Usar accountId, no user.id
      email: user.email,
      name: user.name
    };

    console.log(`🔑 MS-AUTH - Generando JWT para accountId: ${accountId}`);
    
    return sign(payload, secret, { expiresIn });
  }

  // Guardar sesión JWT
  private async saveJWTSession(accountId: number, jwt: string): Promise<void> {
    try {
      // JWT expira en 24h por defecto
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const query = `
        INSERT INTO sessions (account_id, jwt_token, expires_at, is_active, created_at)
        VALUES ($1, $2, $3, TRUE, NOW())
      `;

      await this.databaseService.query(query, [accountId, jwt, expiresAt]);
      
      console.log(`✅ MS-AUTH - Sesión JWT guardada para accountId: ${accountId}`);

    } catch (error) {
      console.error('❌ MS-AUTH - Error saving JWT session:', error);
      throw error;
    }
  }
}