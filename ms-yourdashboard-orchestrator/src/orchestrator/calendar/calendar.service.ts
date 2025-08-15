// ms-yourdashboard-orchestrator/src/orchestrator/calendar/calendar.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import { CacheService } from '../cache/cache.service';

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
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService
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
  // 📅 EVENTOS POR CUENTA ESPECÍFICA
  // ================================

  async getEventsPorCuenta(
    authHeader: string, // ✅ Agregar JWT
    cuentaGmailId: string,
    timeMin: string,
    timeMax?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<unknown> {
    try {
      this.logger.log(`📅 Obteniendo eventos para cuenta Gmail ${cuentaGmailId} - Página ${page}`);

      // 🎯 Generar clave de cache
      const cacheKey = `calendar-events:${cuentaGmailId}:limit:${limit}|page:${page}|timeMax:${timeMax || '2025-08-31T23:59:59Z'}|timeMin:${timeMin}`;
      
      // 🔍 Verificar cache
      const cachedResult = await this.cacheService.get(cacheKey);
      if (cachedResult) {
        this.logger.debug(`📦 Cache HIT: eventos cuenta ${cuentaGmailId}`);
        return cachedResult;
      }

      this.logger.debug(`📭 Cache MISS: ${cacheKey}`);
      this.logger.log(`📡 CACHE MISS - Obteniendo eventos desde MS-Calendar para cuenta Gmail ${cuentaGmailId}`);

      // 🔑 Obtener token OAuth con JWT del usuario
      const accessToken = await this.obtenerTokenParaCalendar(authHeader, cuentaGmailId);

      // 📅 Llamar a MS-Calendar con token OAuth
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
        // 💾 Guardar en cache por 5 minutos
        await this.cacheService.set(cacheKey, response.data, 300);
        this.logger.log(`✅ Eventos obtenidos y guardados en cache para cuenta Gmail ${cuentaGmailId}`);
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
  // 📅 EVENTOS UNIFICADOS DE TODAS LAS CUENTAS
  // ================================

  async getEventosUnificados(
    userId: string,
    timeMin: string,
    timeMax?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<unknown> {
    try {
      this.logger.log(`📅 🎯 EVENTOS UNIFICADOS para usuario ${userId} - Página ${page}`);

      // 🎯 Generar clave de cache
      const cacheKey = `calendar-events-unified:${userId}:limit:${limit}|page:${page}|timeMax:${timeMax || '2025-08-31T23:59:59Z'}|timeMin:${timeMin}`;
      
      // 🔍 Verificar cache
      const cachedResult = await this.cacheService.get(cacheKey);
      if (cachedResult) {
        this.logger.debug(`📦 Cache HIT: eventos unificados usuario ${userId}`);
        return cachedResult;
      }

      this.logger.debug(`📭 Cache MISS: ${cacheKey}`);
      this.logger.log(`📡 CACHE MISS - Eventos unificados desde MS-Calendar para usuario ${userId}`);

      // 📅 Llamar directamente a MS-Calendar con userId
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
        // 💾 Guardar en cache por 3 minutos (menos tiempo porque son datos de múltiples cuentas)
        await this.cacheService.set(cacheKey, response.data, 180);
        this.logger.log(`✅ Eventos unificados obtenidos y guardados en cache para usuario ${userId}`);
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
  // 🔍 BÚSQUEDA DE EVENTOS POR CUENTA
  // ================================

  async buscarEventosPorCuenta(
    authHeader: string, // ✅ Agregar JWT
    cuentaGmailId: string,
    timeMin: string,
    searchTerm: string,
    page: number = 1,
    limit: number = 10
  ): Promise<unknown> {
    try {
      this.logger.log(`🔍 Buscando eventos para cuenta Gmail ${cuentaGmailId}: "${searchTerm}"`);

      // 🎯 Generar clave de cache
      const cacheKey = `calendar-search:${cuentaGmailId}:limit:${limit}|page:${page}|searchTerm:${searchTerm}|timeMin:${timeMin}`;
      
      // 🔍 Verificar cache
      const cachedResult = await this.cacheService.get(cacheKey);
      if (cachedResult) {
        this.logger.debug(`📦 Cache HIT: búsqueda eventos cuenta ${cuentaGmailId}`);
        return cachedResult;
      }

      this.logger.debug(`📭 Cache MISS: ${cacheKey}`);
      this.logger.log(`📡 CACHE MISS - Buscando eventos desde MS-Calendar para cuenta Gmail ${cuentaGmailId}`);

      // 🔑 Obtener token OAuth con JWT del usuario
      const accessToken = await this.obtenerTokenParaCalendar(authHeader, cuentaGmailId);

      // 🔍 Llamar a MS-Calendar
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
        // 💾 Guardar en cache por 2 minutos (búsquedas cambian más frecuentemente)
        await this.cacheService.set(cacheKey, response.data, 120);
        this.logger.log(`✅ Búsqueda de eventos completada y guardada en cache`);
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
  // 🔍 BÚSQUEDA GLOBAL DE EVENTOS
  // ================================

  async buscarEventosGlobal(
    userId: string,
    timeMin: string,
    searchTerm: string,
    page: number = 1,
    limit: number = 10
  ): Promise<unknown> {
    try {
      this.logger.log(`🌍 BÚSQUEDA GLOBAL de eventos para usuario ${userId}: "${searchTerm}"`);

      // 🎯 Generar clave de cache
      const cacheKey = `calendar-global-search:${userId}:limit:${limit}|page:${page}|searchTerm:${searchTerm}|timeMin:${timeMin}`;
      
      // 🔍 Verificar cache
      const cachedResult = await this.cacheService.get(cacheKey);
      if (cachedResult) {
        this.logger.debug(`📦 Cache HIT: búsqueda global eventos usuario ${userId}`);
        return cachedResult;
      }

      this.logger.debug(`📭 Cache MISS: ${cacheKey}`);
      this.logger.log(`📡 CACHE MISS - Búsqueda global de eventos desde MS-Calendar para usuario ${userId}`);

      // 🔍 Llamar directamente a MS-Calendar con userId para búsqueda global
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
        // 💾 Guardar en cache por 2 minutos
        await this.cacheService.set(cacheKey, response.data, 120);
        this.logger.log(`✅ Búsqueda global de eventos completada y guardada en cache`);
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
  // 📊 ESTADÍSTICAS DE CALENDARIO
  // ================================

  async getEstadisticasCalendario(authHeader: string, cuentaGmailId: string): Promise<unknown> {
    try {
      this.logger.log(`📊 Obteniendo estadísticas para cuenta Gmail ${cuentaGmailId}`);

      // 🎯 Generar clave de cache
      const cacheKey = `calendar-stats:${cuentaGmailId}`;
      
      // 🔍 Verificar cache
      const cachedResult = await this.cacheService.get(cacheKey);
      if (cachedResult) {
        this.logger.debug(`📦 Cache HIT: stats calendario cuenta ${cuentaGmailId}`);
        return cachedResult;
      }

      this.logger.debug(`📭 Cache MISS: ${cacheKey}`);
      this.logger.log(`📡 CACHE MISS - Obteniendo stats desde MS-Calendar`);

      // 🔑 Obtener token OAuth con JWT del usuario
      const accessToken = await this.obtenerTokenParaCalendar(authHeader, cuentaGmailId);

      // 📊 Llamar a MS-Calendar
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
        // 💾 Guardar en cache por 10 minutos (stats cambian menos frecuentemente)
        await this.cacheService.set(cacheKey, response.data, 600);
        this.logger.log(`✅ Stats de calendario obtenidas y guardadas en cache`);
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
  // 🔄 SINCRONIZACIÓN DE EVENTOS
  // ================================

  async sincronizarEventos(authHeader: string, cuentaGmailId: string, maxEvents: number = 100): Promise<unknown> {
    try {
      this.logger.log(`🔄 Iniciando sync de eventos para cuenta Gmail ${cuentaGmailId}`);

      // 🔑 Obtener token OAuth con JWT del usuario
      const accessToken = await this.obtenerTokenParaCalendar(authHeader, cuentaGmailId);

      // 🔄 Llamar a MS-Calendar
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
        this.logger.log(`✅ Sync de eventos completado para cuenta Gmail ${cuentaGmailId}`);
        
        // 🧹 Limpiar cache relacionado después del sync
        await this.limpiarCacheCalendar(cuentaGmailId);
        
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
  // 🧹 UTILIDADES DE CACHE
  // ================================

  private async limpiarCacheCalendar(cuentaGmailId: string): Promise<void> {
    try {
      // Limpiar cache relacionado con esta cuenta
      const keysToDelete = [
        `calendar-events:${cuentaGmailId}:*`,
        `calendar-search:${cuentaGmailId}:*`,
        `calendar-stats:${cuentaGmailId}`
      ];

      for (const pattern of keysToDelete) {
        await this.cacheService.deletePattern(pattern);
      }

      this.logger.debug(`🧹 Cache de calendario limpiado para cuenta ${cuentaGmailId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.debug(`⚠️ No se pudo limpiar cache:`, errorMessage);
    }
  }

  // ================================
  // 🔧 MÉTODOS LEGACY (MANTENER COMPATIBILIDAD)
  // ================================

  // Estos métodos pueden existir en tu archivo original, mantenerlos para compatibilidad
  healthCheck(): Record<string, unknown> {
    return {
      service: 'calendar-orchestrator',
      status: 'OK',
      timestamp: new Date().toISOString(),
      endpoints: {
        msAuth: this.msAuthUrl,
        msCalendar: this.msCalendarUrl
      }
    };
  }

  // ================================
  // 📋 OBTENER EVENTO ESPECÍFICO POR ID
  // ================================

  async getEventByIdWithToken(
    authHeader: string,
    cuentaGmailId: string,
    eventId: string
  ): Promise<unknown> {
    try {
      this.logger.log(`📋 Obteniendo evento ${eventId} para cuenta Gmail ${cuentaGmailId}`);

      if (!eventId || eventId.trim() === '') {
        throw new Error('eventId es requerido');
      }

      // Obtener token válido para la cuenta
      const accessToken = await this.obtenerTokenParaCalendar(authHeader, cuentaGmailId);

      // Llamar al MS-Calendar
      const response: AxiosResponse<CalendarApiResponse> = await axios.get(`${this.msCalendarUrl}/calendar/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          cuentaGmailId
        },
        timeout: 15000
      });

      this.logger.log(`✅ Evento ${eventId} obtenido exitosamente`);
      return response.data;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error obteniendo evento ${eventId}:`, errorMessage);
      throw new Error(`Error obteniendo evento: ${errorMessage}`);
    }
  }

  // ================================
  // ➕ CREAR NUEVO EVENTO
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
      
      this.logger.log(`➕ Creando evento "${eventTitle}" para cuenta Gmail ${cuentaGmailId}`);

      // Obtener token válido para la cuenta
      const accessToken = await this.obtenerTokenParaCalendar(authHeader, cuentaGmailId);

      // Llamar al MS-Calendar
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

      this.logger.log(`✅ Evento "${eventTitle}" creado exitosamente`);
      return response.data;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error creando evento:`, errorMessage);
      throw new Error(`Error creando evento: ${errorMessage}`);
    }
  }

  // ================================
  // ➕ CREAR EVENTO PRIVADO
  // ================================

  async createPrivateEventWithToken(
    authHeader: string,
    cuentaGmailId: string,
    createEventDto: unknown
  ): Promise<unknown> {
    try {
      const eventData = createEventDto as { summary?: string };
      const eventTitle = eventData?.summary || 'Evento privado sin título';
      
      this.logger.log(`➕ Creando evento PRIVADO "${eventTitle}" para cuenta Gmail ${cuentaGmailId}`);

      // Obtener token válido para la cuenta
      const accessToken = await this.obtenerTokenParaCalendar(authHeader, cuentaGmailId);

      // Llamar al MS-Calendar
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

      this.logger.log(`✅ Evento privado "${eventTitle}" creado exitosamente`);
      return response.data;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error creando evento privado:`, errorMessage);
      throw new Error(`Error creando evento privado: ${errorMessage}`);
    }
  }

  // ================================
  // ✏️ ACTUALIZAR EVENTO EXISTENTE
  // ================================

  async updateEventWithToken(
    authHeader: string,
    cuentaGmailId: string,
    eventId: string,
    updateEventDto: unknown
  ): Promise<unknown> {
    try {
      this.logger.log(`✏️ Actualizando evento ${eventId} para cuenta Gmail ${cuentaGmailId}`);

      // Obtener token válido para la cuenta
      const accessToken = await this.obtenerTokenParaCalendar(authHeader, cuentaGmailId);

      // Llamar al MS-Calendar
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

      this.logger.log(`✅ Evento ${eventId} actualizado exitosamente`);
      return response.data;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error actualizando evento ${eventId}:`, errorMessage);
      throw new Error(`Error actualizando evento: ${errorMessage}`);
    }
  }

  // ================================
  // 🗑️ ELIMINAR EVENTO
  // ================================

  async deleteEventWithToken(
    authHeader: string,
    cuentaGmailId: string,
    eventId: string
  ): Promise<unknown> {
    try {
      this.logger.log(`🗑️ Eliminando evento ${eventId} para cuenta Gmail ${cuentaGmailId}`);

      // Obtener token válido para la cuenta
      const accessToken = await this.obtenerTokenParaCalendar(authHeader, cuentaGmailId);

      // Llamar al MS-Calendar
      const response: AxiosResponse<CalendarApiResponse> = await axios.delete(`${this.msCalendarUrl}/calendar/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          cuentaGmailId
        },
        timeout: 15000
      });

      this.logger.log(`✅ Evento ${eventId} eliminado exitosamente`);
      return response.data;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error eliminando evento ${eventId}:`, errorMessage);
      throw new Error(`Error eliminando evento: ${errorMessage}`);
    }
  }
}