import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class WhatsappService {
  async sendMessageWithCuenta(
    cuenta: { phone_number_id: string; token: string },
    to: string,
    message: string,
  ): Promise<any> {
    const url = `https://graph.facebook.com/v19.0/${cuenta.phone_number_id}/messages`;

    const headers = {
      Authorization: `Bearer ${cuenta.token}`,
      'Content-Type': 'application/json',
    };

    const data = {
      messaging_product: 'whatsapp',
      to,
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
