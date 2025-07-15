import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { DatabaseUserData, DatabaseEmailData } from '../emails/interfaces/email.interfaces';

interface DbUser {
  id: string;
  google_id: string;
  email: string;
  name: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: Date | null;
  provider: string;
  created_at: Date;
  updated_at: Date;
}

interface QueryResultGeneric<T = any> {
  rows: T[];
  rowCount: number | null;
  command: string;
}

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

  // Ejecutar queries SQL puro
  async query<T extends QueryResultRow = any>(
    text: string, 
    params?: any[]
  ): Promise<QueryResultGeneric<T>> {
    const client: PoolClient = await this.pool.connect();
    try {
      const result: QueryResult<T> = await client.query<T>(text, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount,
        command: result.command
      };
    } finally {
      client.release();
    }
  }

  // Guardar o actualizar usuario
  async upsertUser(userData: DatabaseUserData): Promise<DbUser> {
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
    
    const values = [
      userData.googleId,
      userData.email,
      userData.name,
      userData.accessToken,
      userData.refreshToken || null,
      userData.tokenExpiresAt || null,
    ];

    const result = await this.query<DbUser>(query, values);
    return result.rows[0];
  }

  // Guardar email
  async saveEmail(emailData: DatabaseEmailData): Promise<DbUser | null> {
    const query = `
      INSERT INTO emails (
        user_id, message_id, subject, from_email, from_name, to_emails,
        body_text, body_html, received_date, is_read, has_attachments
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (message_id) DO NOTHING
      RETURNING *
    `;

    const values = [
      emailData.userId,
      emailData.messageId,
      emailData.subject,
      emailData.fromEmail,
      emailData.fromName || null,
      emailData.toEmails,
      emailData.bodyText || null,
      emailData.bodyHtml || null,
      emailData.receivedDate,
      emailData.isRead,
      emailData.hasAttachments,
    ];

    const result = await this.query<DbUser>(query, values);
    return result.rows[0] || null;
  }

  // Verificar salud de la conexión
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query<{ health: number }>('SELECT 1 as health');
      return result.rows[0]?.health === 1;
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return false;
    }
  }
}