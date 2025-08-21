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
    if (!dbUrl) throw new Error('DATABASE_URL is not defined in .env');

    this.pool = new Pool({ connectionString: dbUrl });
  }

  async findAll(): Promise<any[]> {
    const result = await this.pool.query('SELECT * FROM whatsapp_accounts');
    return result.rows;
  }

  async findByPhoneNumberId(phoneNumberId: string): Promise<any> {
    const result = await this.pool.query(
      'SELECT * FROM whatsapp_accounts WHERE phone_number_id = $1',
      [phoneNumberId],
    );
    return result.rows?.[0] || null;
  }

  async findById(id: string): Promise<any> {
    const result = await this.pool.query(
      'SELECT * FROM whatsapp_accounts WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
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
    id: string,
    update: Partial<CreateAccountDTO>,
  ): Promise<any> {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    for (const key in update) {
      if (Object.prototype.hasOwnProperty.call(update, key)) {
        fields.push(`${key} = $${i}`);
        values.push((update as any)[key]);
        i++;
      }
    }

    if (fields.length === 0) return null;

    values.push(id);
    const query = `UPDATE whatsapp_accounts SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`;
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async updateTokenAccount(
    id: string,
    newToken: string,
    expiresInSeconds?: number, // opcional
  ): Promise<any> {
    let query: string;
    let values: any[];

    if (typeof expiresInSeconds === 'number') {
      query = `
        UPDATE whatsapp_accounts
        SET token = $1,
            token_updated_at = NOW(),
            token_expires_at = NOW() + ($2 || ' seconds')::interval
        WHERE id = $3
        RETURNING *`;
      values = [newToken, String(expiresInSeconds), id];
    } else {
      query = `
        UPDATE whatsapp_accounts
        SET token = $1,
            token_updated_at = NOW()
        WHERE id = $2
        RETURNING *`;
      values = [newToken, id];
    }

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  private isDate(value: any): value is Date {
    return value instanceof Date && !isNaN(value.getTime());
  }

  /** Devuelve true si faltan <= daysThreshold días para expirar o ya expiró. */
  shouldRefresh(account: any, daysThreshold = 7): boolean {
    const expiresAtRaw = account.token_expires_at;
    if (!expiresAtRaw) {
      // Si no tenemos expiración guardada, conviene refrescar para obtenerla.
      return true;
    }
    const expiresAt =
      this.isDate(expiresAtRaw) ? expiresAtRaw : new Date(expiresAtRaw);
    const now = new Date();
    const msLeft = expiresAt.getTime() - now.getTime();
    const daysLeft = msLeft / (1000 * 60 * 60 * 24);
    return daysLeft <= daysThreshold;
  }

  // 🔹 Renueva un token (siempre que el token anterior aún sea válido o sea long-lived no vencido).
  async refreshToken(id: string): Promise<any> {
    const cuenta = await this.findById(id);
    if (!cuenta) throw new Error(`Cuenta con ID ${id} no encontrada`);

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
        fb_exchange_token: cuenta.token, // token actual
      };

      const { data } = await axios.get(url, { params });
      // Meta suele devolver: access_token, token_type, expires_in
      const newToken: string = data.access_token;
      const expiresIn: number | undefined = data.expires_in;

      if (!newToken) throw new Error('No se recibió un nuevo token de Meta');

      const updated = await this.updateTokenAccount(id, newToken, expiresIn);
      return updated;
    } catch (error: any) {
      throw new Error(
        `Error refrescando token de cuenta ${id}: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }

  /** Refresca todas las cuentas que “conviene” refrescar (faltan <= 7 días o sin fecha de expiración). */
  async refreshAllDueTokens(daysThreshold = 7): Promise<{
    refreshed: string[];
    skipped: string[];
    errors: Record<string, string>;
  }> {
    const refreshed: string[] = [];
    const skipped: string[] = [];
    const errors: Record<string, string> = {};

    const accounts = await this.findAll();
    for (const acc of accounts) {
      try {
        if (this.shouldRefresh(acc, daysThreshold)) {
          await this.refreshToken(acc.id);
          refreshed.push(acc.id);
        } else {
          skipped.push(acc.id);
        }
      } catch (err: any) {
        errors[acc.id] = err.message || String(err);
      }
    }

    return { refreshed, skipped, errors };
  }
}