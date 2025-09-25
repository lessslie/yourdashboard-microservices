import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { clasificarTiempo } from '../../utils/semaforo';
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

  // 🔥 Insertar un mensaje recibido (por defecto respondido = false)
  async insertMessage(
    conversationId: string,
    from: string,
    message: string,
    date: Date,
    whatsappAccountId: string,
    canal: 'whatsapp',
  ) {
    try {
      if (from === 'empresa') {
        // 🔎 Buscar el último mensaje entrante sin responder
        const pending = await this.pool.query(
          `SELECT id, timestamp 
         FROM messages
         WHERE conversation_id = $1
           AND respondido = false
           AND canal = $2
         ORDER BY timestamp DESC
         LIMIT 1`,
          [conversationId, canal],
        );

        if (pending.rows.length > 0) {
          const msg = pending.rows[0];
          //Calcular la categoría al momento de responder
          const categoria = clasificarTiempo(canal, new Date(msg.timestamp), date);

          // ✅ Marcar como respondido con categoría fija
          await this.pool.query(
            `UPDATE messages
           SET respondido = true, categoria = $1
           WHERE id = $2`,
            [categoria, msg.id],
          );
        }
      }

      // 📥 Insertar SIEMPRE el nuevo mensaje (cliente o empresa)
      await this.pool.query(
        `INSERT INTO messages (conversation_id, phone, message, timestamp, whatsapp_account_id, canal, respondido, categoria)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          conversationId,
          from,
          message,
          date,
          whatsappAccountId,
          canal,
          from === 'empresa', // los mensajes de la empresa ya van como respondidos
          null, // categoria: solo se fija en el mensaje entrante
        ],
      );
    } catch (error) {
      console.error('Error insertando mensaje:', error);
      throw error;
    }
  }

  // 🔥 Marcar un mensaje como respondido
  async markMessageAsResponded(messageId: string) {
    try {
      await this.pool.query(
        `UPDATE messages SET respondido = true WHERE id = $1`,
        [messageId],
      );
    } catch (error) {
      console.error('Error marcando mensaje respondido:', error);
      throw error;
    }
  }

  // ✅ Traer mensajes de una conversación y recalcular categoría en base a tiempo sin respuesta
  async getMessageByIdAndAccount(conversationId: string, whatsappAccountId?: string) {
    let query = `
    SELECT 
      m.id AS message_id,
      m.message,
      m.timestamp,
      m.conversation_id,
      m.respondido,
      m.canal,
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

    const now = new Date();
    result.rows.forEach((msg) => {
      if (!msg.respondido) {
        msg.categoria = clasificarTiempo(msg.canal, new Date(msg.timestamp), now);
      } else {
        msg.categoria = 'verde'; // si está respondido, lo dejamos en verde fijo
      }
    });

    return result.rows;
  }

  // ✅ Conversaciones recientes
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

  // ✅ Búsqueda: incluye categoría recalculada
  async searchMessagesByAccount(queryText: string, whatsappAccountId?: string) {
    let query = `
    SELECT 
      m.id AS message_id,
      m.message,
      m.timestamp,
      m.respondido,
      m.canal,
      c.id AS conversation_id,
      c.name,
      c.phone,
      c.whatsapp_account_id
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

    const now = new Date();
    result.rows.forEach((msg) => {
      if (!msg.respondido) {
        msg.categoria = clasificarTiempo(msg.canal, new Date(msg.timestamp), now);
      } else {
        msg.categoria = 'verde';
      }
    });

    return result.rows;
  }
}


