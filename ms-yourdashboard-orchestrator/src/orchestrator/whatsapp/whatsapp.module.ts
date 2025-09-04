// src/orchestrator/whatsapp/whatsapp.module.ts
import { Module } from '@nestjs/common';
import { WhatsappAccountsService } from './whatsapp-accounts.service';
import { WhatsappController } from './whatsapp.controller';

@Module({
  controllers: [WhatsappController],
  providers: [WhatsappAccountsService],
  exports: [WhatsappAccountsService],
})
export class WhatsappModule {}
