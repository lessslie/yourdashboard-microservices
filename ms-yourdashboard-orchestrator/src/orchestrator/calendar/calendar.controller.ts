// ms-yourdashboard-orchestrator/src/orchestrator/calendar/calendar.controller.ts


import { 
  Controller, 
  Get, 
  Post, 
  Query, 
  Headers,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiQuery,
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiParam
} from '@nestjs/swagger';
import { CalendarOrchestratorService } from './calendar.service';
// import { AuthGuard } from '../../guards/auth.guard'; // ← Comentar temporalmente

@ApiTags('Calendar')
@Controller('calendar')
// @UseGuards(AuthGuard) // ← Comentar temporalmente
@ApiBearerAuth()
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
    description: 'Eventos obtenidos exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        source: { type: 'string', example: 'orchestrator' },
        data: {
          type: 'object',
          properties: {
            events: { type: 'array' },
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' }
          }
        }
      }
    }
  })
  async getEvents(
    @Headers('authorization') authHeader: string,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('timeMin') timeMin: string,
    @Query('timeMax') timeMax?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    this.logger.log(`📅 Obteniendo eventos para cuenta Gmail ${cuentaGmailId} - Página ${page || 1}`);

    // Validaciones
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
      const result = await this.calendarService.getEventsPorCuenta(
        authHeader, // ✅ Pasar el JWT al service
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
    } catch (error: any) {
      this.logger.error(`❌ Error obteniendo eventos:`, error.message);
      throw new BadRequestException(`Error obteniendo eventos: ${error.message}`);
    }
  }

  /**
   * 📅 GET /calendar/events-all-accounts - Eventos unificados de todas las cuentas
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

    // Validaciones
    if (!userId) {
      throw new BadRequestException('userId es requerido');
    }

    if (!timeMin) {
      throw new BadRequestException('timeMin es requerido');
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    try {
      const result = await this.calendarService.getEventosUnificados(
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
    } catch (error: any) {
      this.logger.error(`❌ Error en eventos unificados:`, error.message);
      throw new BadRequestException(`Error en eventos unificados: ${error.message}`);
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
    @Headers('authorization') authHeader: string,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('timeMin') timeMin: string,
    @Query('q') searchTerm: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    this.logger.log(`🔍 Buscando eventos para cuenta Gmail ${cuentaGmailId}: "${searchTerm}"`);

    // Validaciones
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
      const result = await this.calendarService.buscarEventosPorCuenta(
        authHeader, // ✅ Pasar JWT
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
    } catch (error: any) {
      this.logger.error(`❌ Error buscando eventos:`, error.message);
      throw new BadRequestException(`Error buscando eventos: ${error.message}`);
    }
  }

  /**
   * 🔍 GET /calendar/search-all-accounts - Búsqueda global de eventos
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

    // Validaciones
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
      const result = await this.calendarService.buscarEventosGlobal(
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
    } catch (error: any) {
      this.logger.error(`❌ Error en búsqueda global de eventos:`, error.message);
      throw new BadRequestException(`Error en búsqueda global: ${error.message}`);
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
    @Headers('authorization') authHeader: string,
    @Query('cuentaGmailId') cuentaGmailId: string
  ) {
    this.logger.log(`📊 Obteniendo estadísticas para cuenta Gmail ${cuentaGmailId}`);

    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId es requerido');
    }

    try {
      const result = await this.calendarService.getEstadisticasCalendario(authHeader, cuentaGmailId);

      return {
        success: true,
        source: 'orchestrator',
        data: result
      };
    } catch (error: any) {
      this.logger.error(`❌ Error obteniendo estadísticas:`, error.message);
      throw new BadRequestException(`Error obteniendo estadísticas: ${error.message}`);
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
    description: 'Sincronización completada exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        source: { type: 'string', example: 'orchestrator' },
        data: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Sincronización completada exitosamente' },
            stats: {
              type: 'object',
              properties: {
                cuenta_gmail_id: { type: 'number', example: 36 },
                events_nuevos: { type: 'number', example: 8 },
                events_actualizados: { type: 'number', example: 3 },
                tiempo_total_ms: { type: 'number', example: 1500 }
              }
            }
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: 'Usuario no tiene tokens configurados para Calendar'
  })
  async syncEvents(
    @Headers('authorization') authHeader: string,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('maxEvents') maxEvents?: string
  ) {
    this.logger.log(`🔄 Iniciando sync de eventos para cuenta Gmail ${cuentaGmailId}`);

    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId es requerido');
    }

    const maxEventsNum = maxEvents ? parseInt(maxEvents, 10) : 100;

    try {
      const result = await this.calendarService.sincronizarEventos(authHeader, cuentaGmailId, maxEventsNum);

      return {
        success: true,
        source: 'orchestrator',
        data: result
      };
    } catch (error: any) {
      this.logger.error(`❌ Error en sync de eventos:`, error.message);
      throw new BadRequestException(`Error sincronizando eventos: ${error.message}`);
    }
  }
}