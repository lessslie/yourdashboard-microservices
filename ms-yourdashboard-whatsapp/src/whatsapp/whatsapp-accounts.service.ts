import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

interface CreateAccountDTO {
  usuario_principal_id: number;
  phone: string;
  nombre_cuenta: string;
  token: string;
  alias_personalizado?: string | null;
  phone_number_id: string;
}

@Injectable()
export class WhatsappAccountsService {
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

  async findByPhoneNumberId(phoneNumberId: string): Promise<any> {
    const query = 'SELECT * FROM whatsapp_accounts WHERE phone_number_id = $1';
    const values = [phoneNumberId];
    const result = await this.pool.query(query, values);
    return result.rows?.[0] || null;
  }

  async findById(id: string): Promise<any> {
    const result = await this.pool.query(
      'SELECT * FROM whatsapp_accounts WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async findAll(): Promise<any[]> {
    const result = await this.pool.query('SELECT * FROM whatsapp_accounts');
    return result.rows;
  }

  async createAccount(data: CreateAccountDTO): Promise<any> {
    const query = `
      INSERT INTO whatsapp_accounts 
      (usuario_principal_id, phone, nombre_cuenta, token, alias_personalizado, phone_number_id) 
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
    const values = [
      data.usuario_principal_id,
      data.phone,
      data.nombre_cuenta,
      data.token,
      data.alias_personalizado || null,
      data.phone_number_id,
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async updateAccount(
    id: number,
    update: Partial<CreateAccountDTO>,
  ): Promise<any> {
    const fields: string[] = [];
    const values: (string | number | boolean | null)[] = [];

    let i = 1;
    for (const key in update) {
      if (Object.prototype.hasOwnProperty.call(update, key)) {
        fields.push(`${key} = $${i}`);
        values.push(update[key as keyof CreateAccountDTO]!);
        i++;
      }
    }

    if (fields.length === 0) return null;

    values.push(id);
    const query = `UPDATE whatsapp_accounts SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`;
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async updateTokenAccount(id: string, newToken: string): Promise<any> {
    const query = `UPDATE whatsapp_accounts SET token = $1 WHERE id = $2 RETURNING *`;
    const values = [newToken, id];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  // 🔹 Nuevo método para refrescar token
  async refreshToken(id: string): Promise<any> {
    const cuenta = await this.findById(id); // findById ahora recibe string
    if (!cuenta) {
      throw new Error(`Cuenta con ID ${id} no encontrada`);
    }

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
      throw new Error('META_APP_ID o META_APP_SECRET no definidos en .env');
    }

    try {
      const url = `https://graph.facebook.com/v19.0/oauth/access_token`;
      const params = {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: cuenta.token,
      };

      const { data } = await axios.get(url, { params });

      if (!data.access_token) {
        throw new Error('No se recibió un nuevo token de Meta');
      }

      const updated = await this.updateTokenAccount(id, data.access_token);
      return updated;
    } catch (error) {
      throw new Error(
        `Error refrescando token de cuenta ${id}: ${error.response?.data?.error?.message || error.message}`,
      );
    }
  }
}
