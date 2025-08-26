"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CalendarService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarService = void 0;
const common_1 = require("@nestjs/common");
const googleapis_1 = require("googleapis");
const config_1 = require("@nestjs/config");
const database_service_1 = require("../../core/database/database.service");
let CalendarService = CalendarService_1 = class CalendarService {
    configService;
    databaseService;
    logger = new common_1.Logger(CalendarService_1.name);
    constructor(configService, databaseService) {
        this.configService = configService;
        this.databaseService = databaseService;
    }
    async listEventsWithToken(accessToken, cuentaGmailId, timeMin, timeMax, page = 1, limit = 10) {
        try {
            this.logger.log(`📅 Listando eventos para cuenta Gmail ${cuentaGmailId} - Página ${page}`);
            const cuentaGmailIdNum = parseInt(cuentaGmailId);
            if (isNaN(cuentaGmailIdNum)) {
                throw new Error('cuentaGmailId debe ser un número válido');
            }
            try {
                this.logger.log(`📡 Obteniendo eventos desde Google Calendar API`);
                const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);
                if (!validAccessToken) {
                    throw new Error('No se pudo obtener token válido');
                }
                const oauth2Client = new googleapis_1.google.auth.OAuth2();
                oauth2Client.setCredentials({ access_token: validAccessToken });
                const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
                const maxTime = timeMax ?
                    (typeof timeMax === 'string' ? timeMax : new Date(timeMax).toISOString())
                    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                const maxResults = Math.min(limit * page, 250);
                const response = await calendar.events.list({
                    calendarId: 'primary',
                    timeMin,
                    timeMax: maxTime,
                    maxResults,
                    singleEvents: true,
                    orderBy: 'startTime'
                });
                const allEvents = response.data.items || [];
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
            }
            catch (apiError) {
                this.logger.error(`❌ Error en Calendar API, usando BD como fallback:`, apiError.message);
                const dbResult = await this.databaseService.getEventsPaginated(cuentaGmailIdNum, page, limit, true);
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
                throw apiError;
            }
        }
        catch (error) {
            this.logger.error('❌ Error obteniendo eventos:', {
                message: error.message,
                cuentaGmailId
            });
            throw new Error('Error al consultar eventos: ' + error.message);
        }
    }
    async searchEventsWithToken(accessToken, cuentaGmailId, timeMin, searchTerm, page = 1, limit = 10) {
        try {
            this.logger.log(`🔍 Buscando eventos "${searchTerm}" para cuenta Gmail ${cuentaGmailId}`);
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
            try {
                this.logger.log(`🌐 Buscando en Google Calendar API`);
                const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);
                if (!validAccessToken) {
                    throw new Error('No se pudo obtener token válido');
                }
                const oauth2Client = new googleapis_1.google.auth.OAuth2();
                oauth2Client.setCredentials({ access_token: validAccessToken });
                const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
                const maxResults = Math.min(limit * page, 250);
                const response = await calendar.events.list({
                    calendarId: 'primary',
                    timeMin,
                    q: searchTerm.trim(),
                    maxResults,
                    singleEvents: true,
                    orderBy: 'startTime'
                });
                const allEvents = response.data.items || [];
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
            }
            catch (apiError) {
                this.logger.warn(`⚠️ Calendar API falló para búsqueda, intentando BD como fallback:`, apiError.message);
                const filters = {
                    search_text: searchTerm.trim(),
                    start_date: new Date(timeMin)
                };
                const searchResult = await this.databaseService.searchEventsInDB(cuentaGmailIdNum, filters, page, limit);
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
        }
        catch (error) {
            this.logger.error('❌ Error en búsqueda de eventos:', {
                message: error.message,
                searchTerm,
                cuentaGmailId
            });
            throw new Error(`Error al buscar eventos: ${error.message}`);
        }
    }
    async getEventByIdWithToken(accessToken, cuentaGmailId, eventId) {
        try {
            this.logger.log(`📋 Obteniendo evento ${eventId} para cuenta Gmail ${cuentaGmailId}`);
            const cuentaGmailIdNum = parseInt(cuentaGmailId);
            if (isNaN(cuentaGmailIdNum)) {
                throw new Error('cuentaGmailId debe ser un número válido');
            }
            if (!eventId || eventId.trim() === '') {
                throw new Error('eventId es requerido');
            }
            const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);
            const oauth2Client = new googleapis_1.google.auth.OAuth2();
            oauth2Client.setCredentials({ access_token: validAccessToken });
            const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
            const response = await calendar.events.get({
                calendarId: 'primary',
                eventId: eventId
            });
            if (!response.data) {
                throw new Error(`Evento ${eventId} not found`);
            }
            const event = response.data;
            const formattedEvent = {
                id: event.id,
                summary: event.summary || 'Sin título',
                location: event.location || '',
                description: event.description || '',
                startTime: event.start?.dateTime || event.start?.date || '',
                endTime: event.end?.dateTime || event.end?.date || '',
                attendees: event.attendees?.map((attendee) => attendee.email).filter(Boolean) || [],
                isAllDay: !event.start?.dateTime,
                status: event.status || 'confirmed',
                sourceAccount: undefined,
                sourceAccountId: cuentaGmailIdNum,
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
        }
        catch (error) {
            this.logger.error(`❌ Error obteniendo evento ${eventId}:`, error);
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
    async createEventWithToken(accessToken, cuentaGmailId, eventBody) {
        try {
            this.logger.log(`➕ Creando evento "${eventBody.summary || 'Sin título'}" para cuenta Gmail ${cuentaGmailId}`);
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
            const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);
            if (!validAccessToken) {
                throw new Error('No se pudo obtener token válido para la cuenta');
            }
            const oauth2Client = new googleapis_1.google.auth.OAuth2();
            oauth2Client.setCredentials({ access_token: validAccessToken });
            const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
            const googleEvent = {
                summary: eventBody.summary,
                start: {
                    dateTime: eventBody.startDateTime
                },
                end: {
                    dateTime: eventBody.endDateTime
                }
            };
            if (eventBody.location && eventBody.location.trim()) {
                googleEvent.location = eventBody.location.trim();
            }
            if (eventBody.description && eventBody.description.trim()) {
                googleEvent.description = eventBody.description.trim();
            }
            if (eventBody.attendees && Array.isArray(eventBody.attendees) && eventBody.attendees.length > 0) {
                const validAttendees = eventBody.attendees
                    .filter((email) => email && email.trim() && email.includes('@'))
                    .map((email) => ({ email: email.trim() }));
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
            const response = await calendar.events.insert({
                calendarId: 'primary',
                sendUpdates: googleEvent.attendees ? 'all' : 'none',
                requestBody: googleEvent
            });
            if (!response.data || !response.data.id) {
                throw new Error('Google Calendar no devolvió un evento válido');
            }
            this.saveEventToDB(response.data, cuentaGmailIdNum).catch(err => {
                this.logger.debug(`Background save error (ignorado):`, err);
            });
            this.logger.log(`✅ Evento creado exitosamente: ${response.data.id}`);
            this.logger.log(`🔗 Link del evento: ${response.data.htmlLink}`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`❌ Error creando evento:`, {
                message: error.message,
                code: error.code,
                eventSummary: eventBody?.summary || 'N/A'
            });
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
    async createPrivateEventWithToken(accessToken, cuentaGmailId, dto) {
        try {
            this.logger.log(`➕ Creando evento PRIVADO para cuenta Gmail ${cuentaGmailId}`);
            const cuentaGmailIdNum = parseInt(cuentaGmailId);
            if (isNaN(cuentaGmailIdNum)) {
                throw new Error('cuentaGmailId debe ser un número válido');
            }
            const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);
            const oauth2Client = new googleapis_1.google.auth.OAuth2();
            oauth2Client.setCredentials({ access_token: validAccessToken });
            const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
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
            if (!isNaN(cuentaGmailIdNum)) {
                this.saveEventToDB(response.data, cuentaGmailIdNum).catch(err => {
                    this.logger.debug(`Background save error (ignorado):`, err);
                });
            }
            this.logger.log(`✅ Evento privado creado: ${response.data.id}`);
            return response.data;
        }
        catch (error) {
            this.logger.error('❌ Error creando evento privado:', error);
            throw new Error('Error al crear evento privado');
        }
    }
    async updateEventWithToken(accessToken, cuentaGmailId, eventId, eventBody) {
        try {
            this.logger.log(`✏️ Actualizando evento ${eventId} para cuenta Gmail ${cuentaGmailId}`);
            const cuentaGmailIdNum = parseInt(cuentaGmailId);
            if (isNaN(cuentaGmailIdNum)) {
                throw new Error('cuentaGmailId debe ser un número válido');
            }
            const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);
            const oauth2Client = new googleapis_1.google.auth.OAuth2();
            oauth2Client.setCredentials({ access_token: validAccessToken });
            const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
            const updateData = {};
            if (eventBody.summary)
                updateData.summary = eventBody.summary;
            if (eventBody.location)
                updateData.location = eventBody.location;
            if (eventBody.description)
                updateData.description = eventBody.description;
            if (eventBody.startDateTime)
                updateData.start = { dateTime: eventBody.startDateTime };
            if (eventBody.endDateTime)
                updateData.end = { dateTime: eventBody.endDateTime };
            if (eventBody.attendees)
                updateData.attendees = eventBody.attendees.map(email => ({ email }));
            const response = await calendar.events.patch({
                calendarId: 'primary',
                eventId: eventId,
                sendUpdates: 'all',
                requestBody: updateData
            });
            this.updateEventInDB(eventId, response.data, cuentaGmailIdNum).catch(err => {
                this.logger.debug(`Background update error (ignorado):`, err);
            });
            this.logger.log(`✅ Evento actualizado: ${eventId}`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`❌ Error actualizando evento ${eventId}:`, error);
            throw new Error('Error al actualizar evento');
        }
    }
    async deleteEventWithToken(accessToken, cuentaGmailId, eventId) {
        try {
            this.logger.log(`🗑️ Eliminando evento ${eventId} para cuenta Gmail ${cuentaGmailId}`);
            const cuentaGmailIdNum = parseInt(cuentaGmailId);
            if (isNaN(cuentaGmailIdNum)) {
                throw new Error('cuentaGmailId debe ser un número válido');
            }
            const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);
            const oauth2Client = new googleapis_1.google.auth.OAuth2();
            oauth2Client.setCredentials({ access_token: validAccessToken });
            const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
            await calendar.events.delete({
                calendarId: 'primary',
                eventId: eventId,
                sendUpdates: 'all'
            });
            this.deleteEventFromDB(eventId).catch(err => {
                this.logger.debug(`Background delete error (ignorado):`, err);
            });
            this.logger.log(`✅ Evento eliminado: ${eventId}`);
            return { message: 'Evento eliminado correctamente' };
        }
        catch (error) {
            this.logger.error(`❌ Error eliminando evento ${eventId}:`, error);
            throw new Error('Error al eliminar evento');
        }
    }
    async shareCalendarWithToken(accessToken, cuentaGmailId, calendarId, userEmail, role) {
        try {
            this.logger.log(`🤝 Compartiendo calendario con ${userEmail} como ${role}`);
            const cuentaGmailIdNum = parseInt(cuentaGmailId);
            if (isNaN(cuentaGmailIdNum)) {
                throw new Error('cuentaGmailId debe ser un número válido');
            }
            const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);
            const oauth2Client = new googleapis_1.google.auth.OAuth2();
            oauth2Client.setCredentials({ access_token: validAccessToken });
            const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
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
        }
        catch (error) {
            this.logger.error(`❌ Error compartiendo calendario:`, error);
            throw new Error('Error al compartir calendario');
        }
    }
    async getCalendarStatsWithToken(accessToken, cuentaGmailId) {
        try {
            this.logger.log(`📊 🎯 ESTADÍSTICAS para cuenta Gmail ${cuentaGmailId}`);
            const cuentaGmailIdNum = parseInt(cuentaGmailId);
            if (isNaN(cuentaGmailIdNum)) {
                throw new Error('cuentaGmailId debe ser un número válido');
            }
            try {
                this.logger.log(`📡 Obteniendo stats desde Google Calendar API`);
                return await this.getStatsFromCalendarAPI(accessToken, cuentaGmailId);
            }
            catch {
                this.logger.warn(`⚠️ Calendar API no disponible para stats, usando BD local`);
                const dbStats = await this.databaseService.getEventStatsFromDB(cuentaGmailIdNum);
                if (dbStats.total_events > 0) {
                    this.logger.log(`💾 FALLBACK stats desde BD: ${dbStats.total_events} eventos total`);
                    return {
                        totalEvents: dbStats.total_events,
                        upcomingEvents: dbStats.upcoming_events,
                        pastEvents: dbStats.past_events
                    };
                }
                else {
                    return {
                        totalEvents: 0,
                        upcomingEvents: 0,
                        pastEvents: 0
                    };
                }
            }
        }
        catch (error) {
            this.logger.error('❌ Error obteniendo estadísticas:', error);
            throw new Error('Error al obtener estadísticas de Calendar');
        }
    }
    async syncEventsWithToken(accessToken, cuentaGmailId, options = {}) {
        try {
            this.logger.log(`🔄 🎉 INICIANDO SYNC para cuenta Gmail ${cuentaGmailId}`);
            const cuentaGmailIdNum = parseInt(cuentaGmailId);
            if (isNaN(cuentaGmailIdNum)) {
                throw new Error('cuentaGmailId debe ser un número válido');
            }
            const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);
            const oauth2Client = new googleapis_1.google.auth.OAuth2();
            oauth2Client.setCredentials({ access_token: validAccessToken });
            const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
            const timeMin = options.timeMin || new Date().toISOString();
            const maxResults = Math.min(options.maxEvents || 100, 250);
            const timeMaxString = options.timeMax ?
                (typeof options.timeMax === 'string' ? options.timeMax : new Date(options.timeMax).toISOString())
                : undefined;
            const response = await calendar.events.list({
                calendarId: 'primary',
                timeMin,
                timeMax: timeMaxString,
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
            const eventsMetadata = events.map(event => ({
                cuenta_gmail_id: cuentaGmailIdNum,
                google_event_id: event.id,
                summary: event.summary || '',
                location: event.location || '',
                description: event.description || '',
                start_time: event.start?.dateTime ? new Date(event.start.dateTime) : undefined,
                end_time: event.end?.dateTime ? new Date(event.end.dateTime) : undefined,
                attendees: event.attendees?.map(a => a.email).filter(Boolean) || []
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
        }
        catch (error) {
            this.logger.error(`❌ Error en sincronización:`, error);
            const calendarError = error;
            throw new Error('Error sincronizando eventos: ' + calendarError.message);
        }
    }
    async getEventsFromCalendarAPI(accessToken, cuentaGmailId, timeMin, timeMax, page = 1, limit = 10) {
        const cuentaGmailIdNum = parseInt(cuentaGmailId);
        if (isNaN(cuentaGmailIdNum)) {
            throw new Error('cuentaGmailId debe ser un número válido');
        }
        const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);
        const oauth2Client = new googleapis_1.google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: validAccessToken });
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
        const maxResults = Math.min(limit * page, 250);
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin,
            timeMax,
            maxResults,
            singleEvents: true,
            orderBy: 'startTime'
        });
        const allEvents = response.data.items || [];
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
    async searchEventsFromCalendarAPI(accessToken, cuentaGmailId, timeMin, searchTerm, page = 1, limit = 10) {
        const cuentaGmailIdNum = parseInt(cuentaGmailId);
        if (isNaN(cuentaGmailIdNum)) {
            throw new Error('cuentaGmailId debe ser un número válido');
        }
        const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);
        const oauth2Client = new googleapis_1.google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: validAccessToken });
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
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
        const startIndex = (pageNumber - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedEvents = allEvents.slice(startIndex, endIndex);
        const events = paginatedEvents.map(this.convertAPIToEventMetadata);
        const totalPages = Math.ceil(allEvents.length / limit);
        return {
            events,
            total: allEvents.length,
            page: pageNumber,
            limit,
            totalPages,
            hasNextPage: pageNumber < totalPages,
            hasPreviousPage: pageNumber > 1,
            searchTerm
        };
    }
    async getStatsFromCalendarAPI(accessToken, cuentaGmailId) {
        const cuentaGmailIdNum = parseInt(cuentaGmailId);
        if (isNaN(cuentaGmailIdNum)) {
            throw new Error('cuentaGmailId debe ser un número válido');
        }
        const validAccessToken = await this.databaseService.getValidAccessToken(cuentaGmailIdNum);
        const oauth2Client = new googleapis_1.google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: validAccessToken });
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
        const now = new Date().toISOString();
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
    convertAPIToEventMetadata(apiEvent) {
        return {
            id: apiEvent.id,
            summary: apiEvent.summary || 'Sin título',
            location: apiEvent.location || undefined,
            description: apiEvent.description || undefined,
            startTime: new Date(apiEvent.start?.dateTime || apiEvent.start?.date || ''),
            endTime: new Date(apiEvent.end?.dateTime || apiEvent.end?.date || ''),
            attendees: apiEvent.attendees?.map(a => a.email).filter(Boolean) || [],
            isAllDay: !!apiEvent.start?.date,
            status: apiEvent.status || 'confirmed'
        };
    }
    convertDBToEventMetadata(dbEvent) {
        return {
            id: dbEvent.google_event_id,
            summary: dbEvent.summary || 'Sin título',
            location: dbEvent.location,
            description: dbEvent.description,
            startTime: dbEvent.start_time || new Date(),
            endTime: dbEvent.end_time || new Date(),
            attendees: dbEvent.attendees || [],
            isAllDay: false,
            status: 'confirmed'
        };
    }
    async saveEventToDB(event, cuentaGmailId) {
        try {
            const eventMetadata = {
                cuenta_gmail_id: cuentaGmailId,
                google_event_id: event.id,
                summary: event.summary || '',
                location: event.location || '',
                description: event.description || '',
                start_time: event.start?.dateTime ? new Date(event.start.dateTime) : undefined,
                end_time: event.end?.dateTime ? new Date(event.end.dateTime) : undefined,
                attendees: event.attendees?.map((a) => a.email).filter(Boolean) || []
            };
            await this.databaseService.syncEventsMetadata([eventMetadata]);
            this.logger.log(`💾 Evento ${event.id} guardado en BD`);
        }
        catch (error) {
            this.logger.debug(`Background save error:`, error);
        }
    }
    async updateEventInDB(eventId, event, cuentaGmailId) {
        try {
            await this.saveEventToDB(event, cuentaGmailId);
            this.logger.log(`✏️ Evento ${eventId} actualizado en BD`);
        }
        catch (error) {
            this.logger.debug(`Background update error:`, error);
        }
    }
    async deleteEventFromDB(eventId) {
        try {
            await this.databaseService.query('DELETE FROM events_sincronizados WHERE google_event_id = $1', [eventId]);
            this.logger.log(`🗑️ Evento ${eventId} eliminado de BD`);
        }
        catch (error) {
            this.logger.debug(`Background delete error:`, error);
        }
    }
    async obtenerCuentasGmailUsuario(userId) {
        try {
            this.logger.log(`🔍 Obteniendo cuentas Gmail para usuario ${userId}`);
            const cuentas = await this.databaseService.obtenerCuentasGmailUsuario(userId);
            this.logger.log(`📧 Usuario ${userId} tiene ${cuentas?.length || 0} cuentas Gmail`);
            return cuentas;
        }
        catch (error) {
            this.logger.error(`❌ Error obteniendo cuentas de usuario ${userId}:`, error);
            throw new Error(`Error obteniendo cuentas Gmail del usuario: ${error.message}`);
        }
    }
    async getValidTokenForAccount(cuentaGmailId) {
        try {
            this.logger.log(`🔑 Obteniendo token para cuenta Gmail ${cuentaGmailId}`);
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
        }
        catch (error) {
            this.logger.error(`❌ Error obteniendo token para cuenta ${cuentaGmailId}:`, error);
            throw new Error(`No se pudo obtener token para cuenta Gmail ${cuentaGmailId}: ${error.message}`);
        }
    }
};
exports.CalendarService = CalendarService;
exports.CalendarService = CalendarService = CalendarService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        database_service_1.DatabaseService])
], CalendarService);
//# sourceMappingURL=calendar.service.js.map