import { Module } from '@nestjs/common';
import { WebhookController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { ConversationsModule } from '../controlador-conversaciones/conversations/conversations.module';
import { MessagesGateway } from '../messages/messages.gateway';
import { WhatsappAccountsService } from './whatsapp-accounts.service';

@Module({
  imports: [ConversationsModule],
  controllers: [WebhookController],
  providers: [WhatsappService, MessagesGateway, WhatsappAccountsService],
  exports: [WhatsappAccountsService],
})
export class WhatsappModule {}
