import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private pool: Pool;

  constructor(private configService: ConfigService) {
    this.pool = new Pool({
      host: this.configService.get<string>('DB_HOST'),
      port: this.configService.get<number>('DB_PORT'),
      database: this.configService.get<string>('DB_NAME'),
      user: this.configService.get<string>('DB_USER'),
      password: this.configService.get<string>('DB_PASSWORD'),
    });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  // Ejecutar queries SQL
  async query(text: string, params?: any[]) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  // Guardar o actualizar usuario
  async upsertUser(userData: {
    googleId: string;
    email: string;
    name: string;
    accessToken: string;
    refreshToken?: string;
  }) {
    const query = `
      INSERT INTO users (google_id, email, name, access_token, refresh_token, token_expires_at, provider, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'google', NOW())
      ON CONFLICT (google_id) 
      DO UPDATE SET 
        email = $2,
        name = $3,
        access_token = $4,
        refresh_token = $5,
        token_expires_at = $6,
        updated_at = NOW()
      RETURNING *
    `;
    
    // Token expira en 1 hora
    const expiresAt = new Date(Date.now() + 3600000);
    
    const values = [
      userData.googleId,
      userData.email,
      userData.name,
      userData.accessToken,
      userData.refreshToken || null,
      expiresAt,
    ];

    const result = await this.query(query, values);
    return result.rows[0];
  }

  // Guardar tokens en tabla separada
  async saveUserTokens(userId: number, tokens: {
    access_token: string;
    refresh_token?: string;
    expiry_date?: number;
  }) {
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

    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600000);

    await this.query(query, [
      userId,
      tokens.access_token,
      tokens.refresh_token || null,
      expiresAt
    ]);
  }
}