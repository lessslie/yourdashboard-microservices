// ms-yourdashboard-orchestrator/src/orchestrator/calendar/calendar.module.ts
import { Module } from '@nestjs/common';
import { CalendarOrchestratorController } from './calendar.controller';
import { CalendarOrchestratorService } from './calendar.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule, // Acceso a variables de entorno
    // CacheModule ya está @Global(), se importa automáticamente
  ],
  controllers: [CalendarOrchestratorController],
  providers: [CalendarOrchestratorService],
  exports: [CalendarOrchestratorService],
})
export class CalendarOrchestratorModule {}
