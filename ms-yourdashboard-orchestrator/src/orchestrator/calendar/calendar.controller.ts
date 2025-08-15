
import { 
  Controller, 
  Get, 
  Post,
  Patch,
  Delete,
  Query, 
  Param, 
  Body,
  Req,           
  UnauthorizedException, 
  BadRequestException,
  NotFoundException,   
  Logger,
  HttpCode,
  HttpStatus
} from '@nestjs/common';

import { 
  ApiTags, 
  ApiOperation, 
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,    
  ApiNoContentResponse,  
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,   
  ApiBearerAuth
} from '@nestjs/swagger';
import { Request } from 'express';  
import { CalendarOrchestratorService } from './calendar.service';
import {
  CalendarEventDto,
} from './dto/calendar-response.dto';
import { 
  CreateEventDto, 
  UpdateEventDto,
} from './dto';

@ApiTags('Calendar')
@Controller('calendar')
@ApiBearerAuth('JWT-auth')
export class CalendarOrchestratorController {
  private readonly logger = new Logger(CalendarOrchestratorController.name);
  
  constructor(
    private readonly calendarService: CalendarOrchestratorService
  ) {}

  
  /**
   * 📅 GET /calendar/events - Eventos de cuenta específica
   */
  @Get('events')
  @ApiOperation({ 
    summary: 'Obtener eventos de cuenta específica',
    description: 'Coordina MS-Auth + MS-Calendar para obtener eventos de una cuenta Gmail específica.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '36' })
  @ApiQuery({ name: 'timeMin', description: 'Fecha mínima (ISO)', example: '2025-08-01T00:00:00Z' })
  @ApiQuery({ name: 'timeMax', description: 'Fecha máxima (ISO)', example: '2025-08-31T23:59:59Z', required: false })
  @ApiQuery({ name: 'page', description: 'Número de página', example: 1, required: false })
  @ApiQuery({ name: 'limit', description: 'Eventos por página (máx 50)', example: 10, required: false })
  @ApiOkResponse({ 
    description: 'Eventos obtenidos exitosamente'
  })
  async getEvents(
    @Req() req: Request,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('timeMin') timeMin: string,
    @Query('timeMax') timeMax?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    this.logger.log(`📅 Obteniendo eventos para cuenta Gmail ${cuentaGmailId} - Página ${page || 1}`);

    // OBTENER AUTH HEADER DEL REQUEST
    const authHeader = req.headers?.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header requerido');
    }

    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId es requerido');
    }

    if (!timeMin) {
      throw new BadRequestException('timeMin es requerido');
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    try {
      // ✅ TIPADO CORRECTO: resultado del service
      const result: unknown = await this.calendarService.getEventsPorCuenta(
        authHeader,
        cuentaGmailId,
        timeMin,
        timeMax,
        pageNum,
        limitNum
      );

      return {
        success: true,
        source: 'orchestrator',
        data: result
      };
    } catch (error: unknown) {
      // ✅ MANEJO SEGURO DE ERRORES
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error obteniendo eventos:`, errorMessage);
      throw new BadRequestException(`Error obteniendo eventos: ${errorMessage}`);
    }
  }


  /**
   * 📅 GET /calendar/events-all-accounts - Eventos unificados (NO requiere auth header)
   */
  @Get('events-all-accounts')
  @ApiOperation({ 
    summary: 'Obtener eventos unificados de todas las cuentas',
    description: 'Coordina MS-Auth + MS-Calendar para obtener eventos de todas las cuentas del usuario.'
  })
  @ApiQuery({ name: 'userId', description: 'ID del usuario principal', example: '5' })
  @ApiQuery({ name: 'timeMin', description: 'Fecha mínima (ISO)', example: '2025-08-01T00:00:00Z' })
  @ApiQuery({ name: 'timeMax', description: 'Fecha máxima (ISO)', example: '2025-08-31T23:59:59Z', required: false })
  @ApiQuery({ name: 'page', description: 'Número de página', example: 1, required: false })
  @ApiQuery({ name: 'limit', description: 'Eventos por página (máx 50)', example: 10, required: false })
  @ApiOkResponse({ 
    description: 'Eventos unificados obtenidos exitosamente'
  })
 async getAllAccountsEvents(
    @Query('userId') userId: string,
    @Query('timeMin') timeMin: string,
    @Query('timeMax') timeMax?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    this.logger.log(`📅 🎯 EVENTOS UNIFICADOS para usuario ${userId} - Página ${page || 1}`);

    if (!userId) {
      throw new BadRequestException('userId es requerido');
    }

    if (!timeMin) {
      throw new BadRequestException('timeMin es requerido');
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    try {
      // ✅ TIPADO CORRECTO: resultado del service
      const result: unknown = await this.calendarService.getEventosUnificados(
        userId,
        timeMin,
        timeMax,
        pageNum,
        limitNum
      );

      return {
        success: true,
        source: 'orchestrator',
        data: result
      };
    } catch (error: unknown) {
      // ✅ MANEJO SEGURO DE ERRORES
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error en eventos unificados:`, errorMessage);
      throw new BadRequestException(`Error en eventos unificados: ${errorMessage}`);
    }
  }

  /**
   * 🔍 GET /calendar/events/search - Buscar eventos en cuenta específica
   */
  @Get('events/search')
  @ApiOperation({ 
    summary: 'Buscar eventos en cuenta específica',
    description: 'Busca eventos por término específico en una cuenta Gmail.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '36' })
  @ApiQuery({ name: 'timeMin', description: 'Fecha mínima (ISO)', example: '2025-08-01T00:00:00Z' })
  @ApiQuery({ name: 'q', description: 'Término de búsqueda', example: 'reunión proyecto' })
  @ApiQuery({ name: 'page', description: 'Número de página', example: 1, required: false })
  @ApiQuery({ name: 'limit', description: 'Eventos por página (máx 50)', example: 10, required: false })
  @ApiOkResponse({ 
    description: 'Búsqueda de eventos completada exitosamente'
  })
 async searchEvents(
    @Req() req: Request,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('timeMin') timeMin: string,
    @Query('q') searchTerm: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    this.logger.log(`🔍 Buscando eventos para cuenta Gmail ${cuentaGmailId}: "${searchTerm}"`);

    // OBTENER AUTH HEADER DEL REQUEST
    const authHeader = req.headers?.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header requerido');
    }

    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId es requerido');
    }

    if (!timeMin) {
      throw new BadRequestException('timeMin es requerido');
    }

    if (!searchTerm || searchTerm.trim() === '') {
      throw new BadRequestException('q (término de búsqueda) es requerido');
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    try {
      // ✅ TIPADO CORRECTO: resultado del service
      const result: unknown = await this.calendarService.buscarEventosPorCuenta(
        authHeader,
        cuentaGmailId,
        timeMin,
        searchTerm.trim(),
        pageNum,
        limitNum
      );

      return {
        success: true,
        source: 'orchestrator',
        data: result
      };
    } catch (error: unknown) {
      // ✅ MANEJO SEGURO DE ERRORES
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error buscando eventos:`, errorMessage);
      throw new BadRequestException(`Error buscando eventos: ${errorMessage}`);
    }
  }

  /**
   * 🔍 GET /calendar/search-all-accounts - Búsqueda global (NO requiere auth header)
   */
  @Get('search-all-accounts')
  @ApiOperation({ 
    summary: 'Búsqueda global de eventos en todas las cuentas',
    description: 'Busca eventos por término específico en todas las cuentas del usuario.'
  })
  @ApiQuery({ name: 'userId', description: 'ID del usuario principal', example: '5' })
  @ApiQuery({ name: 'timeMin', description: 'Fecha mínima (ISO)', example: '2025-08-01T00:00:00Z' })
  @ApiQuery({ name: 'q', description: 'Término de búsqueda', example: 'reunión' })
  @ApiQuery({ name: 'page', description: 'Número de página', example: 1, required: false })
  @ApiQuery({ name: 'limit', description: 'Eventos por página (máx 50)', example: 10, required: false })
  @ApiOkResponse({ 
    description: 'Búsqueda global completada exitosamente'
  })
 async searchAllAccountsEvents(
    @Query('userId') userId: string,
    @Query('timeMin') timeMin: string,
    @Query('q') searchTerm: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    this.logger.log(`🌍 BÚSQUEDA GLOBAL de eventos para usuario ${userId}: "${searchTerm}"`);

    if (!userId) {
      throw new BadRequestException('userId es requerido');
    }

    if (!timeMin) {
      throw new BadRequestException('timeMin es requerido');
    }

    if (!searchTerm || searchTerm.trim() === '') {
      throw new BadRequestException('q (término de búsqueda) es requerido');
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    try {
      // ✅ TIPADO CORRECTO: resultado del service
      const result: unknown = await this.calendarService.buscarEventosGlobal(
        userId,
        timeMin,
        searchTerm.trim(),
        pageNum,
        limitNum
      );

      return {
        success: true,
        source: 'orchestrator',
        data: result
      };
    } catch (error: unknown) {
      // ✅ MANEJO SEGURO DE ERRORES
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error en búsqueda global de eventos:`, errorMessage);
      throw new BadRequestException(`Error en búsqueda global: ${errorMessage}`);
    }
  }

  /**
   * 📊 GET /calendar/stats - Estadísticas de eventos
   */
  @Get('stats')
  @ApiOperation({ 
    summary: 'Obtener estadísticas de eventos',
    description: 'Coordina MS-Auth + MS-Calendar para obtener estadísticas de una cuenta específica.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '36' })
  @ApiOkResponse({ 
    description: 'Estadísticas obtenidas exitosamente'
  })
async getCalendarStats(
    @Req() req: Request,
    @Query('cuentaGmailId') cuentaGmailId: string
  ) {
    this.logger.log(`📊 Obteniendo estadísticas para cuenta Gmail ${cuentaGmailId}`);

    // OBTENER AUTH HEADER DEL REQUEST
    const authHeader = req.headers?.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header requerido');
    }

    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId es requerido');
    }

    try {
      // ✅ TIPADO CORRECTO: resultado del service
      const result: unknown = await this.calendarService.getEstadisticasCalendario(authHeader, cuentaGmailId);

      return {
        success: true,
        source: 'orchestrator',
        data: result
      };
    } catch (error: unknown) {
      // ✅ MANEJO SEGURO DE ERRORES
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error obteniendo estadísticas:`, errorMessage);
      throw new BadRequestException(`Error obteniendo estadísticas: ${errorMessage}`);
    }
  }

  /**
   * 🔄 POST /calendar/sync - Sincronización manual
   */
  @Post('sync')
  @ApiOperation({ 
    summary: 'Sincronizar eventos de cuenta específica',
    description: 'Coordina MS-Auth + MS-Calendar para ejecutar sincronización de eventos de una cuenta Gmail específica.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '36' })
  @ApiQuery({ name: 'maxEvents', description: 'Máximo eventos a sincronizar', example: 50, required: false })
  @ApiOkResponse({ 
    description: 'Sincronización completada exitosamente'
  })
 
  async syncEvents(
    @Req() req: Request,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('maxEvents') maxEvents?: string
  ) {
    this.logger.log(`🔄 Iniciando sync de eventos para cuenta Gmail ${cuentaGmailId}`);

    // OBTENER AUTH HEADER DEL REQUEST
    const authHeader = req.headers?.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header requerido');
    }

    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId es requerido');
    }

    const maxEventsNum = maxEvents ? parseInt(maxEvents, 10) : 100;

    try {
      // ✅ TIPADO CORRECTO: resultado del service
      const result: unknown = await this.calendarService.sincronizarEventos(authHeader, cuentaGmailId, maxEventsNum);

      return {
        success: true,
        source: 'orchestrator',
        data: result
      };
    } catch (error: unknown) {
      // ✅ MANEJO SEGURO DE ERRORES
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error en sync de eventos:`, errorMessage);
      throw new BadRequestException(`Error sincronizando eventos: ${errorMessage}`);
    }
  }


  /**
   * 📋 GET /calendar/events/:eventId - Obtener evento específico
   */
  @Get('events/:eventId')
  @ApiOperation({ 
    summary: 'Obtener evento específico por ID',
    description: 'Obtiene los detalles de un evento específico por su ID de Google Calendar.'
  })
  @ApiParam({ 
    name: 'eventId', 
    description: 'ID del evento en Google Calendar', 
    example: 'abc123def456ghi789' 
  })
  @ApiQuery({ 
    name: 'cuentaGmailId', 
    description: 'ID de la cuenta Gmail específica', 
    example: '36' 
  })
  @ApiOkResponse({ 
    description: 'Evento obtenido exitosamente',
    type: CalendarEventDto
  })
  @ApiBadRequestResponse({ description: 'Parámetros inválidos' })
  @ApiUnauthorizedResponse({ description: 'Token de autorización inválido' })
  @ApiNotFoundResponse({ description: 'Evento no encontrado' })
 async getEventById(
    @Req() req: Request,
    @Param('eventId') eventId: string,
    @Query('cuentaGmailId') cuentaGmailId: string
  ) {
    this.logger.log(`📋 Obteniendo evento específico ${eventId} para cuenta Gmail ${cuentaGmailId}`);

    // ✅ OBTENER AUTH HEADER DEL REQUEST (patrón correcto)
    const authHeader = req.headers?.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header requerido');
    }

    if (!eventId || eventId.trim() === '') {
      throw new BadRequestException('eventId es requerido');
    }

    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId es requerido');
    }

    try {
      // ✅ TIPADO CORRECTO: resultado del service
      const event: unknown = await this.calendarService.getEventByIdWithToken(
        authHeader,
        cuentaGmailId,
        eventId
      );

      return {
        success: true,
        source: 'orchestrator',
        data: event
      };
    } catch (error: unknown) {
      // ✅ MANEJO SEGURO DE ERRORES
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error obteniendo evento ${eventId}:`, errorMessage);
      
      // ✅ VERIFICACIÓN SEGURA PARA 'not found'
      if (errorMessage.includes('not found')) {
        throw new NotFoundException(`Evento ${eventId} no encontrado`);
      }
      
      throw new BadRequestException(`Error obteniendo evento: ${errorMessage}`);
    }
  }

  /**
   * ➕ POST /calendar/events - Crear nuevo evento
   */
  @Post('events')
  @ApiOperation({ 
    summary: 'Crear nuevo evento',
    description: 'Crea un nuevo evento en Google Calendar.'
  })
  @ApiQuery({ 
    name: 'cuentaGmailId', 
    description: 'ID de la cuenta Gmail específica', 
    example: '36' 
  })
  @ApiQuery({ 
    name: 'private', 
    description: 'Si el evento debe ser privado (opcional)', 
    example: 'false',
    required: false 
  })
  @ApiBody({ 
    type: CreateEventDto,
    description: 'Datos del nuevo evento'
  })
  @ApiCreatedResponse({ 
    description: 'Evento creado exitosamente',
    type: CalendarEventDto
  })
  @ApiBadRequestResponse({ description: 'Datos del evento inválidos' })
  @ApiUnauthorizedResponse({ description: 'Token de autorización inválido' })
 async createEvent(
    @Req() req: Request,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Body() createEventDto: CreateEventDto,
    @Query('private') isPrivate?: string
  ) {
    this.logger.log(`➕ Creando evento "${createEventDto.summary}" para cuenta Gmail ${cuentaGmailId}`);

    // ✅ OBTENER AUTH HEADER DEL REQUEST (patrón correcto)
    const authHeader = req.headers?.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header requerido');
    }

    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId es requerido');
    }

    // Validar datos básicos del evento
    if (!createEventDto.summary || createEventDto.summary.trim() === '') {
      throw new BadRequestException('summary (título) es requerido');
    }

    if (!createEventDto.startDateTime) {
      throw new BadRequestException('startDateTime es requerido');
    }

    if (!createEventDto.endDateTime) {
      throw new BadRequestException('endDateTime es requerido');
    }

    try {
      const isEventPrivate = isPrivate === 'true';
      // ✅ TIPADO CORRECTO: resultado del service
      let newEvent: unknown;

      if (isEventPrivate) {
        newEvent = await this.calendarService.createPrivateEventWithToken(
          authHeader,
          cuentaGmailId,
          createEventDto
        );
      } else {
        newEvent = await this.calendarService.createEventWithToken(
          authHeader,
          cuentaGmailId,
          createEventDto
        );
      }

      return {
        success: true,
        source: 'orchestrator',
        data: newEvent,
        message: `Evento "${createEventDto.summary}" creado exitosamente`
      };
    } catch (error: unknown) {
      // ✅ MANEJO SEGURO DE ERRORES
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error creando evento:`, errorMessage);
      throw new BadRequestException(`Error creando evento: ${errorMessage}`);
    }
  }


  /**
   * ✏️ PATCH /calendar/events/:eventId - Actualizar evento existente
   */
  @Patch('events/:eventId')
  @ApiOperation({ 
    summary: 'Actualizar evento existente',
    description: 'Actualiza los datos de un evento existente en Google Calendar.'
  })
  @ApiParam({ 
    name: 'eventId', 
    description: 'ID del evento en Google Calendar', 
    example: 'abc123def456ghi789' 
  })
  @ApiQuery({ 
    name: 'cuentaGmailId', 
    description: 'ID de la cuenta Gmail específica', 
    example: '36' 
  })
  @ApiBody({ 
    type: UpdateEventDto,
    description: 'Datos a actualizar del evento (campos opcionales)',
    examples: {
      actualizacionParcial: {
        summary: 'Actualizar solo título y ubicación',
        value: {
          summary: 'Reunión de equipo - Backend (ACTUALIZADA)',
          location: 'Sala Virtual - Zoom',
        }
      },
      actualizacionCompleta: {
        summary: 'Actualizar múltiples campos',
        value: {
          summary: 'Sprint Review - Q3 2025',
          location: 'Auditorio Principal',
          description: 'Presentación de resultados del trimestre',
          startDateTime: '2025-08-25T14:00:00-05:00',
          endDateTime: '2025-08-25T16:00:00-05:00',
          attendees: ['manager@empresa.com', 'team@empresa.com']
        }
      }
    }
  })
  @ApiOkResponse({ 
    description: 'Evento actualizado exitosamente',
    type: CalendarEventDto
  })
  @ApiBadRequestResponse({ description: 'Datos de actualización inválidos' })
  @ApiUnauthorizedResponse({ description: 'Token de autorización inválido' })
  @ApiNotFoundResponse({ description: 'Evento no encontrado' })
 async updateEvent(
    @Req() req: Request,
    @Param('eventId') eventId: string,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Body() updateEventDto: UpdateEventDto
  ) {
    this.logger.log(`✏️ Actualizando evento ${eventId} para cuenta Gmail ${cuentaGmailId}`);

    // ✅ OBTENER AUTH HEADER DEL REQUEST (patrón correcto)
    const authHeader = req.headers?.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header requerido');
    }

    if (!eventId || eventId.trim() === '') {
      throw new BadRequestException('eventId es requerido');
    }

    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId es requerido');
    }

    // Validar que al menos un campo viene para actualizar
    const hasUpdates = Object.keys(updateEventDto).some(key => 
      updateEventDto[key as keyof UpdateEventDto] !== undefined && 
      updateEventDto[key as keyof UpdateEventDto] !== null
    );

    if (!hasUpdates) {
      throw new BadRequestException('Debe proporcionar al menos un campo para actualizar');
    }

    try {
      // ✅ TIPADO CORRECTO: resultado del service
      const updatedEvent: unknown = await this.calendarService.updateEventWithToken(
        authHeader,
        cuentaGmailId,
        eventId,
        updateEventDto
      );

      return {
        success: true,
        source: 'orchestrator',
        data: updatedEvent,
        message: `Evento ${eventId} actualizado exitosamente`
      };
    } catch (error: unknown) {
      // ✅ MANEJO SEGURO DE ERRORES
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error actualizando evento ${eventId}:`, errorMessage);
      
      // ✅ VERIFICACIÓN SEGURA PARA 'not found'
      if (errorMessage.includes('not found')) {
        throw new NotFoundException(`Evento ${eventId} no encontrado`);
      }
      
      throw new BadRequestException(`Error actualizando evento: ${errorMessage}`);
    }
  }

  /**
   * 🗑️ DELETE /calendar/events/:eventId - Eliminar evento
   */
  @Delete('events/:eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Eliminar evento',
    description: 'Elimina un evento específico de Google Calendar de forma permanente.'
  })
  @ApiParam({ 
    name: 'eventId', 
    description: 'ID del evento en Google Calendar', 
    example: 'abc123def456ghi789' 
  })
  @ApiQuery({ 
    name: 'cuentaGmailId', 
    description: 'ID de la cuenta Gmail específica', 
    example: '36' 
  })
  @ApiNoContentResponse({ 
    description: 'Evento eliminado exitosamente (sin contenido)' 
  })
  @ApiBadRequestResponse({ description: 'Parámetros inválidos' })
  @ApiUnauthorizedResponse({ description: 'Token de autorización inválido' })
  @ApiNotFoundResponse({ description: 'Evento no encontrado' })
  async deleteEvent(
    @Req() req: Request,
    @Param('eventId') eventId: string,
    @Query('cuentaGmailId') cuentaGmailId: string
  ) {
    this.logger.log(`🗑️ Eliminando evento ${eventId} para cuenta Gmail ${cuentaGmailId}`);

    // ✅ OBTENER AUTH HEADER DEL REQUEST (patrón correcto)
    const authHeader = req.headers?.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header requerido');
    }

    if (!eventId || eventId.trim() === '') {
      throw new BadRequestException('eventId es requerido');
    }

    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId es requerido');
    }

    try {
      await this.calendarService.deleteEventWithToken(
        authHeader,
        cuentaGmailId,
        eventId
      );

      // ✅ DELETE endpoints devuelven 204 No Content (sin body)
      this.logger.log(`✅ Evento ${eventId} eliminado exitosamente`);
      
      // No return - HTTP 204 No Content
    } catch (error: unknown) {
      // ✅ MANEJO SEGURO DE ERRORES
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`❌ Error eliminando evento ${eventId}:`, errorMessage);
      
      // ✅ VERIFICACIÓN SEGURA PARA 'not found'
      if (errorMessage.includes('not found')) {
        throw new NotFoundException(`Evento ${eventId} no encontrado`);
      }
      
      throw new BadRequestException(`Error eliminando evento: ${errorMessage}`);
    }
  }
}