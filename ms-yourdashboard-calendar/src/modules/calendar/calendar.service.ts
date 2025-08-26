import { Injectable, Logger } from '@nestjs/common';
import { google, calendar_v3 } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import { 
  DatabaseService, 
  EventMetadataDB, 
  EventSearchFilters 
} from '../../core/database/database.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

// 🎯 INTERFACES PARA CALENDAR SERVICE
export interface SyncOptions {
  maxEvents?: number;
  timeMin?: string;
  timeMax?: string | number;
  futureOnly?: boolean;
}

export interface CalendarListResponse {
  events: CalendarEventMetadata[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  searchTerm?: string;
}

export interface CalendarEventMetadata {
  id: string;
  summary: string;
  location?: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees?: string[];
  isAllDay: boolean;
  status: string;
}

export interface CalendarStats {
  totalEvents: number;
  upcomingEvents: number;
  pastEvents: number;
}

export interface CalendarEventDetail extends CalendarEventMetadata {
  creator?: string;
  organizer?: string;
  htmlLink?: string;
  sourceAccount?: string;
  sourceAccountId?: number;
}

export interface CalendarServiceError {
  message: string;
  code?: number;
  status?: number;
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService
  ) {}

  // ================================
  // 📅 EVENTOS - MÉTODOS PRINCIPALES
  // ================================

  /**
   * 📅 Listar eventos con token - PATRÓN MS-EMAIL
   */
 async listEventsWithToken(
    accessToken: string, 
    cuentaGmailId: string,
    timeMin: string,
    timeMax?: string | number | Date,
    page: number = 1,
    limit: number = 10
  ): Promise<CalendarListResponse> {
    try {
      this.logger.log(`📅 Listando eventos para cuenta Gmail ${cuentaGmailId} - Página ${page}`);

      const cuentaGmailIdNum = parseInt(cuentaGmailId);
      if (isNaN(cuentaGmailIdNum)) {
        throw new Error('cuentaGmailId debe ser un número válido');
      }

      // 🎯 ESTRATEGIA: Google Calendar API primero (como MS-Email)
      try {
        this.logger.log(`📡 Obteniendo eventos desde Google Calendar API`);
        
        // 🔄 OBTENER TOKEN VÁLIDO (con auto-refresh)
        const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);
        
        if (!validAccessToken) {
          throw new Error('No se pudo obtener token válido');
        }

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: validAccessToken });
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // ✅ CORRECCIÓN: Convertir timeMax y asegurar tipos
        const maxTime = timeMax ? 
          (typeof timeMax === 'string' ? timeMax : new Date(timeMax).toISOString()) 
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        // 🎯 Para paginación en Calendar API, usamos pageToken en lugar de skip/limit
        const maxResults = Math.min(limit * page, 250); // Calendar API limit
        
        const response = await calendar.events.list({
          calendarId: 'primary',
          timeMin,
          timeMax: maxTime,
          maxResults,
          singleEvents: true,
          orderBy: 'startTime'
        });

        const allEvents = response.data.items || [];
        
        // Simular paginación manualmente
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedEvents = allEvents.slice(startIndex, endIndex);
        
        const events = paginatedEvents.map(this.convertAPIToEventMetadata);
        const totalPages = Math.ceil(allEvents.length / limit);

        this.logger.log(`✅ Eventos obtenidos: ${allEvents.length} total, ${events.length} en página ${page}`);

        return {
          events,
          total: allEvents.length,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        };
        
      } catch (apiError: any) {
        this.logger.error(`❌ Error en Calendar API, usando BD como fallback:`, apiError.message);
        
        // 🎯 FALLBACK: BD local si falla API
        const dbResult = await this.databaseService.getEventsPaginated(
          cuentaGmailIdNum, 
          page, 
          limit,
          true // Solo eventos futuros
        );

        if (dbResult.total > 0) {
          this.logger.log(`💾 FALLBACK exitoso: ${dbResult.events.length} eventos desde BD`);
          
          const events = dbResult.events.map(this.convertDBToEventMetadata);
          const totalPages = Math.ceil(dbResult.total / limit);
          
          return {
            events,
            total: dbResult.total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
          };
        }
        
        throw apiError; // Si tampoco hay BD, lanzar error original
      }

    } catch (error: any) {
      this.logger.error('❌ Error obteniendo eventos:', {
        message: error.message,
        cuentaGmailId
      });
      
      throw new Error('Error al consultar eventos: ' + error.message);
    }
  }

  /**
   * 🔍 Buscar eventos con token - PATRÓN MS-EMAIL
   */
 /**
   * 🔍 Buscar eventos con token - CON BÚSQUEDA PARCIAL MEJORADA
   */
 async searchEventsWithToken(
    accessToken: string,
    cuentaGmailId: string,
    timeMin: string,
    searchTerm: string,
    page: number = 1,
    limit: number = 10
  ): Promise<CalendarListResponse> {
    try {
      this.logger.log(`🔍 Buscando eventos "${searchTerm}" para cuenta Gmail ${cuentaGmailId}`);

      // 🔍 Validaciones básicas
      if (!searchTerm || searchTerm.trim() === '') {
        return {
          events: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
          searchTerm: searchTerm || ''
        };
      }

      const cuentaGmailIdNum = parseInt(cuentaGmailId);
      if (isNaN(cuentaGmailIdNum)) {
        throw new Error('cuentaGmailId debe ser un número válido');
      }

      // 🎯 ESTRATEGIA: Google Calendar API primero
      try {
        this.logger.log(`🌐 Buscando en Google Calendar API`);
        
        // 🔄 OBTENER TOKEN VÁLIDO (con auto-refresh)
        const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);
        
        if (!validAccessToken) {
          throw new Error('No se pudo obtener token válido');
        }

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: validAccessToken });
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // ✨ MEJORA: Obtener más eventos para filtrar localmente
        const maxResults = Math.min(250, limit * page * 3); // Obtener 3x más para filtrar

        // 🔍 PRIMERA BÚSQUEDA: Con término original
        let response = await calendar.events.list({
          calendarId: 'primary',
          timeMin,
          q: searchTerm.trim(),
          maxResults,
          singleEvents: true,
          orderBy: 'startTime'
        });

        let allEvents = response.data.items || [];

        // ✨ SI NO ENCUENTRA NADA, BUSCAR SIN FILTRO Y FILTRAR LOCALMENTE
        if (allEvents.length === 0) {
          this.logger.log(`🔍 Sin resultados con Google API, buscando localmente...`);
          
          // Obtener eventos sin filtro de búsqueda
          response = await calendar.events.list({
            calendarId: 'primary',
            timeMin,
            maxResults: 250,
            singleEvents: true,
            orderBy: 'startTime'
          });

          const eventsToFilter = response.data.items || [];
          const searchTermLower = searchTerm.toLowerCase().trim();

          // 🎯 FILTRAR LOCALMENTE CON BÚSQUEDA PARCIAL
          allEvents = eventsToFilter.filter(event => {
            const summary = (event.summary || '').toLowerCase();
            const description = (event.description || '').toLowerCase();
            const location = (event.location || '').toLowerCase();
            
            // Búsqueda parcial: "duo" encuentra "duolingo"
            return summary.includes(searchTermLower) || 
                   description.includes(searchTermLower) ||
                   location.includes(searchTermLower);
          });

          this.logger.log(`🎯 Filtrado local encontró: ${allEvents.length} eventos`);
        }
        
        // Paginación manual con los eventos filtrados
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedEvents = allEvents.slice(startIndex, endIndex);
        
        const events = paginatedEvents.map(this.convertAPIToEventMetadata);
        const totalPages = Math.ceil(allEvents.length / limit);

        this.logger.log(`✅ Búsqueda completada: ${allEvents.length} eventos encontrados, ${events.length} en página ${page}`);

        return {
          events,
          total: allEvents.length,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
          searchTerm: searchTerm.trim()
        };
        
      } catch (apiError: any) {
        this.logger.warn(`⚠️ Calendar API falló para búsqueda, intentando BD como fallback:`, apiError.message);
        
        // 🎯 FALLBACK: BD local con búsqueda parcial
        const filters: EventSearchFilters = {
          search_text: searchTerm.trim(),
          start_date: new Date(timeMin)
        };

        const searchResult = await this.databaseService.searchEventsInDB(
          cuentaGmailIdNum,
          filters,
          page,
          limit
        );

        const events = searchResult.events.map(this.convertDBToEventMetadata);
        const totalPages = Math.ceil(searchResult.total / limit);

        this.logger.log(`💾 Fallback BD exitoso: ${searchResult.total} eventos encontrados`);

        return {
          events,
          total: searchResult.total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
          searchTerm: searchTerm.trim()
        };
      }

    } catch (error: any) {
      this.logger.error('❌ Error en búsqueda de eventos:', {
        message: error.message,
        searchTerm,
        cuentaGmailId
      });
      
      throw new Error(`Error al buscar eventos: ${error.message}`);
    }
  }
/**
   * 🚫 Revocar acceso al calendar con token (CON AUTO-REFRESH)
   */
  async unshareCalendarWithToken(
    accessToken: string,
    cuentaGmailId: string,
    calendarId: string,
    aclRuleId: string,
    userEmail: string
  ) {
    try {
      this.logger.log(`🚫 Revocando acceso al calendar ${calendarId} para ${userEmail} (regla: ${aclRuleId})`);

      const cuentaGmailIdNum = parseInt(cuentaGmailId);
      
      if (isNaN(cuentaGmailIdNum)) {
        throw new Error('cuentaGmailId debe ser un número válido');
      }

      // Obtener token válido (con auto-refresh)
      const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: validAccessToken });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Eliminar la regla ACL
      await calendar.acl.delete({
        calendarId,
        ruleId: aclRuleId
      });

      this.logger.log(`✅ Acceso revocado exitosamente para ${userEmail} en calendar ${calendarId}`);
      
      return {
        success: true,
        message: 'Acceso al calendar revocado exitosamente',
        revoked_from: userEmail,
        calendar_id: calendarId
      };

    } catch (error: any) {
      this.logger.error(`Error revocando acceso al calendar:`, error);
      
      // Manejo específico de errores de Google Calendar API
      if (error.code === 404) {
        throw new Error(`El usuario ${userEmail} no tiene acceso a este calendar`);
      }
      
      if (error.code === 403) {
        throw new Error('No tienes permisos para gestionar el acceso a este calendar');
      }
      
      if (error.code === 401) {
        throw new Error('Token de autorización inválido o expirado');
      }
      
      throw new Error(`Error revocando acceso al calendar: ${error.message || 'Error desconocido'}`);
    }
  }
  
  /**
   * 📋 Obtener evento específico por ID con token (CON AUTO-REFRESH)
   */
  async getEventByIdWithToken(
    accessToken: string,
    cuentaGmailId: string,
    eventId: string
  ) {
    try {
      this.logger.log(`📋 Obteniendo evento ${eventId} para cuenta Gmail ${cuentaGmailId}`);

      const cuentaGmailIdNum = parseInt(cuentaGmailId);
      
      if (isNaN(cuentaGmailIdNum)) {
        throw new Error('cuentaGmailId debe ser un número válido');
      }

      if (!eventId || eventId.trim() === '') {
        throw new Error('eventId es requerido');
      }

      // 🔄 OBTENER TOKEN VÁLIDO (con auto-refresh)
      const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);
      
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: validAccessToken });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // 🎯 OBTENER EVENTO ESPECÍFICO POR ID
      const response = await calendar.events.get({
        calendarId: 'primary',
        eventId: eventId
      });

      if (!response.data) {
        throw new Error(`Evento ${eventId} not found`);
      }

      const event = response.data;

      // 🔄 FORMATEAR RESPUESTA CONSISTENTE CON OTROS MÉTODOS
      const formattedEvent = {
        id: event.id,
        summary: event.summary || 'Sin título',
        location: event.location || '',
        description: event.description || '',
        startTime: event.start?.dateTime || event.start?.date || '',
        endTime: event.end?.dateTime || event.end?.date || '',
        attendees: event.attendees?.map((attendee: any) => attendee.email).filter(Boolean) || [],
        isAllDay: !event.start?.dateTime, // Si no tiene dateTime, es todo el día
        status: event.status || 'confirmed',
        sourceAccount: undefined, // Solo se usa en búsquedas unificadas
        sourceAccountId: cuentaGmailIdNum,
        
        // 🆕 CAMPOS ADICIONALES ÚTILES
        creator: event.creator?.email || '',
        organizer: event.organizer?.email || '',
        htmlLink: event.htmlLink || '',
        created: event.created || '',
        updated: event.updated || '',
        transparency: event.transparency || 'opaque',
        visibility: event.visibility || 'default',
        recurrence: event.recurrence || [],
        recurringEventId: event.recurringEventId || null
      };

      this.logger.log(`✅ Evento ${eventId} obtenido exitosamente`);
      return formattedEvent;

    } catch (error: any) {
      this.logger.error(`❌ Error obteniendo evento ${eventId}:`, error);
      
      // 🎯 MANEJO ESPECÍFICO DE ERRORES DE GOOGLE API
      if (error.code === 404 || error.message?.includes('Not Found') || error.message?.includes('not found')) {
        throw new Error(`Evento ${eventId} no encontrado`);
      }
      
      if (error.code === 403) {
        throw new Error('No tienes permisos para acceder a este evento');
      }
      
      if (error.code === 401) {
        throw new Error('Token de autorización inválido o expirado');
      }
      
      if (error.code === 410) {
        throw new Error('El evento ha sido eliminado');
      }
      
      throw new Error(`Error obteniendo evento: ${error.message || 'Error desconocido'}`);
    }
  }
  /**
   * ➕ Crear evento con token (CON AUTO-REFRESH)
   */
  async createEventWithToken(
    accessToken: string, 
    cuentaGmailId: string, 
    eventBody: any
  ) {
    try {
      this.logger.log(`➕ Creando evento "${eventBody.summary || 'Sin título'}" para cuenta Gmail ${cuentaGmailId}`);

      // 🔍 Validaciones básicas
      if (!eventBody || !eventBody.summary) {
        throw new Error('El campo summary es requerido');
      }

      if (!eventBody.startDateTime || !eventBody.endDateTime) {
        throw new Error('Los campos startDateTime y endDateTime son requeridos');
      }

      const cuentaGmailIdNum = parseInt(cuentaGmailId);
      if (isNaN(cuentaGmailIdNum)) {
        throw new Error('cuentaGmailId debe ser un número válido');
      }

      // 🔄 OBTENER TOKEN VÁLIDO (con auto-refresh)
      const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);
      
      if (!validAccessToken) {
        throw new Error('No se pudo obtener token válido para la cuenta');
      }

      // Configurar Google Calendar API
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: validAccessToken });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // 🔧 CONSTRUIR OBJETO PARA GOOGLE CALENDAR API
      const googleEvent: any = {
        summary: eventBody.summary,
        start: {
          dateTime: eventBody.startDateTime
        },
        end: {
          dateTime: eventBody.endDateTime
        }
      };

      // ➕ CAMPOS OPCIONALES
      if (eventBody.location && eventBody.location.trim()) {
        googleEvent.location = eventBody.location.trim();
      }

      if (eventBody.description && eventBody.description.trim()) {
        googleEvent.description = eventBody.description.trim();
      }

      // ➕ ASISTENTES (si existen y son válidos)
      if (eventBody.attendees && Array.isArray(eventBody.attendees) && eventBody.attendees.length > 0) {
        const validAttendees = eventBody.attendees
          .filter((email: string) => email && email.trim() && email.includes('@'))
          .map((email: string) => ({ email: email.trim() }));
        
        if (validAttendees.length > 0) {
          googleEvent.attendees = validAttendees;
        }
      }

      this.logger.debug(`🔧 Evento a crear en Google Calendar:`, {
        summary: googleEvent.summary,
        start: googleEvent.start,
        end: googleEvent.end,
        hasLocation: !!googleEvent.location,
        hasDescription: !!googleEvent.description,
        attendeesCount: googleEvent.attendees?.length || 0
      });

      // 🎯 CREAR EVENTO EN GOOGLE CALENDAR
      const response = await calendar.events.insert({
        calendarId: 'primary',
        sendUpdates: googleEvent.attendees ? 'all' : 'none', // Solo enviar updates si hay asistentes
        requestBody: googleEvent
      });

      if (!response.data || !response.data.id) {
        throw new Error('Google Calendar no devolvió un evento válido');
      }

      // 🎯 GUARDAR EN BD EN BACKGROUND (como MS-Email)
      this.saveEventToDB(response.data, cuentaGmailIdNum).catch(err => {
        this.logger.debug(`Background save error (ignorado):`, err);
      });

      this.logger.log(`✅ Evento creado exitosamente: ${response.data.id}`);
      this.logger.log(`🔗 Link del evento: ${response.data.htmlLink}`);

      return response.data;

    } catch (error: any) {
      this.logger.error(`❌ Error creando evento:`, {
        message: error.message,
        code: error.code,
        eventSummary: eventBody?.summary || 'N/A'
      });
      
      // 🎯 MANEJO ESPECÍFICO DE ERRORES
      if (error.message?.includes('Invalid dateTime')) {
        throw new Error('Formato de fecha inválido. Use formato ISO 8601 (ej: 2025-08-20T15:00:00.000Z)');
      }
      
      if (error.code === 400) {
        const errorDetail = error.response?.data?.error?.message || error.message;
        throw new Error(`Error de validación: ${errorDetail}`);
      }
      
      if (error.code === 401 || error.code === 403) {
        throw new Error('Error de autenticación: Token inválido o permisos insuficientes');
      }
      
      if (error.code === 429) {
        throw new Error('Límite de API alcanzado. Intenta de nuevo en unos minutos');
      }
      
      throw new Error(`Error al crear evento: ${error.message}`);
    }
  }

  /**
   * ➕ Crear evento privado con token (CON AUTO-REFRESH)
   */
  async createPrivateEventWithToken(
    accessToken: string,
    cuentaGmailId: string,
    dto: CreateEventDto
  ) {
    try {
      this.logger.log(`➕ Creando evento PRIVADO para cuenta Gmail ${cuentaGmailId}`);

      const cuentaGmailIdNum = parseInt(cuentaGmailId);
      
      if (isNaN(cuentaGmailIdNum)) {
        throw new Error('cuentaGmailId debe ser un número válido');
      }

      // 🔄 OBTENER TOKEN VÁLIDO (con auto-refresh)
      const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: validAccessToken });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: dto.summary,
          location: dto.location,
          description: dto.description,
          start: { dateTime: dto.startDateTime },
          end: { dateTime: dto.endDateTime },
          visibility: 'private',
          attendees: dto.attendees?.map((email) => ({ email })) || [],
        },
      });

      // Guardar en BD en background
      if (!isNaN(cuentaGmailIdNum)) {
        this.saveEventToDB(response.data, cuentaGmailIdNum).catch(err => {
          this.logger.debug(`Background save error (ignorado):`, err);
        });
      }

      this.logger.log(`✅ Evento privado creado: ${response.data.id}`);
      return response.data;

    } catch (error) {
      this.logger.error('❌ Error creando evento privado:', error);
      throw new Error('Error al crear evento privado');
    }
  }

  /**
   * ✏️ Actualizar evento con token (CON AUTO-REFRESH)
   */
  async updateEventWithToken(
    accessToken: string,
    cuentaGmailId: string,
    eventId: string,
    eventBody: UpdateEventDto
  ) {
    try {
      this.logger.log(`✏️ Actualizando evento ${eventId} para cuenta Gmail ${cuentaGmailId}`);

      const cuentaGmailIdNum = parseInt(cuentaGmailId);
      
      if (isNaN(cuentaGmailIdNum)) {
        throw new Error('cuentaGmailId debe ser un número válido');
      }

      // 🔄 OBTENER TOKEN VÁLIDO (con auto-refresh)
      const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);
      
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: validAccessToken });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Convertir DTO a formato Google Calendar
      const updateData: any = {};
      if (eventBody.summary) updateData.summary = eventBody.summary;
      if (eventBody.location) updateData.location = eventBody.location;
      if (eventBody.description) updateData.description = eventBody.description;
      if (eventBody.startDateTime) updateData.start = { dateTime: eventBody.startDateTime };
      if (eventBody.endDateTime) updateData.end = { dateTime: eventBody.endDateTime };
      if (eventBody.attendees) updateData.attendees = eventBody.attendees.map(email => ({ email }));

      const response = await calendar.events.patch({
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'all',
        requestBody: updateData
      });

      // Actualizar en BD en background
      this.updateEventInDB(eventId, response.data, cuentaGmailIdNum).catch(err => {
        this.logger.debug(`Background update error (ignorado):`, err);
      });

      this.logger.log(`✅ Evento actualizado: ${eventId}`);
      return response.data;

    } catch (error) {
      this.logger.error(`❌ Error actualizando evento ${eventId}:`, error);
      throw new Error('Error al actualizar evento');
    }
  }

  /**
   * 🗑️ Eliminar evento con token (CON AUTO-REFRESH)
   */
  async deleteEventWithToken(
    accessToken: string,
    cuentaGmailId: string,
    eventId: string
  ) {
    try {
      this.logger.log(`🗑️ Eliminando evento ${eventId} para cuenta Gmail ${cuentaGmailId}`);

      const cuentaGmailIdNum = parseInt(cuentaGmailId);
      
      if (isNaN(cuentaGmailIdNum)) {
        throw new Error('cuentaGmailId debe ser un número válido');
      }

      // 🔄 OBTENER TOKEN VÁLIDO (con auto-refresh)
      const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);
      
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: validAccessToken });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'all'
      });

      // Eliminar de BD en background
      this.deleteEventFromDB(eventId).catch(err => {
        this.logger.debug(`Background delete error (ignorado):`, err);
      });

      this.logger.log(`✅ Evento eliminado: ${eventId}`);
      return { message: 'Evento eliminado correctamente' };

    } catch (error) {
      this.logger.error(`❌ Error eliminando evento ${eventId}:`, error);
      throw new Error('Error al eliminar evento');
    }
  }

  /**
   * 🤝 Compartir calendario con token (CON AUTO-REFRESH)
   */
  async shareCalendarWithToken(
    accessToken: string,
    cuentaGmailId: string,
    calendarId: string,
    userEmail: string,
    role: 'reader' | 'writer' | 'owner'
  ) {
    try {
      this.logger.log(`🤝 Compartiendo calendario con ${userEmail} como ${role}`);

      const cuentaGmailIdNum = parseInt(cuentaGmailId);
      
      if (isNaN(cuentaGmailIdNum)) {
        throw new Error('cuentaGmailId debe ser un número válido');
      }

      // 🔄 OBTENER TOKEN VÁLIDO (con auto-refresh)
      const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: validAccessToken });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const response = await calendar.acl.insert({
        calendarId,
        requestBody: {
          role,
          scope: {
            type: 'user',
            value: userEmail,
          },
        },
      });

      this.logger.log(`✅ Calendario compartido con ${userEmail}`);
      return response.data;

    } catch (error) {
      this.logger.error(`❌ Error compartiendo calendario:`, error);
      throw new Error('Error al compartir calendario');
    }
  }

  /**
   * 📊 Obtener estadísticas con token
   */
  async getCalendarStatsWithToken(accessToken: string, cuentaGmailId: string): Promise<CalendarStats> {
    try {
      this.logger.log(`📊 🎯 ESTADÍSTICAS para cuenta Gmail ${cuentaGmailId}`);
      
      const cuentaGmailIdNum = parseInt(cuentaGmailId);
      
      if (isNaN(cuentaGmailIdNum)) {
        throw new Error('cuentaGmailId debe ser un número válido');
      }

      // 1️⃣ ESTRATEGIA: Google Calendar API primero
      try {
        this.logger.log(`📡 Obteniendo stats desde Google Calendar API`);
        return await this.getStatsFromCalendarAPI(accessToken, cuentaGmailId);
        
      } catch {
        this.logger.warn(`⚠️ Calendar API no disponible para stats, usando BD local`);
        
        // 2️⃣ FALLBACK: BD local
        const dbStats = await this.databaseService.getEventStatsFromDB(cuentaGmailIdNum);
        
        if (dbStats.total_events > 0) {
          this.logger.log(`💾 FALLBACK stats desde BD: ${dbStats.total_events} eventos total`);
          
          return {
            totalEvents: dbStats.total_events,
            upcomingEvents: dbStats.upcoming_events,
            pastEvents: dbStats.past_events
          };
        } else {
          // Si no hay datos, retornar ceros
          return {
            totalEvents: 0,
            upcomingEvents: 0,
            pastEvents: 0
          };
        }
      }

    } catch (error) {
      this.logger.error('❌ Error obteniendo estadísticas:', error);
      throw new Error('Error al obtener estadísticas de Calendar');
    }
  }

  /**
   * 🔄 Sincronizar eventos con token (CON AUTO-REFRESH)
   */
  async syncEventsWithToken(
    accessToken: string,
    cuentaGmailId: string,
    options: SyncOptions = {}
  ) {
    try {
      this.logger.log(`🔄 🎉 INICIANDO SYNC para cuenta Gmail ${cuentaGmailId}`);
      
      const cuentaGmailIdNum = parseInt(cuentaGmailId);
      
      if (isNaN(cuentaGmailIdNum)) {
        throw new Error('cuentaGmailId debe ser un número válido');
      }
      
      // 🔄 OBTENER TOKEN VÁLIDO (con auto-refresh)
      const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);
      
      // Obtener eventos desde Google Calendar API
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: validAccessToken });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const timeMin = options.timeMin || new Date().toISOString();
      const maxResults = Math.min(options.maxEvents || 100, 250); // Límite de Calendar API
      
      // ✅ CORRECCIÓN: Convertir timeMax a string si existe
      const timeMaxString = options.timeMax ? 
        (typeof options.timeMax === 'string' ? options.timeMax : new Date(options.timeMax).toISOString()) 
        : undefined;

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax: timeMaxString,  // ✅ Usar string convertido
        maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items || [];
      this.logger.log(`📅 ¡Encontrados ${events.length} eventos en Calendar!`);

      if (events.length === 0) {
        return {
          success: true,
          message: 'No hay eventos nuevos para sincronizar',
          stats: {
            cuenta_gmail_id: cuentaGmailIdNum,
            events_nuevos: 0,
            events_actualizados: 0,
            tiempo_total_ms: 0
          }
        };
      }

      // Convertir a formato BD y guardar
      const eventsMetadata: EventMetadataDB[] = events.map(event => ({
        cuenta_gmail_id: cuentaGmailIdNum,
        google_event_id: event.id!,
        summary: event.summary || '',
        location: event.location || '',
        description: event.description || '',
        start_time: event.start?.dateTime ? new Date(event.start.dateTime) : undefined,
        end_time: event.end?.dateTime ? new Date(event.end.dateTime) : undefined,
        attendees: event.attendees?.map(a => a.email!).filter(Boolean) || []
      }));

      const syncResult = await this.databaseService.syncEventsMetadata(eventsMetadata);

      this.logger.log(`✅ Sync completado: ${syncResult.events_nuevos} nuevos, ${syncResult.events_actualizados} actualizados`);

      return {
        success: true,
        message: 'Sincronización completada exitosamente',
        stats: {
          cuenta_gmail_id: cuentaGmailIdNum,
          events_nuevos: syncResult.events_nuevos,
          events_actualizados: syncResult.events_actualizados,
          tiempo_total_ms: syncResult.tiempo_ms
        }
      };

    } catch (error) {
      this.logger.error(`❌ Error en sincronización:`, error);
      const calendarError = error as CalendarServiceError;
      throw new Error('Error sincronizando eventos: ' + calendarError.message);
    }
  }

  // ================================
  // 🔧 MÉTODOS PRIVADOS AUXILIARES
  // ================================

  /**
   * 📅 Obtener eventos desde Google Calendar API (CON AUTO-REFRESH)
   */
  private async getEventsFromCalendarAPI(
    accessToken: string,
    cuentaGmailId: string,
    timeMin: string,
    timeMax: string,  // ✅ CORRECCIÓN: Ahora siempre string
    page: number = 1,
    limit: number = 10
  ): Promise<CalendarListResponse> {
    const cuentaGmailIdNum = parseInt(cuentaGmailId);
    
    if (isNaN(cuentaGmailIdNum)) {
      throw new Error('cuentaGmailId debe ser un número válido');
    }

    // 🔄 OBTENER TOKEN VÁLIDO (con auto-refresh)
    const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: validAccessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // 🎯 Para paginación en Calendar API, usamos pageToken en lugar de skip/limit
    const maxResults = Math.min(limit * page, 250); // Calendar API limit
    
    // ✅ CORRECCIÓN: timeMax ya es string, no necesita conversión
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,  // ✅ Ya es string
      maxResults,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const allEvents = response.data.items || [];
    
    // Simular paginación manualmente
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEvents = allEvents.slice(startIndex, endIndex);
    
    const events = paginatedEvents.map(this.convertAPIToEventMetadata);
    const totalPages = Math.ceil(allEvents.length / limit);

    return {
      events,
      total: allEvents.length,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };
  }

  /**
   * 🔍 Buscar eventos desde Google Calendar API (CON AUTO-REFRESH)
   */
  private async searchEventsFromCalendarAPI(
    accessToken: string,
    cuentaGmailId: string,
    timeMin: string,
    searchTerm: string,
    page: number = 1,  // ✅ CORRECCIÓN: Solo number
    limit: number = 10
  ): Promise<CalendarListResponse> {
    const cuentaGmailIdNum = parseInt(cuentaGmailId);
    
    if (isNaN(cuentaGmailIdNum)) {
      throw new Error('cuentaGmailId debe ser un número válido');
    }

    // 🔄 OBTENER TOKEN VÁLIDO (con auto-refresh)
    const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: validAccessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // ✅ CORRECCIÓN: Asegurar operaciones con number
    const pageNumber = Number(page);
    const maxResults = Math.min(limit * pageNumber, 250);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      q: searchTerm,
      maxResults,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const allEvents = response.data.items || [];
    
    // Paginación manual con number
    const startIndex = (pageNumber - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEvents = allEvents.slice(startIndex, endIndex);
    
    const events = paginatedEvents.map(this.convertAPIToEventMetadata);
    const totalPages = Math.ceil(allEvents.length / limit);

    return {
      events,
      total: allEvents.length,
      page: pageNumber,  // ✅ Usar pageNumber
      limit,
      totalPages,
      hasNextPage: pageNumber < totalPages,  // ✅ Usar pageNumber
      hasPreviousPage: pageNumber > 1,       // ✅ Usar pageNumber
      searchTerm
    };
  }

  /**
   * 📊 Obtener estadísticas desde Google Calendar API (CON AUTO-REFRESH)
   */
  private async getStatsFromCalendarAPI(accessToken: string, cuentaGmailId: string): Promise<CalendarStats> {
    const cuentaGmailIdNum = parseInt(cuentaGmailId);
    
    if (isNaN(cuentaGmailIdNum)) {
      throw new Error('cuentaGmailId debe ser un número válido');
    }

    // 🔄 OBTENER TOKEN VÁLIDO (con auto-refresh)
    const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: validAccessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const now = new Date().toISOString();

    // Obtener eventos pasados y futuros en paralelo
    const [pastEvents, futureEvents] = await Promise.all([
      calendar.events.list({
        calendarId: 'primary',
        timeMax: now,
        maxResults: 250,
        singleEvents: true
      }),
      calendar.events.list({
        calendarId: 'primary',
        timeMin: now,
        maxResults: 250,
        singleEvents: true
      })
    ]);

    const pastCount = pastEvents.data.items?.length || 0;
    const futureCount = futureEvents.data.items?.length || 0;
    const totalCount = pastCount + futureCount;

    return {
      totalEvents: totalCount,
      upcomingEvents: futureCount,
      pastEvents: pastCount
    };
  }

  /**
   * 🔄 Convertir API response → EventMetadata
   */
  private convertAPIToEventMetadata(apiEvent: calendar_v3.Schema$Event): CalendarEventMetadata {
    return {
      id: apiEvent.id!,
      summary: apiEvent.summary || 'Sin título',
      location: apiEvent.location || undefined,
      description: apiEvent.description || undefined,
      startTime: new Date(apiEvent.start?.dateTime || apiEvent.start?.date || ''),
      endTime: new Date(apiEvent.end?.dateTime || apiEvent.end?.date || ''),
      attendees: apiEvent.attendees?.map(a => a.email!).filter(Boolean) || [],
      isAllDay: !!apiEvent.start?.date, // Si tiene date en lugar de dateTime, es todo el día
      status: apiEvent.status || 'confirmed'
    };
  }

  /**
   * 🔄 Convertir EventMetadataDB → EventMetadata
   */
  private convertDBToEventMetadata(dbEvent: EventMetadataDB): CalendarEventMetadata {
    return {
      id: dbEvent.google_event_id,
      summary: dbEvent.summary || 'Sin título',
      location: dbEvent.location,
      description: dbEvent.description,
      startTime: dbEvent.start_time || new Date(),
      endTime: dbEvent.end_time || new Date(),
      attendees: dbEvent.attendees || [],
      isAllDay: false, // Por ahora asumimos que no son de todo el día
      status: 'confirmed'
    };
  }

  /**
   * 💾 Guardar evento en BD (background)
   */
  private async saveEventToDB(event: any, cuentaGmailId: number): Promise<void> {
    try {
      const eventMetadata: EventMetadataDB = {
        cuenta_gmail_id: cuentaGmailId,
        google_event_id: event.id,
        summary: event.summary || '',
        location: event.location || '',
        description: event.description || '',
        start_time: event.start?.dateTime ? new Date(event.start.dateTime) : undefined,
        end_time: event.end?.dateTime ? new Date(event.end.dateTime) : undefined,
        attendees: event.attendees?.map((a: any) => a.email).filter(Boolean) || []
      };

      await this.databaseService.syncEventsMetadata([eventMetadata]);
      this.logger.log(`💾 Evento ${event.id} guardado en BD`);
    } catch (error) {
      this.logger.debug(`Background save error:`, error);
    }
  }

  /**
   * ✏️ Actualizar evento en BD (background)
   */
  private async updateEventInDB(eventId: string, event: any, cuentaGmailId: number): Promise<void> {
    try {
      // Por simplicidad, reutilizamos el método de sync que hace UPSERT
      await this.saveEventToDB(event, cuentaGmailId);
      this.logger.log(`✏️ Evento ${eventId} actualizado en BD`);
    } catch (error) {
      this.logger.debug(`Background update error:`, error);
    }
  }

  /**
   * 🗑️ Eliminar evento de BD (background)
   */
  private async deleteEventFromDB(eventId: string): Promise<void> {
    try {
      await this.databaseService.query(
        'DELETE FROM events_sincronizados WHERE google_event_id = $1',
        [eventId]
      );
      this.logger.log(`🗑️ Evento ${eventId} eliminado de BD`);
    } catch (error) {
      this.logger.debug(`Background delete error:`, error);
    }
  }



  // ================================
  // 🎯 MÉTODOS AUXILIARES PARA ENDPOINTS UNIFICADOS
  // ================================

  /**
   * 🔍 Obtener todas las cuentas Gmail de un usuario
   * Reutiliza la lógica del DatabaseService
   */
  async obtenerCuentasGmailUsuario(userId: number) {
    try {
      this.logger.log(`🔍 Obteniendo cuentas Gmail para usuario ${userId}`);
      
      // 🎯 USAR EL MÉTODO EXISTENTE DEL DATABASE SERVICE
      const cuentas = await this.databaseService.obtenerCuentasGmailUsuario(userId);
      
      this.logger.log(`📧 Usuario ${userId} tiene ${cuentas?.length || 0} cuentas Gmail`);
      
      return cuentas;
      
    } catch (error) {
      this.logger.error(`❌ Error obteniendo cuentas de usuario ${userId}:`, error);
      throw new Error(`Error obteniendo cuentas Gmail del usuario: ${error.message}`);
    }
  }

  /**
   * 🔑 Obtener token válido para una cuenta específica
   * Patrón idéntico al MS-Email
   */
  async getValidTokenForAccount(cuentaGmailId: number): Promise<string> {
    try {
      this.logger.log(`🔑 Obteniendo token para cuenta Gmail ${cuentaGmailId}`);
      
      // 🎯 CONSULTAR A MS-AUTH PARA OBTENER TOKEN (como MS-Email)
      const response = await fetch(`http://localhost:3001/tokens/gmail/${cuentaGmailId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error obteniendo token: ${response.status}`);
      }

      const tokenData = await response.json();

      if (!tokenData.success || !tokenData.accessToken) {
        throw new Error('Token no válido recibido de MS-Auth');
      }

      this.logger.log(`✅ Token obtenido exitosamente para cuenta Gmail ${cuentaGmailId}`);
      return tokenData.accessToken;

    } catch (error) {
      this.logger.error(`❌ Error obteniendo token para cuenta ${cuentaGmailId}:`, error);
      throw new Error(`No se pudo obtener token para cuenta Gmail ${cuentaGmailId}: ${error.message}`);
    }
  }
}