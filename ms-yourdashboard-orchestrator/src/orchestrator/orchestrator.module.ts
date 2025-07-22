
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorService } from './orchestrator.service';
import { EmailsOrchestratorModule } from './emails/emails.module';
import { AuthOrchestratorModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
@Module({
  imports: [
    ConfigModule,//acceso a variables de entorno
    CacheModule,//módulo de caché para mejorar el rendimiento y no llamar tanto a los microservicios
    EmailsOrchestratorModule,// Módulo para manejar la lógica de emails + coordinación con MS-Auth y MS-Email
    AuthOrchestratorModule,// Módulo para manejar la lógica de autenticación + coordinación con MS-Auth
    // CalendarModule,
    // WhatsappModule,
  ],
  controllers: [OrchestratorController],//rutas del microservicio
  providers: [OrchestratorService],// servicio principal que coordina la lógica de negocio
  exports: [OrchestratorService]// Exporta el servicio para que otros módulos puedan usarlo
})
export class OrchestratorModule {}