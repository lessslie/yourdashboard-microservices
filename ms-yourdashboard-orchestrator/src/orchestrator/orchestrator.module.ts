
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorService } from './orchestrator.service';
import { EmailsOrchestratorModule } from './emails/emails.module';
import { AuthOrchestratorModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
@Module({
  imports: [
    ConfigModule,
    CacheModule,
    EmailsOrchestratorModule,
    AuthOrchestratorModule,
    // CalendarModule,
    // WhatsappModule,
  ],
  controllers: [OrchestratorController],
  providers: [OrchestratorService],
  exports: [OrchestratorService]
})
export class OrchestratorModule {}