// ms-yourdashboard-orchestrator/src/orchestrator/calendar/calendar.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CacheService } from '../cache/cache.service';

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
      const response = await axios.get(`${this.msAuthUrl}/tokens/gmail/${cuentaGmailId}`, {
        headers: {
          'Authorization': authHeader // ✅ Pasar el JWT del usuario
        },
        timeout: 10000
      });

      if (response.data?.success && response.data?.accessToken) {
        this.logger.debug(`✅ Token obtenido para cuenta Gmail ${cuentaGmailId} (Calendar)`);
        return response.data.accessToken;
      }

      throw new Error('Token no válido recibido de MS-Auth');
    } catch (error: any) {
      this.logger.error(`❌ Error obteniendo token para Calendar:`, error.message);
      throw new Error(`Error obteniendo token para Calendar: ${error.message}`);
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
  ) {
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
      const response = await axios.get(`${this.msCalendarUrl}/calendar/events`, {
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

    } catch (error: any) {
      this.logger.error(`❌ Error obteniendo eventos:`, error.message);
      throw new Error(`Error obteniendo eventos: ${error.message}`);
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
  ) {
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
      const response = await axios.get(`${this.msCalendarUrl}/calendar/events-unified`, {
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

    } catch (error: any) {
      this.logger.error(`❌ Error en eventos unificados:`, error.message);
      throw new Error(`Error en eventos unificados: ${error.message}`);
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
  ) {
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
      const response = await axios.get(`${this.msCalendarUrl}/calendar/events/search`, {
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

    } catch (error: any) {
      this.logger.error(`❌ Error buscando eventos:`, error.message);
      throw new Error(`Error buscando eventos: ${error.message}`);
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
  ) {
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
      const response = await axios.get(`${this.msCalendarUrl}/calendar/search-global`, {
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

    } catch (error: any) {
      this.logger.error(`❌ Error en búsqueda global de eventos:`, error.message);
      throw new Error(`Error en búsqueda global: ${error.message}`);
    }
  }

  // ================================
  // 📊 ESTADÍSTICAS DE CALENDARIO
  // ================================

  async getEstadisticasCalendario(authHeader: string, cuentaGmailId: string) {
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
      const response = await axios.get(`${this.msCalendarUrl}/calendar/stats`, {
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

    } catch (error: any) {
      this.logger.error(`❌ Error obteniendo estadísticas:`, error.message);
      throw new Error(`Error obteniendo estadísticas: ${error.message}`);
    }
  }

  // ================================
  // 🔄 SINCRONIZACIÓN DE EVENTOS
  // ================================

  async sincronizarEventos(authHeader: string, cuentaGmailId: string, maxEvents: number = 100) {
    try {
      this.logger.log(`🔄 Iniciando sync de eventos para cuenta Gmail ${cuentaGmailId}`);

      // 🔑 Obtener token OAuth con JWT del usuario
      const accessToken = await this.obtenerTokenParaCalendar(authHeader, cuentaGmailId);

      // 🔄 Llamar a MS-Calendar
      const response = await axios.post(`${this.msCalendarUrl}/calendar/sync`, null, {
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

    } catch (error: any) {
      this.logger.error(`❌ Error en sync de eventos:`, error.message);
      throw new Error(`Error sincronizando eventos: ${error.message}`);
    }
  }

  // ================================
  // 🧹 UTILIDADES DE CACHE
  // ================================

  private async limpiarCacheCalendar(cuentaGmailId: string) {
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
    } catch (error: any) {
      this.logger.debug(`⚠️ No se pudo limpiar cache:`, error.message);
    }
  }

  // ================================
  // 🔧 MÉTODOS LEGACY (MANTENER COMPATIBILIDAD)
  // ================================

  // Estos métodos pueden existir en tu archivo original, los mantengo para compatibilidad
  async healthCheck() {
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
}