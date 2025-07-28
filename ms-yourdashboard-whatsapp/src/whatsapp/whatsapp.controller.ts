import { Controller, Post, Body, Res, Query, Get } from '@nestjs/common';
import { Response } from 'express';
import { ConversationsService } from 'src/controlador-conversaciones/conversations/conversations.service';
import { WhatsAppWebhookPayload } from './whatsapp-webhook.dto';
import { MessagesGateway } from 'src/messages/messages.gateway';
import { WhatsappService } from './whatsapp.service';

@Controller('webhook')
export class WebhookController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly gateway: MessagesGateway, 
    private readonly whatsappService: WhatsappService,
  ) { }

  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const VERIFY_TOKEN = 'mi_token_123';  // El token de configuracion de la plataforma

    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verificado!');
        return res.status(200).send(challenge);  // Respondemos con el challenge para validar
      } else {
        return res.sendStatus(403);
      }
    }
    return res.sendStatus(400);
  }

  @Post()
  async receiveMessage(
    @Body() body: WhatsAppWebhookPayload,
    @Res() res: Response,
  ) {
    try {
      console.log('Webhook payload:', JSON.stringify(body, null, 2));

      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;

      const messages = value?.messages;
      const contacts = value?.contacts;

      if (messages?.length && contacts?.length) {
        const message = messages[0];
        const contact = contacts[0];

        const from = message.from;
        const msgBody = message.text?.body || '';
        const timestamp = Number(message.timestamp) * 1000; // timestamp en milisegundos
        const name = contact.profile?.name || null;

        console.log(`Mensaje de ${from}: ${msgBody}`);

        // 👇 Guardar en la base de datos
        const conversationId = await this.conversationsService.upsertConversation(
          from,
          name,
          msgBody,
          new Date(timestamp),
        );

        await this.conversationsService.insertMessage(
          conversationId,
          from,
          msgBody,
          new Date(timestamp),
        );

        this.gateway.emitNewMessage({
          from,
          message: msgBody,
          timestamp: new Date(timestamp).toISOString(),
          name: contact.profile?.name || 'Sin nombre',
        });
      }

      return res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      console.error('Error procesando mensaje:', error);
      return res.sendStatus(500);
    }
  }

  @Post('/send')
  async sendMessage(
    @Body() body: { to: string; message: string },
    @Res() res: Response,
  ) {
    try {
      const { to, message } = body;
      if (!to || !message) {
        return res.status(400).json({ error: 'Faltan parámetros' });
      }
      const response = await this.whatsappService.sendMessage(to, message);
      return res.status(200).json(response);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      return res.status(500).json({ error: 'No se pudo enviar el mensaje' });
    }
  }
}