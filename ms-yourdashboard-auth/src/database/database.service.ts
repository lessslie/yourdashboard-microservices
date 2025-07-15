import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { 
  DatabaseQueryResult, 
  UserData, 
  UserTokens, 
  DbUser 
} from '../auth/interfaces/auth.interfaces';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(private readonly configService: ConfigService) {
    this.pool = new Pool({
      host: this.configService.get<string>('DB_HOST'),
      port: this.configService.get<number>('DB_PORT'),
      database: this.configService.get<string>('DB_NAME'),
      user: this.configService.get<string>('DB_USER'),
      password: this.configService.get<string>('DB_PASSWORD'),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  // Ejecutar queries SQL genéricas
  async query<T extends QueryResultRow = any>(
    text: string, 
    params?: any[]
  ): Promise<DatabaseQueryResult<T>> {
    const client: PoolClient = await this.pool.connect();
    try {
      const result: QueryResult<T> = await client.query<T>(text, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        command: result.command
      };
    } finally {
      client.release();
    }
  }

  // Guardar o actualizar usuario
  async upsertUser(userData: UserData): Promise<DbUser> {
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
    
    // Token expira en 24 hora
    const expiresAt = new Date(Date.now() + 86400000);
    
    const values = [
      userData.googleId,
      userData.email,
      userData.name,
      userData.accessToken,
      userData.refreshToken || null,
      expiresAt,
    ];

    const result = await this.query<DbUser>(query, values);
    return result.rows[0];
  }

  // Guardar tokens en tabla separada
  async saveUserTokens(userId: number, tokens: UserTokens): Promise<void> {
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

    const expiresAt = tokens.expiry_date 
      ? new Date(tokens.expiry_date) 
      : new Date(Date.now() + 86400000); // 24 horas por defecto

    await this.query(query, [
      userId,
      tokens.access_token,
      tokens.refresh_token || null,
      expiresAt
    ]);
  }

  // Obtener usuario por ID
  async getUserById(userId: number): Promise<DbUser | null> {
    const query = `SELECT * FROM users WHERE id = $1`;
    const result = await this.query<DbUser>(query, [userId]);
    return result.rows[0] || null;
  }

  // Obtener usuario por Google ID
  async getUserByGoogleId(googleId: string): Promise<DbUser | null> {
    const query = `SELECT * FROM users WHERE google_id = $1`;
    const result = await this.query<DbUser>(query, [googleId]);
    return result.rows[0] || null;
  }

  // Verificar salud de la conexión
 async healthCheck(): Promise<boolean> {
  try {
    const result = await this.query<{ health: number }>('SELECT 1 as health');
    const firstRow = result.rows[0];
    return firstRow?.health === 1;
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return false;
  }
}
}