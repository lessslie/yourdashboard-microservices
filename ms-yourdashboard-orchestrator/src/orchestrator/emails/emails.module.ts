
// ============================================
// emails/emails.module.ts
// ============================================
import { Module } from '@nestjs/common';
import { EmailsOrchestratorController } from './emails.controller';
import { EmailsOrchestratorService } from './emails.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [EmailsOrchestratorController],
  providers: [EmailsOrchestratorService],
  exports: [EmailsOrchestratorService]
})
export class EmailsOrchestratorModule {}
