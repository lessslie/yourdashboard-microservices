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
  ) { }

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

      if (!phoneNumberId) {
        console.warn('Falta phone_number_id en el webhook');
        return res.sendStatus(200);
      }

      // Buscar cuenta vinculada previamente
      const cuenta = await this.whatsappAccountsService.findByPhoneNumberId(phoneNumberId);

      if (!cuenta) {
        console.warn(
          `No existe cuenta vinculada para phone_number_id: ${phoneNumberId}`,
        );
        return res.sendStatus(200);
      }

      if (messages?.length && contacts?.length) {
        const message = messages[0] as { from: string; text?: { body: string }; timestamp: string };
        const contact = contacts[0] as { profile?: { name?: string } };

        const from: string = message.from;
        const msgBody: string = message.text?.body || '';
        const timestamp: number = Number(message.timestamp) * 1000;
        const name: string | null = contact.profile?.name || null;

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
          'whatsapp',
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

      // 1️⃣ Buscar la cuenta
      const cuenta = await this.whatsappAccountsService.findById(cuentaId);
      if (!cuenta) {
        console.warn(`No se encontró cuenta para cuentaId: ${cuentaId}`);
        return res.status(404).json({ error: 'Cuenta no encontrada' });
      }

      // 2️⃣ Enviar el mensaje por WhatsApp
      const response = await this.whatsappService.sendMessageWithCuenta(
        cuenta,
        to,
        message,
      );

      // 3️⃣ Buscar el último mensaje no respondido de ese número y cuenta
      const mensajes = await this.conversationsService.getMessageByIdAndAccount(
        (await this.conversationsService.getRecentConversationsByAccount(cuenta.id))
          .find(conv => conv.phone === to)?.conversation_id || ''
      );

      if (mensajes && mensajes.length > 0) {
        // Tomamos el último mensaje no respondido
        const ultimoNoRespondido = mensajes
          .filter(msg => !msg.respondido)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

        if (ultimoNoRespondido) {
          await this.conversationsService.markMessageAsResponded(ultimoNoRespondido.message_id);
        }
      }

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
      const cuenta = await this.whatsappAccountsService.createAccount(body);
      return res.status(201).json(cuenta);
    } catch (error) {
      console.error('Error creando cuenta:', error);
      return res.status(500).json({ error: 'No se pudo crear la cuenta' });
    }
  }

  @Post('/cuentas/vincular')
  async vincularCuenta(
    @Body() body: Partial<CreateAccountDTO>,
    @Res() res: Response,
  ) {
    try {
      if (!body.usuario_principal_id || !body.phone || !body.phone_number_id) {
        return res.status(400).json({
          error:
            'Faltan parámetros obligatorios: usuario_principal_id, phone, phone_number_id',
        });
      }

      let cuenta = await this.whatsappAccountsService.findByPhoneNumberId(
        body.phone_number_id,
      );

      if (!cuenta) {
        cuenta = await this.whatsappAccountsService.createAccount({
          usuario_principal_id: body.usuario_principal_id,
          phone: body.phone,
          nombre_cuenta: body.nombre_cuenta || `Cuenta ${body.phone}`,
          token: body.token || process.env.WHATSAPP_TOKEN || '',
          alias_personalizado: body.alias_personalizado || null,
          phone_number_id: body.phone_number_id,
        });
      } else {
        cuenta = await this.whatsappAccountsService.updateAccount(cuenta.id, {
          usuario_principal_id: body.usuario_principal_id,
        });
      }

      return res.status(201).json(cuenta);
    } catch (error) {
      console.error('Error vinculando cuenta:', error);
      return res.status(500).json({ error: 'No se pudo vincular la cuenta' });
    }
  }

  @Post('/cuentas/vincular-por-numero')
  async vincularPorNumero(
    @Body()
    body: { usuario_principal_id: number; phone: string; token?: string },
    @Res() res: Response,
  ) {
    try {
      const { usuario_principal_id, phone, token } = body;

      if (!usuario_principal_id || !phone) {
        return res.status(400).json({
          error: 'Faltan parámetros: usuario_principal_id o phone',
        });
      }

      const phone_number_id =
        await this.whatsappAccountsService.getPhoneNumberIdFromMeta(
          phone,
          token || process.env.WHATSAPP_TOKEN || '',
        );

      let cuenta =
        await this.whatsappAccountsService.findByPhoneNumberId(phone_number_id);

      if (!cuenta) {
        cuenta = await this.whatsappAccountsService.createAccount({
          usuario_principal_id,
          phone,
          nombre_cuenta: `Cuenta ${phone}`,
          token: token || process.env.WHATSAPP_TOKEN || '',
          alias_personalizado: null,
          phone_number_id,
        });
      } else {
        cuenta = await this.whatsappAccountsService.updateAccount(cuenta.id, {
          usuario_principal_id,
        });
      }

      return res.status(201).json(cuenta);
    } catch (error) {
      console.error('Error vinculando cuenta por número:', error);
      return res
        .status(500)
        .json({ error: 'No se pudo vincular la cuenta por número' });
    }
  }

  @Put('/cuentas/:id')
  async updateAccount(
    @Param('id') id: string,
    @Body() body: Partial<CreateAccountDTO>,
    @Res() res: Response,
  ) {
    try {
      const cuenta = await this.whatsappAccountsService.updateAccount(id, body);

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

