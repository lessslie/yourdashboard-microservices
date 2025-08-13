import { 
  Controller, 
  Get, 
  Post,
  Patch,
  Delete,
  Query, 
  Param, 
  Body,
  Headers,
  UnauthorizedException, 
  BadRequestException,
  Logger,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
  ApiOkResponse,
  ApiBody,
  ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { ShareCalendarDto } from './dto/share-calendar.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ConfigService } from '@nestjs/config';

@ApiTags('Calendar')
@Controller('calendar')
export class CalendarController {
  private readonly logger = new Logger(CalendarController.name);
  
  constructor(
    private readonly calendarService: CalendarService,
    private readonly configService: ConfigService
  ) {}

  /**
   * 🔧 GET /calendar/health - Health check
   */
  @Get('health')
  @ApiOperation({ 
    summary: 'Estado del servicio',
    description: 'Verifica que el microservicio de calendar esté funcionando correctamente.'
  })
  @ApiOkResponse({ 
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
  })
  getHealth() {
    return {
      service: 'ms-yourdashboard-calendar',
      status: 'OK',
      timestamp: new Date().toISOString(),
      port: process.env.PORT || 3005,
      mode: 'microservices'
    };
  }

  // ================================
  // 📅 ENDPOINTS PRINCIPALES
  // ================================

  /**
   * 📅 GET /calendar/events - Lista de eventos
   */
  @Get('events')
  @ApiBearerAuth('Calendar-Token')
  @ApiOperation({ 
    summary: 'Obtener lista de eventos',
    description: 'Lista eventos del calendario con filtros de fecha para una cuenta Gmail específica.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' })
  @ApiQuery({ name: 'timeMin', description: 'Fecha mínima (ISO)', example: '2025-08-01T00:00:00Z' })
  @ApiQuery({ name: 'timeMax', description: 'Fecha máxima (ISO)', example: '2025-08-31T23:59:59Z', required: false })
  @ApiQuery({ name: 'page', description: 'Número de página', example: 1, required: false })
  @ApiQuery({ name: 'limit', description: 'Eventos por página (máx 50)', example: 10, required: false })
  @ApiOkResponse({ 
    description: 'Lista de eventos obtenida exitosamente'
  })
  @ApiUnauthorizedResponse({ 
    description: 'Token de Calendar inválido o expirado'
  })
  async listEvents(
    @Headers('authorization') authHeader: string,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('timeMin') timeMin: string,
    @Query('timeMax') timeMax?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    // 🎯 VALIDACIONES COMO MS-EMAIL
    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    if (!accessToken) {
      throw new UnauthorizedException('Valid Bearer token is required');
    }

    if (!timeMin) {
      throw new BadRequestException('timeMin is required');
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    return this.calendarService.listEventsWithToken(
      accessToken, 
      cuentaGmailId,
      timeMin,
      timeMax,
      pageNum,
      limitNum
    );
  }

  /**
   * 🔍 GET /calendar/events/search - Buscar eventos
   */
  @Get('events/search')
  @ApiBearerAuth('Calendar-Token')
  @ApiOperation({ 
    summary: 'Buscar eventos',
    description: 'Busca eventos por término específico con filtros de fecha.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' })
  @ApiQuery({ name: 'timeMin', description: 'Fecha mínima (ISO)', example: '2025-08-01T00:00:00Z' })
  @ApiQuery({ name: 'q', description: 'Término de búsqueda', example: 'reunión proyecto' })
  @ApiQuery({ name: 'page', description: 'Número de página', example: 1, required: false })
  @ApiQuery({ name: 'limit', description: 'Eventos por página (máx 50)', example: 10, required: false })
  async searchEvents(
    @Headers('authorization') authHeader: string,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('timeMin') timeMin: string,
    @Query('q') searchTerm: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    if (!timeMin) {
      throw new BadRequestException('timeMin is required');
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
      throw new UnauthorizedException('Valid Bearer token is required');
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    return this.calendarService.searchEventsWithToken(
      accessToken, 
      cuentaGmailId,
      timeMin,
      searchTerm,
      pageNum, 
      limitNum
    );
  }

  /**
   * ➕ POST /calendar/events - Crear evento
   */
  @Post('events')
  @ApiBearerAuth('Calendar-Token')
  @ApiOperation({ 
    summary: 'Crear nuevo evento',
    description: 'Crea un nuevo evento en el calendario.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' })
  @ApiBody({ 
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
  })
  async createEvent(
    @Headers('authorization') authHeader: string,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Body() eventBody: any
  ) {
    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    if (!accessToken) {
      throw new UnauthorizedException('Valid Bearer token is required');
    }

    return this.calendarService.createEventWithToken(accessToken, cuentaGmailId, eventBody);
  }

  /**
   * ➕ POST /calendar/events/private - Crear evento privado
   */
  @Post('events/private')
  @ApiBearerAuth('Calendar-Token')
  @ApiOperation({ 
    summary: 'Crear evento privado',
    description: 'Crea un nuevo evento privado usando CreateEventDto.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' })
  @ApiBody({ type: CreateEventDto })
  async createPrivateEvent(
    @Headers('authorization') authHeader: string,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Body() dto: CreateEventDto
  ) {
    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    if (!accessToken) {
      throw new UnauthorizedException('Valid Bearer token is required');
    }

    return this.calendarService.createPrivateEventWithToken(accessToken, cuentaGmailId, dto);
  }

  /**
   * ✏️ PATCH /calendar/events/:eventId - Actualizar evento
   */
  @Patch('events/:eventId')
  @ApiBearerAuth('Calendar-Token')
  @ApiOperation({ 
    summary: 'Actualizar evento existente',
    description: 'Actualiza un evento existente por su ID.'
  })
  @ApiParam({ 
    name: 'eventId', 
    description: 'ID del evento en Google Calendar', 
    example: 'abc123def456' 
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' })
  @ApiBody({ type: UpdateEventDto })
  async updateEvent(
    @Headers('authorization') authHeader: string,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Param('eventId') eventId: string,
    @Body() eventBody: UpdateEventDto
  ) {
    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    if (!accessToken) {
      throw new UnauthorizedException('Valid Bearer token is required');
    }

    if (!eventId) {
      throw new BadRequestException('eventId is required');
    }

    return this.calendarService.updateEventWithToken(accessToken, cuentaGmailId, eventId, eventBody);
  }

  /**
   * 🗑️ DELETE /calendar/events/:eventId - Eliminar evento
   */
  @Delete('events/:eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('Calendar-Token')
  @ApiOperation({ 
    summary: 'Eliminar evento',
    description: 'Elimina un evento específico por su ID.'
  })
  @ApiParam({ 
    name: 'eventId', 
    description: 'ID del evento en Google Calendar', 
    example: 'abc123def456' 
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' })
  async deleteEvent(
    @Headers('authorization') authHeader: string,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Param('eventId') eventId: string
  ) {
    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    if (!accessToken) {
      throw new UnauthorizedException('Valid Bearer token is required');
    }

    if (!eventId) {
      throw new BadRequestException('eventId is required');
    }

    return this.calendarService.deleteEventWithToken(accessToken, cuentaGmailId, eventId);
  }

  /**
   * 🤝 POST /calendar/share - Compartir calendario
   */
  @Post('share')
  @ApiBearerAuth('Calendar-Token')
  @ApiOperation({ 
    summary: 'Compartir calendario',
    description: 'Comparte el calendario con otro usuario específico.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' })
  @ApiBody({ type: ShareCalendarDto })
  async shareCalendar(
    @Headers('authorization') authHeader: string,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Body() body: ShareCalendarDto
  ) {
    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    if (!accessToken) {
      throw new UnauthorizedException('Valid Bearer token is required');
    }

    return this.calendarService.shareCalendarWithToken(
      accessToken,
      cuentaGmailId,
      body.calendarId,
      body.userEmail,
      body.role
    );
  }

  /**
   * 📊 GET /calendar/stats - Estadísticas
   */
  @Get('stats')
  @ApiBearerAuth('Calendar-Token')
  @ApiOperation({ 
    summary: 'Obtener estadísticas de eventos',
    description: 'Obtiene contadores de eventos totales, próximos y pasados.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' })
  async getCalendarStats(
    @Headers('authorization') authHeader: string,
    @Query('cuentaGmailId') cuentaGmailId: string
  ) {
    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    if (!accessToken) {
      throw new UnauthorizedException('Valid Bearer token is required');
    }
    
    return this.calendarService.getCalendarStatsWithToken(accessToken, cuentaGmailId);
  }

  /**
   * 🔄 POST /calendar/sync - Sincronización manual
   */
  @Post('sync')
  @ApiBearerAuth('Calendar-Token')
  @ApiOperation({ 
    summary: 'Sincronizar eventos manualmente',
    description: 'Ejecuta sincronización manual de eventos desde Google Calendar para una cuenta específica.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' })
  @ApiQuery({ name: 'maxEvents', description: 'Máximo eventos a sincronizar', example: 100, required: false })
  async syncEvents(
    @Headers('authorization') authHeader: string,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('maxEvents') maxEvents?: string
  ) {
    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    if (!accessToken) {
      throw new UnauthorizedException('Valid Bearer token is required');
    }

    const maxEventsNum = maxEvents ? parseInt(maxEvents, 10) : 100;
    
    return this.calendarService.syncEventsWithToken(accessToken, cuentaGmailId, {
      maxEvents: maxEventsNum
    });
  }
}