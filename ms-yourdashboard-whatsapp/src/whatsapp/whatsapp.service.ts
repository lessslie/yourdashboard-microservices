import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class WhatsappService {
  private token = process.env.WHATSAPP_TOKEN;
  private phoneId = process.env.WHATSAPP_PHONE_ID;

  async sendMessage(to: string, message: string): Promise<any> {
  const url = `https://graph.facebook.com/v19.0/${this.phoneId}/messages`;

  const headers = {
    Authorization: `Bearer ${this.token}`,
    'Content-Type': 'application/json',
  };

  const data = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'text',
    text: { body: message },
  };

  try {
    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error(
        'Error enviando mensaje:',
        error.response?.data || error.message,
      );
    } else if (error instanceof Error) {
      console.error('Error inesperado:', error.message);
    } else {
      console.error('Error inesperado:', error);
    }
    throw new Error('No se pudo enviar el mensaje');
  }
}
}
