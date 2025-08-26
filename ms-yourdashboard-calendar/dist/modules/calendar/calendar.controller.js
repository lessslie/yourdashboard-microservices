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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CalendarController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const calendar_service_1 = require("./calendar.service");
const create_event_dto_1 = require("./dto/create-event.dto");
const share_calendar_dto_1 = require("./dto/share-calendar.dto");
const update_event_dto_1 = require("./dto/update-event.dto");
const config_1 = require("@nestjs/config");
let CalendarController = CalendarController_1 = class CalendarController {
    calendarService;
    configService;
    logger = new common_1.Logger(CalendarController_1.name);
    constructor(calendarService, configService) {
        this.calendarService = calendarService;
        this.configService = configService;
    }
    getHealth() {
        return {
            service: 'ms-yourdashboard-calendar',
            status: 'OK',
            timestamp: new Date().toISOString(),
            port: process.env.PORT || 3005,
            mode: 'microservices'
        };
    }
    async listEvents(authHeader, cuentaGmailId, timeMin, timeMax, page, limit) {
        if (!cuentaGmailId) {
            throw new common_1.BadRequestException('cuentaGmailId is required');
        }
        if (!authHeader) {
            throw new common_1.UnauthorizedException('Authorization header is required');
        }
        const accessToken = authHeader.replace('Bearer ', '');
        if (!accessToken) {
            throw new common_1.UnauthorizedException('Valid Bearer token is required');
        }
        if (!timeMin) {
            throw new common_1.BadRequestException('timeMin is required');
        }
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 10;
        return this.calendarService.listEventsWithToken(accessToken, cuentaGmailId, timeMin, timeMax, pageNum, limitNum);
    }
    async searchEvents(authHeader, cuentaGmailId, timeMin, searchTerm, page, limit) {
        if (!cuentaGmailId) {
            throw new common_1.BadRequestException('cuentaGmailId is required');
        }
        if (!authHeader) {
            throw new common_1.UnauthorizedException('Authorization header is required');
        }
        if (!timeMin) {
            throw new common_1.BadRequestException('timeMin is required');
        }
        if (!searchTerm || searchTerm.trim() === '') {
            const pageNum = page ? parseInt(page, 10) : 1;
            const limitNum = limit ? parseInt(limit, 10) : 10;
            return {
                events: [],
                total: 0,
                page: pageNum,
                limit: limitNum,
                totalPages: 0,
                hasNextPage: false,
                hasPreviousPage: false,
                searchTerm: searchTerm || ''
            };
        }
        const accessToken = authHeader.replace('Bearer ', '');
        if (!accessToken) {
            throw new common_1.UnauthorizedException('Valid Bearer token is required');
        }
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 10;
        return this.calendarService.searchEventsWithToken(accessToken, cuentaGmailId, timeMin, searchTerm, pageNum, limitNum);
    }
    async getEventById(authHeader, eventId, cuentaGmailId) {
        if (!cuentaGmailId) {
            throw new common_1.BadRequestException('cuentaGmailId is required');
        }
        if (!authHeader) {
            throw new common_1.UnauthorizedException('Authorization header is required');
        }
        const accessToken = authHeader.replace('Bearer ', '');
        if (!accessToken) {
            throw new common_1.UnauthorizedException('Valid Bearer token is required');
        }
        if (!eventId || eventId.trim() === '') {
            throw new common_1.BadRequestException('eventId is required');
        }
        return this.calendarService.getEventByIdWithToken(accessToken, cuentaGmailId, eventId);
    }
    async createEvent(authHeader, cuentaGmailId, eventBody) {
        if (!cuentaGmailId) {
            throw new common_1.BadRequestException('cuentaGmailId is required');
        }
        if (!authHeader) {
            throw new common_1.UnauthorizedException('Authorization header is required');
        }
        const accessToken = authHeader.replace('Bearer ', '');
        if (!accessToken) {
            throw new common_1.UnauthorizedException('Valid Bearer token is required');
        }
        return this.calendarService.createEventWithToken(accessToken, cuentaGmailId, eventBody);
    }
    async createPrivateEvent(authHeader, cuentaGmailId, dto) {
        if (!cuentaGmailId) {
            throw new common_1.BadRequestException('cuentaGmailId is required');
        }
        if (!authHeader) {
            throw new common_1.UnauthorizedException('Authorization header is required');
        }
        const accessToken = authHeader.replace('Bearer ', '');
        if (!accessToken) {
            throw new common_1.UnauthorizedException('Valid Bearer token is required');
        }
        return this.calendarService.createPrivateEventWithToken(accessToken, cuentaGmailId, dto);
    }
    async shareCalendar(authHeader, cuentaGmailId, body) {
        if (!cuentaGmailId) {
            throw new common_1.BadRequestException('cuentaGmailId is required');
        }
        if (!authHeader) {
            throw new common_1.UnauthorizedException('Authorization header is required');
        }
        const accessToken = authHeader.replace('Bearer ', '');
        if (!accessToken) {
            throw new common_1.UnauthorizedException('Valid Bearer token is required');
        }
        return this.calendarService.shareCalendarWithToken(accessToken, cuentaGmailId, body.calendarId, body.userEmail, body.role);
    }
    async getCalendarStats(authHeader, cuentaGmailId) {
        if (!cuentaGmailId) {
            throw new common_1.BadRequestException('cuentaGmailId is required');
        }
        if (!authHeader) {
            throw new common_1.UnauthorizedException('Authorization header is required');
        }
        const accessToken = authHeader.replace('Bearer ', '');
        if (!accessToken) {
            throw new common_1.UnauthorizedException('Valid Bearer token is required');
        }
        return this.calendarService.getCalendarStatsWithToken(accessToken, cuentaGmailId);
    }
    async syncEvents(authHeader, cuentaGmailId, maxEvents) {
        if (!cuentaGmailId) {
            throw new common_1.BadRequestException('cuentaGmailId is required');
        }
        if (!authHeader) {
            throw new common_1.UnauthorizedException('Authorization header is required');
        }
        const accessToken = authHeader.replace('Bearer ', '');
        if (!accessToken) {
            throw new common_1.UnauthorizedException('Valid Bearer token is required');
        }
        const maxEventsNum = maxEvents ? parseInt(maxEvents, 10) : 100;
        return this.calendarService.syncEventsWithToken(accessToken, cuentaGmailId, {
            maxEvents: maxEventsNum
        });
    }
    async updateEvent(authHeader, cuentaGmailId, eventId, eventBody) {
        if (!cuentaGmailId) {
            throw new common_1.BadRequestException('cuentaGmailId is required');
        }
        if (!authHeader) {
            throw new common_1.UnauthorizedException('Authorization header is required');
        }
        const accessToken = authHeader.replace('Bearer ', '');
        if (!accessToken) {
            throw new common_1.UnauthorizedException('Valid Bearer token is required');
        }
        if (!eventId) {
            throw new common_1.BadRequestException('eventId is required');
        }
        return this.calendarService.updateEventWithToken(accessToken, cuentaGmailId, eventId, eventBody);
    }
    async deleteEvent(authHeader, cuentaGmailId, eventId) {
        if (!cuentaGmailId) {
            throw new common_1.BadRequestException('cuentaGmailId is required');
        }
        if (!authHeader) {
            throw new common_1.UnauthorizedException('Authorization header is required');
        }
        const accessToken = authHeader.replace('Bearer ', '');
        if (!accessToken) {
            throw new common_1.UnauthorizedException('Valid Bearer token is required');
        }
        if (!eventId) {
            throw new common_1.BadRequestException('eventId is required');
        }
        return this.calendarService.deleteEventWithToken(accessToken, cuentaGmailId, eventId);
    }
    async getEventsUnified(userId, timeMin, timeMax, page, limit) {
        this.logger.log(`🔥 📅 EVENTOS UNIFICADOS para usuario ${userId} - Página ${page || 1}`);
        if (!userId) {
            throw new common_1.BadRequestException('userId is required');
        }
        if (!timeMin) {
            throw new common_1.BadRequestException('timeMin is required');
        }
        const userIdNum = parseInt(userId, 10);
        if (isNaN(userIdNum)) {
            throw new common_1.BadRequestException('userId debe ser un número válido');
        }
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 10;
        try {
            const cuentasGmail = await this.calendarService.obtenerCuentasGmailUsuario(userIdNum);
            if (!cuentasGmail || cuentasGmail.length === 0) {
                this.logger.warn(`⚠️ Usuario ${userId} no tiene cuentas Gmail conectadas`);
                return {
                    events: [],
                    total: 0,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: 0,
                    hasNextPage: false,
                    hasPreviousPage: false,
                    accountsLoaded: []
                };
            }
            this.logger.log(`📧 Usuario ${userId} tiene ${cuentasGmail.length} cuentas Gmail`);
            const eventosPromises = cuentasGmail.map(async (cuenta) => {
                try {
                    this.logger.log(`📅 Obteniendo eventos de cuenta: ${cuenta.email_gmail} (ID: ${cuenta.id})`);
                    const accessToken = await this.calendarService.getValidTokenForAccount(cuenta.id);
                    const eventosCuenta = await this.calendarService.listEventsWithToken(accessToken, cuenta.id.toString(), timeMin, timeMax, 1, 100);
                    const eventosConCuenta = eventosCuenta.events.map(evento => ({
                        ...evento,
                        sourceAccount: cuenta.email_gmail,
                        sourceAccountId: cuenta.id
                    }));
                    this.logger.log(`✅ Cuenta ${cuenta.email_gmail}: ${eventosConCuenta.length} eventos obtenidos`);
                    return {
                        cuenta: cuenta.email_gmail,
                        eventos: eventosConCuenta,
                        total: eventosCuenta.total
                    };
                }
                catch (error) {
                    this.logger.warn(`⚠️ Error obteniendo eventos de cuenta ${cuenta.email_gmail}:`, error);
                    return {
                        cuenta: cuenta.email_gmail,
                        eventos: [],
                        total: 0
                    };
                }
            });
            const resultadosPorCuenta = await Promise.all(eventosPromises);
            const todosLosEventos = resultadosPorCuenta
                .filter(resultado => resultado.eventos.length > 0)
                .flatMap(resultado => resultado.eventos);
            todosLosEventos.sort((a, b) => {
                const fechaA = new Date(a.startTime).getTime();
                const fechaB = new Date(b.startTime).getTime();
                return fechaB - fechaA;
            });
            const totalEventos = todosLosEventos.length;
            const startIndex = (pageNum - 1) * limitNum;
            const endIndex = startIndex + limitNum;
            const eventosPaginados = todosLosEventos.slice(startIndex, endIndex);
            const totalPages = Math.ceil(totalEventos / limitNum);
            const hasNextPage = pageNum < totalPages;
            const hasPreviousPage = pageNum > 1;
            const accountsLoaded = resultadosPorCuenta.map(resultado => resultado.cuenta);
            this.logger.log(`✅ EVENTOS UNIFICADOS COMPLETADOS:`);
            this.logger.log(`   📊 Total eventos encontrados: ${totalEventos}`);
            this.logger.log(`   📧 Cuentas cargadas: ${accountsLoaded.join(', ')}`);
            this.logger.log(`   📄 Página ${pageNum}/${totalPages} (${eventosPaginados.length} eventos)`);
            return {
                events: eventosPaginados,
                total: totalEventos,
                page: pageNum,
                limit: limitNum,
                totalPages,
                hasNextPage,
                hasPreviousPage,
                accountsLoaded
            };
        }
        catch (error) {
            this.logger.error('❌ Error en eventos unificados:', error);
            throw new common_1.BadRequestException(`Error obteniendo eventos unificados: ${error.message}`);
        }
    }
    async searchEventsGlobal(userId, timeMin, searchTerm, page, limit) {
        this.logger.log(`🌐 🔍 BÚSQUEDA GLOBAL "${searchTerm}" para usuario ${userId} - Página ${page || 1}`);
        if (!userId) {
            throw new common_1.BadRequestException('userId is required');
        }
        if (!timeMin) {
            throw new common_1.BadRequestException('timeMin is required');
        }
        if (!searchTerm || searchTerm.trim() === '') {
            throw new common_1.BadRequestException('q (término de búsqueda) is required');
        }
        const userIdNum = parseInt(userId, 10);
        if (isNaN(userIdNum)) {
            throw new common_1.BadRequestException('userId debe ser un número válido');
        }
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 10;
        try {
            const cuentasGmail = await this.calendarService.obtenerCuentasGmailUsuario(userIdNum);
            if (!cuentasGmail || cuentasGmail.length === 0) {
                this.logger.warn(`⚠️ Usuario ${userId} no tiene cuentas Gmail conectadas`);
                return {
                    events: [],
                    total: 0,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: 0,
                    hasNextPage: false,
                    hasPreviousPage: false,
                    searchTerm,
                    accountsSearched: []
                };
            }
            this.logger.log(`📧 Usuario ${userId} tiene ${cuentasGmail.length} cuentas Gmail para búsqueda global`);
            const busquedaPromises = cuentasGmail.map(async (cuenta) => {
                try {
                    this.logger.log(`🔍 Buscando "${searchTerm}" en cuenta: ${cuenta.email_gmail} (ID: ${cuenta.id})`);
                    const accessToken = await this.calendarService.getValidTokenForAccount(cuenta.id);
                    const resultadoBusqueda = await this.calendarService.searchEventsWithToken(accessToken, cuenta.id.toString(), timeMin, searchTerm.trim(), 1, 100);
                    const eventosConCuenta = resultadoBusqueda.events.map(evento => ({
                        ...evento,
                        sourceAccount: cuenta.email_gmail,
                        sourceAccountId: cuenta.id
                    }));
                    this.logger.log(`✅ Cuenta ${cuenta.email_gmail}: ${eventosConCuenta.length} resultados encontrados`);
                    return {
                        cuenta: cuenta.email_gmail,
                        eventos: eventosConCuenta,
                        total: resultadoBusqueda.total
                    };
                }
                catch (error) {
                    this.logger.warn(`⚠️ Error buscando en cuenta ${cuenta.email_gmail}:`, error);
                    return {
                        cuenta: cuenta.email_gmail,
                        eventos: [],
                        total: 0
                    };
                }
            });
            const resultadosPorCuenta = await Promise.all(busquedaPromises);
            const todosLosEventos = resultadosPorCuenta
                .filter(resultado => resultado.eventos.length > 0)
                .flatMap(resultado => resultado.eventos);
            todosLosEventos.sort((a, b) => {
                const fechaA = new Date(a.startTime).getTime();
                const fechaB = new Date(b.startTime).getTime();
                return fechaB - fechaA;
            });
            const totalEventos = todosLosEventos.length;
            const startIndex = (pageNum - 1) * limitNum;
            const endIndex = startIndex + limitNum;
            const eventosPaginados = todosLosEventos.slice(startIndex, endIndex);
            const totalPages = Math.ceil(totalEventos / limitNum);
            const hasNextPage = pageNum < totalPages;
            const hasPreviousPage = pageNum > 1;
            const accountsSearched = resultadosPorCuenta.map(resultado => resultado.cuenta);
            this.logger.log(`✅ BÚSQUEDA GLOBAL COMPLETADA:`);
            this.logger.log(`   🔍 Término: "${searchTerm}"`);
            this.logger.log(`   📊 Total eventos encontrados: ${totalEventos}`);
            this.logger.log(`   📧 Cuentas buscadas: ${accountsSearched.join(', ')}`);
            this.logger.log(`   📄 Página ${pageNum}/${totalPages} (${eventosPaginados.length} eventos)`);
            return {
                events: eventosPaginados,
                total: totalEventos,
                page: pageNum,
                limit: limitNum,
                totalPages,
                hasNextPage,
                hasPreviousPage,
                searchTerm,
                accountsSearched
            };
        }
        catch (error) {
            this.logger.error('❌ Error en búsqueda global:', error);
            throw new common_1.BadRequestException(`Error en búsqueda global: ${error.message}`);
        }
    }
};
exports.CalendarController = CalendarController;
__decorate([
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({
        summary: 'Estado del servicio',
        description: 'Verifica que el microservicio de calendar esté funcionando correctamente.'
    }),
    (0, swagger_1.ApiOkResponse)({
        description: 'Servicio funcionando correctamente',
        schema: {
            type: 'object',
            properties: {
                service: { type: 'string', example: 'ms-yourdashboard-calendar' },
                status: { type: 'string', example: 'OK' },
                timestamp: { type: 'string', example: '2024-01-15T10:30:00Z' },
                port: { type: 'number', example: 3005 },
                mode: { type: 'string', example: 'microservices' }
            }
        }
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CalendarController.prototype, "getHealth", null);
__decorate([
    (0, common_1.Get)('events'),
    (0, swagger_1.ApiBearerAuth)('Calendar-Token'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtener lista de eventos',
        description: 'Lista eventos del calendario con filtros de fecha para una cuenta Gmail específica.'
    }),
    (0, swagger_1.ApiQuery)({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' }),
    (0, swagger_1.ApiQuery)({ name: 'timeMin', description: 'Fecha mínima (ISO)', example: '2025-08-01T00:00:00Z' }),
    (0, swagger_1.ApiQuery)({ name: 'timeMax', description: 'Fecha máxima (ISO)', example: '2025-08-31T23:59:59Z', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', description: 'Número de página', example: 1, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', description: 'Eventos por página (máx 50)', example: 10, required: false }),
    (0, swagger_1.ApiOkResponse)({
        description: 'Lista de eventos obtenida exitosamente'
    }),
    (0, swagger_1.ApiUnauthorizedResponse)({
        description: 'Token de Calendar inválido o expirado'
    }),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Query)('cuentaGmailId')),
    __param(2, (0, common_1.Query)('timeMin')),
    __param(3, (0, common_1.Query)('timeMax')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "listEvents", null);
__decorate([
    (0, common_1.Get)('events/search'),
    (0, swagger_1.ApiBearerAuth)('Calendar-Token'),
    (0, swagger_1.ApiOperation)({
        summary: 'Buscar eventos',
        description: 'Busca eventos por término específico con filtros de fecha.'
    }),
    (0, swagger_1.ApiQuery)({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' }),
    (0, swagger_1.ApiQuery)({ name: 'timeMin', description: 'Fecha mínima (ISO)', example: '2025-08-01T00:00:00Z' }),
    (0, swagger_1.ApiQuery)({ name: 'q', description: 'Término de búsqueda', example: 'reunión proyecto' }),
    (0, swagger_1.ApiQuery)({ name: 'page', description: 'Número de página', example: 1, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', description: 'Eventos por página (máx 50)', example: 10, required: false }),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Query)('cuentaGmailId')),
    __param(2, (0, common_1.Query)('timeMin')),
    __param(3, (0, common_1.Query)('q')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "searchEvents", null);
__decorate([
    (0, common_1.Get)('events/:eventId'),
    (0, swagger_1.ApiBearerAuth)('Calendar-Token'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtener evento específico por ID',
        description: 'Obtiene los detalles de un evento específico por su ID de Google Calendar.'
    }),
    (0, swagger_1.ApiParam)({
        name: 'eventId',
        description: 'ID del evento en Google Calendar',
        example: 'abc123def456ghi789'
    }),
    (0, swagger_1.ApiQuery)({
        name: 'cuentaGmailId',
        description: 'ID de la cuenta Gmail específica',
        example: '4'
    }),
    (0, swagger_1.ApiOkResponse)({
        description: 'Evento obtenido exitosamente'
    }),
    (0, swagger_1.ApiUnauthorizedResponse)({
        description: 'Token de Calendar inválido o expirado'
    }),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Param)('eventId')),
    __param(2, (0, common_1.Query)('cuentaGmailId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "getEventById", null);
__decorate([
    (0, common_1.Post)('events'),
    (0, swagger_1.ApiBearerAuth)('Calendar-Token'),
    (0, swagger_1.ApiOperation)({
        summary: 'Crear nuevo evento',
        description: 'Crea un nuevo evento en el calendario.'
    }),
    (0, swagger_1.ApiQuery)({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' }),
    (0, swagger_1.ApiBody)({
        description: 'Datos del evento a crear',
        examples: {
            'evento-publico': {
                summary: 'Reunión de Planificación Q4',
                value: {
                    summary: 'Reunión de Planificación Q4',
                    location: 'Sala de Juntas 3',
                    description: 'Discutir los objetivos y metas para el último trimestre del año.',
                    start: {
                        dateTime: '2025-09-15T10:00:00-05:00',
                        timeZone: 'America/Bogota'
                    },
                    end: {
                        dateTime: '2025-09-15T11:30:00-05:00',
                        timeZone: 'America/Bogota'
                    },
                    attendees: [
                        { email: 'compañero1@example.com' },
                        { email: 'compañero2@example.com' }
                    ]
                }
            }
        }
    }),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Query)('cuentaGmailId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "createEvent", null);
__decorate([
    (0, common_1.Post)('events/private'),
    (0, swagger_1.ApiBearerAuth)('Calendar-Token'),
    (0, swagger_1.ApiOperation)({
        summary: 'Crear evento privado',
        description: 'Crea un nuevo evento privado usando CreateEventDto.'
    }),
    (0, swagger_1.ApiQuery)({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' }),
    (0, swagger_1.ApiBody)({ type: create_event_dto_1.CreateEventDto }),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Query)('cuentaGmailId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_event_dto_1.CreateEventDto]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "createPrivateEvent", null);
__decorate([
    (0, common_1.Post)('share'),
    (0, swagger_1.ApiBearerAuth)('Calendar-Token'),
    (0, swagger_1.ApiOperation)({
        summary: 'Compartir calendario',
        description: 'Comparte el calendario con otro usuario específico.'
    }),
    (0, swagger_1.ApiQuery)({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' }),
    (0, swagger_1.ApiBody)({ type: share_calendar_dto_1.ShareCalendarDto }),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Query)('cuentaGmailId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, share_calendar_dto_1.ShareCalendarDto]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "shareCalendar", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiBearerAuth)('Calendar-Token'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtener estadísticas de eventos',
        description: 'Obtiene contadores de eventos totales, próximos y pasados.'
    }),
    (0, swagger_1.ApiQuery)({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' }),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Query)('cuentaGmailId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "getCalendarStats", null);
__decorate([
    (0, common_1.Post)('sync'),
    (0, swagger_1.ApiBearerAuth)('Calendar-Token'),
    (0, swagger_1.ApiOperation)({
        summary: 'Sincronizar eventos manualmente',
        description: 'Ejecuta sincronización manual de eventos desde Google Calendar para una cuenta específica.'
    }),
    (0, swagger_1.ApiQuery)({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' }),
    (0, swagger_1.ApiQuery)({ name: 'maxEvents', description: 'Máximo eventos a sincronizar', example: 100, required: false }),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Query)('cuentaGmailId')),
    __param(2, (0, common_1.Query)('maxEvents')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "syncEvents", null);
__decorate([
    (0, common_1.Patch)('events/:eventId'),
    (0, swagger_1.ApiBearerAuth)('Calendar-Token'),
    (0, swagger_1.ApiOperation)({
        summary: 'Actualizar evento existente',
        description: 'Actualiza un evento existente por su ID.'
    }),
    (0, swagger_1.ApiParam)({
        name: 'eventId',
        description: 'ID del evento en Google Calendar',
        example: 'abc123def456'
    }),
    (0, swagger_1.ApiQuery)({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' }),
    (0, swagger_1.ApiBody)({ type: update_event_dto_1.UpdateEventDto }),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Query)('cuentaGmailId')),
    __param(2, (0, common_1.Param)('eventId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, update_event_dto_1.UpdateEventDto]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "updateEvent", null);
__decorate([
    (0, common_1.Delete)('events/:eventId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiBearerAuth)('Calendar-Token'),
    (0, swagger_1.ApiOperation)({
        summary: 'Eliminar evento',
        description: 'Elimina un evento específico por su ID.'
    }),
    (0, swagger_1.ApiParam)({
        name: 'eventId',
        description: 'ID del evento en Google Calendar',
        example: 'abc123def456'
    }),
    (0, swagger_1.ApiQuery)({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' }),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Query)('cuentaGmailId')),
    __param(2, (0, common_1.Param)('eventId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "deleteEvent", null);
__decorate([
    (0, common_1.Get)('events-unified'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtener eventos unificados de todas las cuentas del usuario',
        description: 'Obtiene eventos de todas las cuentas Gmail asociadas al usuario y los unifica en una sola respuesta paginada.'
    }),
    (0, swagger_1.ApiQuery)({ name: 'userId', description: 'ID del usuario principal', example: '5' }),
    (0, swagger_1.ApiQuery)({ name: 'timeMin', description: 'Fecha mínima (ISO)', example: '2025-08-01T00:00:00Z' }),
    (0, swagger_1.ApiQuery)({ name: 'timeMax', description: 'Fecha máxima (ISO)', example: '2025-08-31T23:59:59Z', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', description: 'Número de página', example: 1, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', description: 'Eventos por página (máx 50)', example: 10, required: false }),
    (0, swagger_1.ApiOkResponse)({
        description: 'Eventos unificados obtenidos exitosamente',
        schema: {
            type: 'object',
            properties: {
                events: { type: 'array' },
                total: { type: 'number', example: 45 },
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 10 },
                totalPages: { type: 'number', example: 5 },
                hasNextPage: { type: 'boolean', example: true },
                hasPreviousPage: { type: 'boolean', example: false },
                accountsLoaded: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['usuario@gmail.com', 'trabajo@gmail.com']
                }
            }
        }
    }),
    __param(0, (0, common_1.Query)('userId')),
    __param(1, (0, common_1.Query)('timeMin')),
    __param(2, (0, common_1.Query)('timeMax')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "getEventsUnified", null);
__decorate([
    (0, common_1.Get)('search-global'),
    (0, swagger_1.ApiOperation)({
        summary: 'Búsqueda global de eventos en todas las cuentas del usuario',
        description: 'Busca eventos por término específico en todas las cuentas Gmail asociadas al usuario.'
    }),
    (0, swagger_1.ApiQuery)({ name: 'userId', description: 'ID del usuario principal', example: '5' }),
    (0, swagger_1.ApiQuery)({ name: 'timeMin', description: 'Fecha mínima (ISO)', example: '2025-08-01T00:00:00Z' }),
    (0, swagger_1.ApiQuery)({ name: 'q', description: 'Término de búsqueda', example: 'reunión proyecto' }),
    (0, swagger_1.ApiQuery)({ name: 'page', description: 'Número de página', example: 1, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', description: 'Eventos por página (máx 50)', example: 10, required: false }),
    (0, swagger_1.ApiOkResponse)({
        description: 'Búsqueda global completada exitosamente',
        schema: {
            type: 'object',
            properties: {
                events: { type: 'array' },
                total: { type: 'number', example: 12 },
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 10 },
                totalPages: { type: 'number', example: 2 },
                hasNextPage: { type: 'boolean', example: true },
                hasPreviousPage: { type: 'boolean', example: false },
                searchTerm: { type: 'string', example: 'reunión proyecto' },
                accountsSearched: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['usuario@gmail.com', 'trabajo@gmail.com']
                }
            }
        }
    }),
    __param(0, (0, common_1.Query)('userId')),
    __param(1, (0, common_1.Query)('timeMin')),
    __param(2, (0, common_1.Query)('q')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "searchEventsGlobal", null);
exports.CalendarController = CalendarController = CalendarController_1 = __decorate([
    (0, swagger_1.ApiTags)('Calendar'),
    (0, common_1.Controller)('calendar'),
    __metadata("design:paramtypes", [calendar_service_1.CalendarService,
        config_1.ConfigService])
], CalendarController);
//# sourceMappingURL=calendar.controller.js.map