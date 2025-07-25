
import { Module } from '@nestjs/common';
import { EmailsOrchestratorController } from './emails.controller';
import { EmailsOrchestratorService } from './emails.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],//acceso a variables de entorno
  controllers: [EmailsOrchestratorController],
  providers: [EmailsOrchestratorService],
  exports: [EmailsOrchestratorService]
})
export class EmailsOrchestratorModule {}
