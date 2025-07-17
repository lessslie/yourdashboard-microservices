import { Controller, Get, Res, Query } from '@nestjs/common';
import { Response } from 'express';
import { ConversationsService } from './conversations.service';

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

@Controller()
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) { }

  @Get('/conversations')
  async getConversations(@Res() res: Response) {
    try {
      const conversations = await this.conversationsService.getRecentConversations();
      return res.status(200).json(conversations);
    } catch (error) {
      console.error('Error obteniendo conversaciones:', error);
      return res.sendStatus(500);
    }
  }


  @Get('/messages')
  async getConversationById(
    @Query('conversationId') conversationId: string,
    @Res() res: Response,
  ) {
    if (!conversationId) {
      return res.status(400).json({ error: 'Falta el parámetro de conversationId' });
    }

    // Validar que sea un UUID
    if (!isValidUUID(conversationId)) {
      return res.status(400).json({ error: 'El conversationId no es un UUID válido' });
    }

    try {
      const messages = await this.conversationsService.getMessageById(conversationId);

      if (!messages || messages.length === 0) {
        return res.status(404).json({ message: 'No se encontraron mensajes para esa conversación.' });
      }

      return res.status(200).json(messages);
    } catch (error) {
      console.error('Error obteniendo mensajes:', error);
      return res.status(500).json({ error: 'la sintaxis de entrada no es válida para tipo uuid' });
    }
  }

  @Get('/search')
  async getConversationsSearched(
    @Query('q') contentMessage: string,
    @Res() res: Response,
  ) {
    if (!contentMessage || contentMessage.trim() === '') {
      return res.status(400).json({ error: 'Falta el parámetro de búsqueda' });
    }

    try {
      const result = await this.conversationsService.searchMessages(contentMessage);

      if(!result || result.length === 0) {
        return res.status(404).json({ message: 'No se encontraron conversacions que coincidan con lo búsqueda.'})
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error obteniendo mensajes:', error);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }
}



