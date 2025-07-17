// src/orchestrator/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthOrchestratorController } from './auth.controller';
import { AuthOrchestratorService } from './auth.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [AuthOrchestratorController],
  providers: [AuthOrchestratorService],
  exports: [AuthOrchestratorService]
})
export class AuthOrchestratorModule {}