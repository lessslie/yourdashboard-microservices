import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { ConversationsModule } from './controlador-conversaciones/conversations/conversations.module';

@Module({
  imports: [WhatsappModule, ConversationsModule],
  controllers: [AppController],
  providers: [AppService], 
})
export class AppModule {}
