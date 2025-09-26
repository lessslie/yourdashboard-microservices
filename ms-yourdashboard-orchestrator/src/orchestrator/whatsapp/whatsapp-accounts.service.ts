import { Injectable, HttpException } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export interface CreateAccountDTO {
  usuario_principal_id: number;
  phone: string;
  nombre_cuenta: string;
  token: string;
  alias_personalizado?: string | null;
  phone_number_id: string;
}

export class SendMessageDTO {
  @ApiProperty({ description: 'Número de destino' })
  @IsString()
  to: string;

  @ApiProperty({ description: 'Mensaje a enviar' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'ID de la cuenta de WhatsApp' })
  @IsString()
  cuentaId: string;
}

@Injectable()
export class WhatsappAccountsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.MS_WHATSAPP_URL || 'http://localhost:3004';
  }

  // ---------------------
  // Helper para requests
  // ---------------------
  private async request(
    method: 'get' | 'post' | 'patch' | 'put' | 'delete',
    path: string,
    data?: any,
    config?: AxiosRequestConfig,
  ) {
    try {
      const url = `${this.baseUrl}${path}`;
      const res = await axios({ method, url, data, ...config });
      return res.data;
    } catch (error: any) {
      const status = error?.response?.status || 500;
      const message =
        error?.response?.data || error?.message || 'Unknown error';
      throw new HttpException(message, status);
    }
  }

  // ---------------------
  // Cuentas
  // ---------------------
  async findAll(): Promise<any[]> {
    return this.request('get', `/webhook/cuentas`);
  }

  async createAccount(payload: CreateAccountDTO): Promise<any> {
    return this.request('post', `/webhook/cuentas`, payload);
  }

  async updateAccount(
    id: string,
    payload: Partial<CreateAccountDTO>,
  ): Promise<any> {
    return this.request(
      'put',
      `/webhook/cuentas/${encodeURIComponent(id)}`,
      payload,
    );
  }

  async vincularCuenta(payload: {
    usuario_principal_id: number;
    phone: string;
    phone_number_id: string;
  }): Promise<any> {
    return this.request('post', `/webhook/cuentas/vincular`, payload);
  }

  async vincularCuentaPorNumero(payload: {
    usuario_principal_id: number;
    phone: string;
    nombre_cuenta: string;
    token: string;
  }): Promise<any> {
    return this.request(
      'post',
      `/webhook/cuentas/vincular-por-numero`,
      payload,
    );
  }

  async refreshToken(id: string): Promise<any> {
    return this.request(
      'get',
      `/webhook/refresh-token/${encodeURIComponent(id)}`,
    );
  }

  // ---------------------
  // Mensajes
  // ---------------------
  async sendMessage(payload: {
    to: string;
    message: string;
    cuentaId: string;
  }): Promise<any> {
    return this.request('post', `/webhook/send`, payload);
  }

  // ---------------------
  // Conversaciones
  // ---------------------
  async getConversations(whatsappAccountId?: string): Promise<any[]> {
    const query = whatsappAccountId
      ? `?whatsappAccountId=${encodeURIComponent(whatsappAccountId)}`
      : '';
    return this.request('get', `/conversations${query}`);
  }

  async getMessages(
    conversationId: string,
    whatsappAccountId?: string,
  ): Promise<any[]> {
    let query = `?conversationId=${encodeURIComponent(conversationId)}`;
    if (whatsappAccountId) {
      query += `&whatsappAccountId=${encodeURIComponent(whatsappAccountId)}`;
    }
    return this.request('get', `/messages${query}`);
  }

  async searchMessages(q: string, whatsappAccountId?: string): Promise<any[]> {
    let query = `?q=${encodeURIComponent(q)}`;
    if (whatsappAccountId) {
      query += `&whatsappAccountId=${encodeURIComponent(whatsappAccountId)}`;
    }
    return this.request('get', `/search${query}`);
  }
}
