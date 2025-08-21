import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { ConversationsModule } from './controlador-conversaciones/conversations/conversations.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TokenScheduler } from './scheduler/token-refresh.scheduler';

@Module({
  imports: [WhatsappModule, ConversationsModule, ScheduleModule.forRoot()],
  controllers: [AppController],
  providers: [AppService, TokenScheduler], 
})
export class AppModule {}
