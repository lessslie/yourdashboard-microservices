import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { WebhookController } from './whatsapp/whatsapp.controller';
import { ConversationsController } from './controlador-conversaciones/conversations/conversations.controller';
import { ConversationsModule } from './controlador-conversaciones/conversations/conversations.module';
import { ConversationsService } from './controlador-conversaciones/conversations/conversations.service';


@Module({
  imports: [WhatsappModule, ConversationsModule],
  controllers: [AppController, WebhookController, ConversationsController],
  providers: [AppService, ConversationsService],
})
export class AppModule {}
