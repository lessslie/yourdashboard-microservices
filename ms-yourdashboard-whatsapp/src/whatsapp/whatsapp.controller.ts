import {
  Controller,
  Post,
  Body,
  Res,
  Query,
  Get,
  Put,
  Param,
} from '@nestjs/common';
import { Response } from 'express';
import { ConversationsService } from 'src/controlador-conversaciones/conversations/conversations.service';
import { WhatsAppWebhookPayload } from './whatsapp-webhook.dto';
import { MessagesGateway } from 'src/messages/messages.gateway';
import { WhatsappService } from './whatsapp.service';
import { WhatsappAccountsService } from './whatsapp-accounts.service';

interface CreateAccountDTO {
  usuario_principal_id: number;
  phone: string;
  nombre_cuenta: string;
  token: string;
  alias_personalizado?: string | null;
  phone_number_id: string;
}

@Controller('webhook')
export class WebhookController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly gateway: MessagesGateway,
    private readonly whatsappService: WhatsappService,
    private readonly whatsappAccountsService: WhatsappAccountsService,
  ) {}

  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const VERIFY_TOKEN = 'mi_token_123';

    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verificado!');
        return res.status(200).send(challenge);
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
      console.log('--- WEBHOOK RECIBIDO ---');
      console.log('Payload completo:', JSON.stringify(body, null, 2));

      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;

      const messages = value?.messages;
      const contacts = value?.contacts;
      const phoneNumberId = value?.metadata?.phone_number_id;
      const displayPhoneNumber = value?.metadata?.display_phone_number;

      if (!phoneNumberId) {
        console.warn('Falta phone_number_id en el webhook');
        return res.sendStatus(200);
      }

      // hardcodeamos el usuario, pero en un principio seria el access token
      const usuarioPrincipalId = 1;

      let cuenta =
        await this.whatsappAccountsService.findByPhoneNumberId(phoneNumberId);

      if (!cuenta) {
        console.log(
          'No existe cuenta, insertando nueva cuenta en whatsapp_accounts',
        );
        cuenta = await this.whatsappAccountsService.createAccount({
          usuario_principal_id: usuarioPrincipalId,
          phone: displayPhoneNumber,
          nombre_cuenta: `Cuenta ${displayPhoneNumber}`,
          token: process.env.WHATSAPP_TOKEN || '',
          alias_personalizado: null,
          phone_number_id: phoneNumberId,
        });
      } else {
        console.log('Cuenta encontrada en whatsapp_accounts');
      }

      if (messages?.length && contacts?.length) {
        const message = messages[0];
        const contact = contacts[0];

        const from = message.from;
        const msgBody = message.text?.body || '';
        const timestamp = Number(message.timestamp) * 1000;
        const name = contact.profile?.name || null;

        console.log(`Mensaje de ${from}: ${msgBody}`);

        const conversationId =
          await this.conversationsService.upsertConversation(
            from,
            name,
            msgBody,
            new Date(timestamp),
            cuenta.id,
          );

        await this.conversationsService.insertMessage(
          conversationId,
          from,
          msgBody,
          new Date(timestamp),
          cuenta.id,
        );

        this.gateway.emitNewMessage({
          from,
          message: msgBody,
          timestamp: new Date(timestamp).toISOString(),
          name: name || 'Sin nombre',
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
    @Body() body: { to: string; message: string; cuentaId: string },
    @Res() res: Response,
  ) {
    try {
      const { to, message, cuentaId } = body;

      if (!to || !message || !cuentaId) {
        return res
          .status(400)
          .json({ error: 'Faltan parámetros: to, message o cuentaId' });
      }

      console.log(
        `Enviando mensaje a ${to} desde la cuenta ${cuentaId}: "${message}"`,
      );

      const cuenta = await this.whatsappAccountsService.findById(cuentaId);

      if (!cuenta) {
        console.warn(`No se encontró cuenta para cuentaId: ${cuentaId}`);
        return res.status(404).json({ error: 'Cuenta no encontrada' });
      }

      const response = await this.whatsappService.sendMessageWithCuenta(
        cuenta,
        to,
        message,
      );

      console.log('Mensaje enviado correctamente:', response);

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      return res.status(500).json({ error: 'No se pudo enviar el mensaje' });
    }
  }

  @Get('/cuentas')
  async getAllAccounts(@Res() res: Response) {
    try {
      const cuentas = await this.whatsappAccountsService.findAll();
      return res.status(200).json(cuentas);
    } catch (error) {
      console.error('Error obteniendo cuentas:', error);
      return res.status(500).json({ error: 'Error obteniendo cuentas' });
    }
  }

  @Post('/cuentas')
  async createAccount(@Body() body: CreateAccountDTO, @Res() res: Response) {
    try {
      console.log('Body recibido en /cuentas:', body); // <-- Agregá esto

      const cuenta = await this.whatsappAccountsService.createAccount(body);
      return res.status(201).json(cuenta);
    } catch (error) {
      console.error('Error creando cuenta:', error);
      return res.status(500).json({ error: 'No se pudo crear la cuenta' });
    }
  }

  @Put('/cuentas/:id')
  async updateAccount(
    @Param('id') id: string,
    @Body() body: Partial<CreateAccountDTO>,
    @Res() res: Response,
  ) {
    try {
      const cuenta = await this.whatsappAccountsService.updateAccount(
        Number(id),
        body,
      );

      if (!cuenta) {
        return res
          .status(404)
          .json({ error: 'Cuenta no encontrada o sin cambios' });
      }

      return res.status(200).json(cuenta);
    } catch (error) {
      console.error('Error actualizando cuenta:', error);
      return res.status(500).json({ error: 'No se pudo actualizar la cuenta' });
    }
  }

  @Get('refresh-token/:id')
  async refresh(@Param('id') id: string) {
    return this.whatsappAccountsService.refreshToken(id);
  }
}
