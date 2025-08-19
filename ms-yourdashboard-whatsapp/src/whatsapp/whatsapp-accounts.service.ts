import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
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
}
