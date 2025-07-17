import { Module } from '@nestjs/common';
import { WebhookController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { ConversationsModule } from 'src/controlador-conversaciones/conversations/conversations.module';

@Module({
  imports: [ConversationsModule],
  controllers: [WebhookController],
  providers: [WhatsappService],
})
export class WhatsappModule {}
