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
  timeMax?: string;
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
    timeMax?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<CalendarListResponse> {
    try {
      this.logger.log(`📅 🎯 LISTANDO eventos para cuenta Gmail ${cuentaGmailId}`);

      const cuentaGmailIdNum = parseInt(cuentaGmailId);
      
      if (isNaN(cuentaGmailIdNum)) {
        throw new Error('cuentaGmailId debe ser un número válido');
      }

      // 🎯 ESTRATEGIA: Google Calendar API primero (como MS-Email)
      try {
        this.logger.log(`📡 Obteniendo eventos desde Google Calendar API`);
        return await this.getEventsFromCalendarAPI(accessToken, timeMin, timeMax, page, limit);
        
      } catch (apiError) {
        this.logger.error(`❌ Error en Calendar API:`, apiError);
        
        // 🎯 FALLBACK: BD local si falla API
        this.logger.warn(`⚠️ Google Calendar API falló, usando BD como fallback`);
        
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

    } catch (error) {
      this.logger.error('❌ Error obteniendo eventos:', error);
      const calendarError = error as CalendarServiceError;
      throw new Error('Error al consultar eventos: ' + calendarError.message);
    }
  }

  /**
   * 🔍 Buscar eventos con token - PATRÓN MS-EMAIL
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
      this.logger.log(`🔍 🎯 BÚSQUEDA eventos "${searchTerm}" para cuenta Gmail ${cuentaGmailId}`);

      const cuentaGmailIdNum = parseInt(cuentaGmailId);

      if (isNaN(cuentaGmailIdNum)) {
        throw new Error('cuentaGmailId debe ser un número válido');
      }

      // 🎯 ESTRATEGIA: Google Calendar API primero
      try {
        this.logger.log(`🌐 Buscando en Google Calendar API`);
        return await this.searchEventsFromCalendarAPI(accessToken, timeMin, searchTerm, page, limit);
        
      } catch {
        this.logger.warn(`⚠️ Calendar API falló, intentando BD como fallback`);
        
        // Fallback a BD
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

        return {
          events,
          total: searchResult.total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
          searchTerm
        };
      }

    } catch (error) {
      this.logger.error('❌ Error en búsqueda de eventos:', error);
      const calendarError = error as CalendarServiceError;
      throw new Error('Error al buscar eventos: ' + calendarError.message);
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
      this.logger.log(`➕ Creando evento para cuenta Gmail ${cuentaGmailId}`);

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
        sendUpdates: 'all',
        requestBody: eventBody
      });

      // 🎯 GUARDAR EN BD EN BACKGROUND (como MS-Email)
      if (!isNaN(cuentaGmailIdNum)) {
        this.saveEventToDB(response.data, cuentaGmailIdNum).catch(err => {
          this.logger.debug(`Background save error (ignorado):`, err);
        });
      }

      this.logger.log(`✅ Evento creado: ${response.data.id}`);
      return response.data;

    } catch (error) {
      this.logger.error('❌ Error creando evento:', error);
      throw new Error('Error al crear evento');
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

  // ================================
 
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
s

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
        return await this.getStatsFromCalendarAPI(accessToken);
        
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

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax: options.timeMax,
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
    timeMax?: string,
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
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
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

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      q: searchTerm,
      maxResults: Math.min(limit * page, 250),
      singleEvents: true,
      orderBy: 'startTime'
    });

    const allEvents = response.data.items || [];
    
    // Paginación manual
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
      hasPreviousPage: page > 1,
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
      isAllDay: !!apiEvent.start?.date, // Si tiene date en lugar de dateTime, es toddo el día
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
      isAllDay: false, // Por ahora asumimos que no son de toddo el día
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
}