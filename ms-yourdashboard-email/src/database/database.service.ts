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

  // Ejecutar queries SQL puro
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
    tokenExpiresAt?: string;
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
    
    const values = [
      userData.googleId,
      userData.email,
      userData.name,
      userData.accessToken,
      userData.refreshToken || null,
      userData.tokenExpiresAt || null,
    ];

    const result = await this.query(query, values);
    return result.rows[0];
  }

  // Guardar email
  async saveEmail(emailData: {
    userId: string;
    messageId: string;
    subject: string;
    fromEmail: string;
    fromName?: string;
    toEmails: string[];
    bodyText?: string;
    bodyHtml?: string;
    receivedDate: Date;
    isRead: boolean;
    hasAttachments: boolean;
  }) {
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

    const result = await this.query(query, values);
    return result.rows[0];
  }
}