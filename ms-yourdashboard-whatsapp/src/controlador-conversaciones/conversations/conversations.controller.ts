import { Controller, Get, Res, Query } from '@nestjs/common';
import { Response } from 'express';
import { ConversationsService } from './conversations.service';

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

@Controller()
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get('/conversations')
  async getConversations(
    @Query('whatsappAccountId') whatsappAccountId: string,
    @Res() res: Response,
  ) {
    try {
      let conversations;
      if (whatsappAccountId) {
        conversations = await this.conversationsService.getRecentConversationsByAccount(whatsappAccountId);
      } else {
        conversations = await this.conversationsService.getRecentConversations();
      }
      return res.status(200).json(conversations);
    } catch (error) {
      console.error('Error obteniendo conversaciones:', error);
      return res.sendStatus(500);
    }
  }

  @Get('/messages')
  async getConversationById(
    @Query('conversationId') conversationId: string,
    @Query('whatsappAccountId') whatsappAccountId: string,
    @Res() res: Response,
  ) {
    if (!conversationId) {
      return res.status(400).json({ error: 'Falta el parámetro de conversationId' });
    }

    if (!isValidUUID(conversationId)) {
      return res.status(400).json({ error: 'El conversationId no es un UUID válido' });
    }

    try {
      const messages = await this.conversationsService.getMessageByIdAndAccount(conversationId, whatsappAccountId);

      if (!messages || messages.length === 0) {
        return res.status(404).json({ message: 'No se encontraron mensajes para esa conversación.' });
      }

      return res.status(200).json(messages);
    } catch (error) {
      console.error('Error obteniendo mensajes:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  @Get('/search')
  async getConversationsSearched(
    @Query('q') contentMessage: string,
    @Query('whatsappAccountId') whatsappAccountId: string,
    @Res() res: Response,
  ) {
    if (!contentMessage || contentMessage.trim() === '') {
      return res.status(400).json({ error: 'Falta el parámetro de búsqueda' });
    }

    try {
      const result = await this.conversationsService.searchMessagesByAccount(contentMessage, whatsappAccountId);

      if (!result || result.length === 0) {
        return res.status(404).json({ message: 'No se encontraron conversaciones que coincidan con la búsqueda.' });
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error obteniendo mensajes:', error);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }
}


