// ms-yourdashboard-orchestrator/src/orchestrator/calendar/calendar.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

// ================================
// 🔧 INTERFACES DE TIPADO SEGURO
// ================================

interface AuthTokenResponse {
  success: boolean;
  accessToken: string;
}

interface CalendarApiResponse {
  data: unknown;
}

@Injectable()
export class CalendarOrchestratorService {
  private readonly logger = new Logger(CalendarOrchestratorService.name);
  private readonly msAuthUrl: string;
  private readonly msCalendarUrl: string;

  constructor(
    private readonly configService: ConfigService
    // ✅ REMOVIDO: private readonly cacheService: CacheService
  ) {
    this.msAuthUrl = this.configService.get<string>('MS_AUTH_URL') || 'http://localhost:3001';
    this.msCalendarUrl = this.configService.get<string>('MS_CALENDAR_URL') || 'http://localhost:3005';
  }

  // ================================
  // 🔑 OBTENER TOKEN VÁLIDO
  // ================================

  private async obtenerTokenParaCalendar(authHeader: string, cuentaGmailId: string): Promise<string> {
    try {
      this.logger.debug(`🔑 Solicitando token para cuenta Gmail ${cuentaGmailId} (Calendar)`);

      // 🎯 USAR EL ENDPOINT CORRECTO QUE FUNCIONA
      const response: AxiosResponse<AuthTokenResponse> = await axios.get(`${this.msAuthUrl}/tokens/gmail/${cuentaGmailId}`, {
        headers: {
          'Authorization': authHeader // ✅ Pasar el JWT del usuario
        },
        timeout: 10000
      });

      // ✅ VALIDACIÓN TIPADA SEGURA
      const responseData = response.data;
      if (responseData && responseData.success && responseData.accessToken) {
        this.logger.debug(`✅ Token obtenido para cuenta Gmail ${cuentaGmailId} (Calendar)`);
        return responseData.accessToken;
      }

      throw new Error('Token no válido recibido de MS-Auth');
    } catch (error: unknown) {
      // ✅ MANEJO SEGURO DE ERRORES
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error obteniendo token para Calendar:`, errorMessage);
      throw new Error(`Error obteniendo token para Calendar: ${errorMessage}`);
    }
  }

  // ================================
  // 📅 EVENTOS POR CUENTA ESPECÍFICA - SIN CACHE
  // ================================

  async getEventsPorCuenta(
    authHeader: string,
    cuentaGmailId: string,
    timeMin: string,
    timeMax?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<unknown> {
    try {
      this.logger.log(`📅 ⚡ TIEMPO REAL - Obteniendo eventos para cuenta Gmail ${cuentaGmailId} - Página ${page}`);

      // 🔑 Obtener token OAuth con JWT del usuario
      const accessToken = await this.obtenerTokenParaCalendar(authHeader, cuentaGmailId);

      // 📅 Llamar DIRECTAMENTE a MS-Calendar (SIN CACHE)
      const response: AxiosResponse<CalendarApiResponse> = await axios.get(`${this.msCalendarUrl}/calendar/events`, {
        headers: {
          'Authorization': `Bearer ${accessToken}` // ✅ Usar token OAuth
        },
        params: {
          cuentaGmailId,
          timeMin,
          timeMax: timeMax || '2025-08-31T23:59:59Z',
          page,
          limit
        },
        timeout: 15000
      });

      if (response.data) {
        this.logger.log(`✅ ⚡ Eventos obtenidos en TIEMPO REAL para cuenta Gmail ${cuentaGmailId}`);
        return response.data;
      }

      throw new Error('Respuesta vacía de MS-Calendar');

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error obteniendo eventos:`, errorMessage);
      throw new Error(`Error obteniendo eventos: ${errorMessage}`);
    }
  }

  // ================================
  // 📅 EVENTOS UNIFICADOS - SIN CACHE
  // ================================

  async getEventosUnificados(
    userId: string,
    timeMin: string,
    timeMax?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<unknown> {
    try {
      this.logger.log(`📅 🎯 ⚡ TIEMPO REAL - EVENTOS UNIFICADOS para usuario ${userId} - Página ${page}`);

      // 📅 Llamar DIRECTAMENTE a MS-Calendar (SIN CACHE)
      const response: AxiosResponse<CalendarApiResponse> = await axios.get(`${this.msCalendarUrl}/calendar/events-unified`, {
        params: {
          userId,
          timeMin,
          timeMax: timeMax || '2025-08-31T23:59:59Z',
          page,
          limit
        },
        timeout: 20000
      });

      if (response.data) {
        this.logger.log(`✅ ⚡ Eventos unificados obtenidos en TIEMPO REAL para usuario ${userId}`);
        return response.data;
      }

      throw new Error('Respuesta vacía de MS-Calendar para eventos unificados');

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error en eventos unificados:`, errorMessage);
      throw new Error(`Error en eventos unificados: ${errorMessage}`);
    }
  }

  // ================================
  // 🔍 BÚSQUEDA DE EVENTOS - SIN CACHE
  // ================================

  async buscarEventosPorCuenta(
    authHeader: string,
    cuentaGmailId: string,
    timeMin: string,
    searchTerm: string,
    page: number = 1,
    limit: number = 10
  ): Promise<unknown> {
    try {
      this.logger.log(`🔍 ⚡ TIEMPO REAL - Buscando eventos para cuenta Gmail ${cuentaGmailId}: "${searchTerm}"`);

      // 🔑 Obtener token OAuth con JWT del usuario
      const accessToken = await this.obtenerTokenParaCalendar(authHeader, cuentaGmailId);

      // 🔍 Llamar DIRECTAMENTE a MS-Calendar (SIN CACHE)
      const response: AxiosResponse<CalendarApiResponse> = await axios.get(`${this.msCalendarUrl}/calendar/events/search`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          cuentaGmailId,
          timeMin,
          q: searchTerm,
          page,
          limit
        },
        timeout: 15000
      });

      if (response.data) {
        this.logger.log(`✅ ⚡ Búsqueda de eventos completada en TIEMPO REAL`);
        return response.data;
      }

      throw new Error('Respuesta vacía de MS-Calendar para búsqueda');

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error buscando eventos:`, errorMessage);
      throw new Error(`Error buscando eventos: ${errorMessage}`);
    }
  }

  // ================================
  // 🔍 BÚSQUEDA GLOBAL - SIN CACHE
  // ================================

  async buscarEventosGlobal(
    userId: string,
    timeMin: string,
    searchTerm: string,
    page: number = 1,
    limit: number = 10
  ): Promise<unknown> {
    try {
      this.logger.log(`🌍 ⚡ TIEMPO REAL - BÚSQUEDA GLOBAL de eventos para usuario ${userId}: "${searchTerm}"`);

      // 🔍 Llamar DIRECTAMENTE a MS-Calendar (SIN CACHE)
      const response: AxiosResponse<CalendarApiResponse> = await axios.get(`${this.msCalendarUrl}/calendar/search-global`, {
        params: {
          userId,
          timeMin,
          q: searchTerm,
          page,
          limit
        },
        timeout: 20000
      });

      if (response.data) {
        this.logger.log(`✅ ⚡ Búsqueda global de eventos completada en TIEMPO REAL`);
        return response.data;
      }

      throw new Error('Respuesta vacía de MS-Calendar para búsqueda global');

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error en búsqueda global de eventos:`, errorMessage);
      throw new Error(`Error en búsqueda global: ${errorMessage}`);
    }
  }

  // ================================
  // 📊 ESTADÍSTICAS - SIN CACHE
  // ================================

  async getEstadisticasCalendario(authHeader: string, cuentaGmailId: string): Promise<unknown> {
    try {
      this.logger.log(`📊 ⚡ TIEMPO REAL - Obteniendo estadísticas para cuenta Gmail ${cuentaGmailId}`);

      // 🔑 Obtener token OAuth con JWT del usuario
      const accessToken = await this.obtenerTokenParaCalendar(authHeader, cuentaGmailId);

      // 📊 Llamar DIRECTAMENTE a MS-Calendar (SIN CACHE)
      const response: AxiosResponse<CalendarApiResponse> = await axios.get(`${this.msCalendarUrl}/calendar/stats`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          cuentaGmailId
        },
        timeout: 10000
      });

      if (response.data) {
        this.logger.log(`✅ ⚡ Stats de calendario obtenidas en TIEMPO REAL`);
        return response.data;
      }

      throw new Error('Respuesta vacía de MS-Calendar para estadísticas');

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error obteniendo estadísticas:`, errorMessage);
      throw new Error(`Error obteniendo estadísticas: ${errorMessage}`);
    }
  }

  // ================================
  // 🔄 SINCRONIZACIÓN - SIN CACHE
  // ================================

  async sincronizarEventos(authHeader: string, cuentaGmailId: string, maxEvents: number = 100): Promise<unknown> {
    try {
      this.logger.log(`🔄 ⚡ TIEMPO REAL - Iniciando sync de eventos para cuenta Gmail ${cuentaGmailId}`);

      // 🔑 Obtener token OAuth con JWT del usuario
      const accessToken = await this.obtenerTokenParaCalendar(authHeader, cuentaGmailId);

      // 🔄 Llamar DIRECTAMENTE a MS-Calendar (SIN CACHE)
      const response: AxiosResponse<CalendarApiResponse> = await axios.post(`${this.msCalendarUrl}/calendar/sync`, null, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          cuentaGmailId,
          maxEvents
        },
        timeout: 30000 // 30 segundos para sync
      });

      if (response.data) {
        this.logger.log(`✅ ⚡ Sync de eventos completado en TIEMPO REAL para cuenta Gmail ${cuentaGmailId}`);
        return response.data;
      }

      throw new Error('Respuesta vacía de MS-Calendar para sync');

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error en sync de eventos:`, errorMessage);
      throw new Error(`Error sincronizando eventos: ${errorMessage}`);
    }
  }

  // ================================
  // 🔧 MÉTODOS LEGACY
  // ================================

  healthCheck(): Record<string, unknown> {
    return {
      service: 'calendar-orchestrator',
      status: 'OK',
      mode: 'TIEMPO-REAL', // ✅ Indicar que es tiempo real
      timestamp: new Date().toISOString(),
      endpoints: {
        msAuth: this.msAuthUrl,
        msCalendar: this.msCalendarUrl
      }
    };
  }

  // ================================
  // 📋 OBTENER EVENTO ESPECÍFICO - SIN CACHE
  // ================================

  async getEventByIdWithToken(
    authHeader: string,
    cuentaGmailId: string,
    eventId: string
  ): Promise<unknown> {
    try {
      this.logger.log(`📋 ⚡ TIEMPO REAL - Obteniendo evento ${eventId} para cuenta Gmail ${cuentaGmailId}`);

      if (!eventId || eventId.trim() === '') {
        throw new Error('eventId es requerido');
      }

      // Obtener token válido para la cuenta
      const accessToken = await this.obtenerTokenParaCalendar(authHeader, cuentaGmailId);

      // Llamar DIRECTAMENTE al MS-Calendar (SIN CACHE)
      const response: AxiosResponse<CalendarApiResponse> = await axios.get(`${this.msCalendarUrl}/calendar/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          cuentaGmailId
        },
        timeout: 15000
      });

      this.logger.log(`✅ ⚡ Evento ${eventId} obtenido en TIEMPO REAL`);
      return response.data;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error obteniendo evento ${eventId}:`, errorMessage);
      throw new Error(`Error obteniendo evento: ${errorMessage}`);
    }
  }

  // ================================
  // ➕ CREAR NUEVO EVENTO - SIN CACHE
  // ================================

  async createEventWithToken(
    authHeader: string,
    cuentaGmailId: string,
    createEventDto: unknown
  ): Promise<unknown> {
    try {
      // ✅ VALIDACIÓN SEGURA DE PROPIEDADES
      const eventData = createEventDto as { summary?: string };
      const eventTitle = eventData?.summary || 'Evento sin título';
      
      this.logger.log(`➕ ⚡ TIEMPO REAL - Creando evento "${eventTitle}" para cuenta Gmail ${cuentaGmailId}`);

      // Obtener token válido para la cuenta
      const accessToken = await this.obtenerTokenParaCalendar(authHeader, cuentaGmailId);

      // Llamar DIRECTAMENTE al MS-Calendar (SIN CACHE)
      const response: AxiosResponse<CalendarApiResponse> = await axios.post(`${this.msCalendarUrl}/calendar/events`, 
        createEventDto,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            cuentaGmailId
          },
          timeout: 15000
        }
      );

      this.logger.log(`✅ ⚡ Evento "${eventTitle}" creado en TIEMPO REAL`);
      return response.data;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error creando evento:`, errorMessage);
      throw new Error(`Error creando evento: ${errorMessage}`);
    }
  }

  // ================================
  // ➕ CREAR EVENTO PRIVADO - SIN CACHE
  // ================================

  async createPrivateEventWithToken(
    authHeader: string,
    cuentaGmailId: string,
    createEventDto: unknown
  ): Promise<unknown> {
    try {
      const eventData = createEventDto as { summary?: string };
      const eventTitle = eventData?.summary || 'Evento privado sin título';
      
      this.logger.log(`➕ ⚡ TIEMPO REAL - Creando evento PRIVADO "${eventTitle}" para cuenta Gmail ${cuentaGmailId}`);

      // Obtener token válido para la cuenta
      const accessToken = await this.obtenerTokenParaCalendar(authHeader, cuentaGmailId);

      // Llamar DIRECTAMENTE al MS-Calendar (SIN CACHE)
      const response: AxiosResponse<CalendarApiResponse> = await axios.post(`${this.msCalendarUrl}/calendar/events/private`, 
        createEventDto,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            cuentaGmailId
          },
          timeout: 15000
        }
      );

      this.logger.log(`✅ ⚡ Evento privado "${eventTitle}" creado en TIEMPO REAL`);
      return response.data;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error creando evento privado:`, errorMessage);
      throw new Error(`Error creando evento privado: ${errorMessage}`);
    }
  }

  // ================================
  // ✏️ ACTUALIZAR EVENTO - SIN CACHE
  // ================================

  async updateEventWithToken(
    authHeader: string,
    cuentaGmailId: string,
    eventId: string,
    updateEventDto: unknown
  ): Promise<unknown> {
    try {
      this.logger.log(`✏️ ⚡ TIEMPO REAL - Actualizando evento ${eventId} para cuenta Gmail ${cuentaGmailId}`);

      // Obtener token válido para la cuenta
      const accessToken = await this.obtenerTokenParaCalendar(authHeader, cuentaGmailId);

      // Llamar DIRECTAMENTE al MS-Calendar (SIN CACHE)
      const response: AxiosResponse<CalendarApiResponse> = await axios.patch(`${this.msCalendarUrl}/calendar/events/${eventId}`, 
        updateEventDto,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            cuentaGmailId
          },
          timeout: 15000
        }
      );

      this.logger.log(`✅ ⚡ Evento ${eventId} actualizado en TIEMPO REAL`);
      return response.data;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error actualizando evento ${eventId}:`, errorMessage);
      throw new Error(`Error actualizando evento: ${errorMessage}`);
    }
  }

  // ================================
  // 🤝 COMPARTIR CALENDAR - SIN CACHE
  // ================================

  async shareCalendar(
    authHeader: string,
    cuentaGmailId: string,
    userEmail: string,
    role: 'reader' | 'writer',
    calendarId: string = 'primary'
  ): Promise<unknown> {
    try {
      this.logger.log(`🤝 ⚡ TIEMPO REAL - Compartiendo calendar ${calendarId} de cuenta Gmail ${cuentaGmailId} con ${userEmail} como ${role}`);

      // 🔑 Obtener token OAuth con JWT del usuario
      const accessToken = await this.obtenerTokenParaCalendar(authHeader, cuentaGmailId);

      // 🤝 Llamar DIRECTAMENTE a MS-Calendar (SIN CACHE)
      const response: AxiosResponse<CalendarApiResponse> = await axios.post(`${this.msCalendarUrl}/calendar/share`, 
        {
          calendarId,
          userEmail,
          role
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            cuentaGmailId
          },
          timeout: 15000
        }
      );

      if (response.data) {
        this.logger.log(`✅ ⚡ Calendar compartido en TIEMPO REAL con ${userEmail} como ${role}`);
        return response.data;
      }

      throw new Error('Respuesta vacía de MS-Calendar para compartir');

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error compartiendo calendar:`, errorMessage);
      throw new Error(`Error compartiendo calendar: ${errorMessage}`);
    }
  }
  // ================================
  // 🚫 REVOCAR ACCESO AL CALENDAR - SIN CACHE
  // ================================

  async unshareCalendar(
    authHeader: string,
    cuentaGmailId: string,
    userEmail: string,
    calendarId: string = 'primary'
  ): Promise<unknown> {
    try {
      this.logger.log(`🚫 ⚡ TIEMPO REAL - Revocando acceso al calendar ${calendarId} de cuenta Gmail ${cuentaGmailId} para ${userEmail}`);

      // 🔑 Obtener token OAuth con JWT del usuario
      const accessToken = await this.obtenerTokenParaCalendar(authHeader, cuentaGmailId);

      // 🚫 Llamar DIRECTAMENTE a MS-Calendar (SIN CACHE)
      // El aclRuleId se forma como "user:email" para usuarios normales
      const aclRuleId = `user:${userEmail}`;
      
      const response: AxiosResponse<CalendarApiResponse> = await axios.delete(
        `${this.msCalendarUrl}/calendar/share/${encodeURIComponent(aclRuleId)}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          params: {
            cuentaGmailId,
            calendarId
          },
          timeout: 15000
        }
      );

      this.logger.log(`✅ ⚡ Acceso al calendar revocado en TIEMPO REAL para ${userEmail}`);
      
      // Para DELETE, MS-Calendar podría devolver solo un mensaje de éxito
      return {
        success: true,
        message: 'Acceso al calendar revocado exitosamente',
        revoked_from: userEmail,
        calendar_id: calendarId
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error revocando acceso al calendar:`, errorMessage);
      
      // Si es error 404, puede ser que el usuario ya no tenía acceso
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        throw new Error(`El usuario ${userEmail} no tiene acceso a este calendar`);
      }
      
      throw new Error(`Error revocando acceso al calendar: ${errorMessage}`);
    }
  }

  // ================================
  // 🗑️ ELIMINAR EVENTO - SIN CACHE
  // ================================

  async deleteEventWithToken(
    authHeader: string,
    cuentaGmailId: string,
    eventId: string
  ): Promise<unknown> {
    try {
      this.logger.log(`🗑️ ⚡ TIEMPO REAL - Eliminando evento ${eventId} para cuenta Gmail ${cuentaGmailId}`);

      // Obtener token válido para la cuenta
      const accessToken = await this.obtenerTokenParaCalendar(authHeader, cuentaGmailId);

      // Llamar DIRECTAMENTE al MS-Calendar (SIN CACHE)
      const response: AxiosResponse<CalendarApiResponse> = await axios.delete(`${this.msCalendarUrl}/calendar/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          cuentaGmailId
        },
        timeout: 15000
      });

      this.logger.log(`✅ ⚡ Evento ${eventId} eliminado en TIEMPO REAL`);
      return response.data;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error eliminando evento ${eventId}:`, errorMessage);
      throw new Error(`Error eliminando evento: ${errorMessage}`);
    }
  }
  
}