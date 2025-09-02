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

  // ✅ Obtener todas las conversaciones, filtradas por cuenta opcionalmente
  async getRecentConversationsByAccount(whatsappAccountId: string) {
    const query = `
    SELECT 
      c.id AS conversation_id,
      c.name,
      c.phone,
      c.last_message,
      c.last_message_date,
      c.whatsapp_account_id
    FROM conversations c
    WHERE c.whatsapp_account_id = $1
    ORDER BY c.last_message_date DESC
  `;
    const result = await this.pool.query(query, [whatsappAccountId]);
    return result.rows;
  }

  async getRecentConversations() {
    const query = `
    SELECT 
      c.id AS conversation_id,
      c.name,
      c.phone,
      c.last_message,
      c.last_message_date,
      c.whatsapp_account_id
    FROM conversations c
    ORDER BY c.whatsapp_account_id, c.last_message_date DESC
  `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  // ✅ Obtener mensajes de una conversación
  async getMessageByIdAndAccount(conversationId: string, whatsappAccountId?: string) {
    let query = `
    SELECT 
      m.id AS message_id,
      m.message,
      m.timestamp,
      m.conversation_id,
      c.whatsapp_account_id
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.conversation_id = $1
  `;
    const params: any[] = [conversationId];

    if (whatsappAccountId) {
      query += ' AND c.whatsapp_account_id = $2';
      params.push(whatsappAccountId);
    }

    query += ' ORDER BY m.timestamp ASC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // ✅ Búsqueda: ahora devuelve el mensaje que coincide (no solo el último)
  async searchMessagesByAccount(queryText: string, whatsappAccountId?: string) {
    let query = `
    SELECT 
      c.id AS conversation_id,
      c.name,
      c.phone,
      c.last_message,
      c.last_message_date,
      c.whatsapp_account_id,
      m.id AS matched_message_id,
      m.message AS matched_message,
      m.timestamp AS matched_timestamp
    FROM conversations c
    JOIN messages m ON m.conversation_id = c.id
    WHERE m.message ILIKE '%' || $1 || '%'
  `;

    const params: any[] = [queryText];

    if (whatsappAccountId) {
      query += ' AND c.whatsapp_account_id = $2';
      params.push(whatsappAccountId);
    }

    query += ' ORDER BY c.whatsapp_account_id, m.timestamp DESC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }
}

