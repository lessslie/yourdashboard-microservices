import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class ConversationsService {
  private pool: Pool;

  constructor() {
    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
      throw new Error('DATABASE_URL is not defined in .env');
    }

    this.pool = new Pool({
      connectionString: dbUrl,
    });
  }

  async upsertConversation(
    phone: string,
    name: string | null,
    message: string,
    date: Date,
    whatsappAccountId: string,
  ): Promise<string> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const res = await client.query(
        'SELECT id FROM conversations WHERE phone = $1 AND whatsapp_account_id = $2',
        [phone, whatsappAccountId],
      );

      let conversationId: string;
      if (res.rows.length > 0) {
        conversationId = res.rows[0].id;
        await client.query(
          `UPDATE conversations 
         SET last_message = $1, last_message_date = $2, name = COALESCE($3, name) 
         WHERE id = $4`,
          [message, date, name, conversationId],
        );
      } else {
        const insertRes = await client.query(
          `INSERT INTO conversations (phone, name, last_message, last_message_date, whatsapp_account_id) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [phone, name, message, date, whatsappAccountId],
        );
        conversationId = insertRes.rows[0].id;
      }

      await client.query('COMMIT');
      return conversationId;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en upsertConversation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async insertMessage(
    conversationId: string,
    from: string,
    message: string,
    date: Date,
    whatsappAccountId: string,
  ) {
    try {
      await this.pool.query(
        `INSERT INTO messages (conversation_id, phone, message, timestamp, whatsapp_account_id)
       VALUES ($1, $2, $3, $4, $5)`,
        [conversationId, from, message, date, whatsappAccountId],
      );
    } catch (error) {
      console.error('Error insertando mensaje:', error);
      throw error;
    }
  }


  async getRecentConversations() {
    const result = await this.pool.query(`
      SELECT id, phone, name, last_message, last_message_date
      FROM conversations
      ORDER BY last_message_date DESC
      LIMIT 50
    `);
    return result.rows;
  }

  async getMessageById(conversationId: string) {
    const result = await this.pool.query(
      ` SELECT messages.*, conversations.name
        FROM messages
        JOIN conversations ON messages.conversation_id = conversations.id
        WHERE messages.conversation_id = $1
        ORDER BY messages.timestamp ASC
      `,
      [conversationId],
    );
    return result.rows;
  }

  async searchMessages(query: string) {
    const result = await this.pool.query(
      `SELECT DISTINCT ON (conversations.id)
        conversations.id AS conversation_id,
        conversations.name,
        conversations.phone,
        conversations.last_message,
        conversations.last_message_date
     FROM conversations
     LEFT JOIN messages ON messages.conversation_id = conversations.id
     WHERE
       messages.message ILIKE '%' || $1 || '%' OR
       conversations.name ILIKE '%' || $1 || '%' OR
       conversations.phone ILIKE '%' || $1 || '%'
     ORDER BY conversations.id, messages.timestamp DESC
    `,
      [query],
    );
    return result.rows;
  }

  async getRecentConversationsByAccount(whatsappAccountId: string) {
    const result = await this.pool.query(`
    SELECT id, phone, name, last_message, last_message_date
    FROM conversations
    WHERE whatsapp_account_id = $1
    ORDER BY last_message_date DESC
    LIMIT 50
  `, [whatsappAccountId]);
    return result.rows;
  }

  async getMessageByIdAndAccount(conversationId: string, whatsappAccountId?: string) {
    let query = `
    SELECT messages.*, conversations.name
    FROM messages
    JOIN conversations ON messages.conversation_id = conversations.id
    WHERE messages.conversation_id = $1
  `;
    const params = [conversationId];

    if (whatsappAccountId) {
      query += ' AND messages.whatsapp_account_id = $2';
      params.push(whatsappAccountId);
    }

    query += ' ORDER BY messages.timestamp ASC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async searchMessagesByAccount(queryText: string, whatsappAccountId?: string) {
    let query = `
    SELECT DISTINCT ON (conversations.id)
      conversations.id AS conversation_id,
      conversations.name,
      conversations.phone,
      conversations.last_message,
      conversations.last_message_date
    FROM conversations
    LEFT JOIN messages ON messages.conversation_id = conversations.id
    WHERE
      (messages.message ILIKE '%' || $1 || '%' OR
       conversations.name ILIKE '%' || $1 || '%' OR
       conversations.phone ILIKE '%' || $1 || '%')
  `;

    const params = [queryText];

    if (whatsappAccountId) {
      query += ' AND conversations.whatsapp_account_id = $2';
      params.push(whatsappAccountId);
    }

    query += `
    ORDER BY conversations.id, messages.timestamp DESC
  `;

    const result = await this.pool.query(query, params);
    return result.rows;
  }
}

