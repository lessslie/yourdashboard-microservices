import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorService } from './orchestrator.service';
import { EmailsOrchestratorModule } from './emails/emails.module';
import { AuthOrchestratorModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { SearchModule } from './search/search.module';
import { CalendarOrchestratorModule } from './calendar/calendar.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [
    ConfigModule, //acceso a variables de entorno
    CacheModule, //módulo de caché para mejorar el rendimiento y no llamar tanto a los microservicios
    EmailsOrchestratorModule, // Módulo para manejar la lógica de emails + coordinación con MS-Auth y MS-Email
    AuthOrchestratorModule, // Módulo para manejar la lógica de autenticación + coordinación con MS-Auth
    SearchModule, // Módulo para manejar la lógica de búsqueda global
    CalendarOrchestratorModule, // Módulo para manejar la lógica de Google Calendar + coordinación con MS-Auth y MS-Calendar
    WhatsappModule, // WhatsappModule,
  ],
  controllers: [OrchestratorController], //rutas del microservicio
  providers: [OrchestratorService], // servicio principal que coordina la lógica de negocio
  exports: [OrchestratorService], // Exporta el servicio para que otros módulos puedan usarlo
})
export class OrchestratorModule {}
