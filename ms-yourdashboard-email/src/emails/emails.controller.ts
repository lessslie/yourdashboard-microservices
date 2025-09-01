import { 
  Controller, 
  Get, 
  Post,
  Query, 
  Param, 
  Headers,
  UnauthorizedException, 
  BadRequestException,
  Logger,
  Body,
  NotFoundException,
  Delete
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiQuery,
  ApiParam,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiBody
} from '@nestjs/swagger';
import { EmailsService } from './emails.service';
import { 
  EmailListResponseDto,
  EmailStatsDto,
  EmailDetailDto,
  EmailInboxQueryDto,
  EmailErrorResponseDto,
  EmailHealthResponseDto
} from './dto';
import { ConfigService } from '@nestjs/config';
import { 
  TrafficLightStatus, 
  TrafficLightDashboardResponse,
  EmailsByTrafficLightResponse,
  UpdateTrafficLightsResponse,
  
} from './interfaces/traffic-light.interfaces';


@ApiTags('Emails')
@Controller('emails')
export class EmailsController {
  private readonly logger = new Logger(EmailsController.name);
  constructor(
    private readonly emailsService: EmailsService,
    private readonly configService: ConfigService
  ) {}

    /**
   * 🔧 GET /emails/health - Health check
   */
  @Get('health')
  @ApiTags('Health')
  @ApiOperation({ 
    summary: 'Estado del servicio',
    description: 'Verifica que el microservicio de emails esté funcionando correctamente.'
  })
  @ApiOkResponse({ 
    description: 'Servicio funcionando correctamente',
    type: EmailHealthResponseDto 
  })


  getHealth() : EmailHealthResponseDto {
    return {
      service: 'ms-yourdashboard-email',
      status: 'OK',
      timestamp: new Date().toISOString(),
      port: process.env.PORT || 3002,
      mode: 'microservices'
    };
  }
  // ================================
  // 🔄 ENDPOINTS DE SINCRONIZACIÓN
  // ================================

  /**
   * 🔄 POST /emails/sync - Sincronización manual
   */
  @Post('sync')
  @ApiOperation({ 
    summary: 'Sincronizar emails manualmente',
    description: 'Ejecuta sincronización manual de emails desde Gmail para una cuenta específica.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' })
  @ApiQuery({ name: 'maxEmails', description: 'Máximo emails a sincronizar', example: 100, required: false })
  @ApiOkResponse({ 
    description: 'Sincronización completada exitosamente'
  })
  @ApiUnauthorizedResponse({ 
    description: 'Token de Gmail inválido o expirado',
    type: EmailErrorResponseDto 
  })
  async syncEmails(
    @Headers('authorization') authHeader: string,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('maxEmails') maxEmails?: string,
    @Query('fullsync') fullsync?:string
  ) {
    if (!cuentaGmailId) {
      throw new UnauthorizedException('cuentaGmailId is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    if (!accessToken) {
      throw new UnauthorizedException('Valid Bearer token is required');
    }

    const maxEmailsNum = maxEmails ? parseInt(maxEmails, 10) : 100;
    
    return this.emailsService.syncEmailsWithToken(accessToken, cuentaGmailId, {
      maxEmails: maxEmailsNum,
      fullSync: fullsync === 'true' // Convertir a booleano
    });
  }

  /**
   * 🔄 POST /emails/sync/incremental - Sincronización incremental,mas rapido, solo trae los ultimos no actuliza tooodoooo
   */
  @Post('sync/incremental')
  @ApiOperation({ 
    summary: 'Sincronización incremental de emails',
    description: 'Sincroniza solo emails nuevos desde la última sincronización.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' })
  @ApiQuery({ name: 'maxEmails', description: 'Máximo emails nuevos', example: 30, required: false })
  @ApiOkResponse({ 
    description: 'Sincronización incremental completada'
  })
  async syncIncremental(
    @Headers('authorization') authHeader: string,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('maxEmails') maxEmails?: string
  ) {
    if (!cuentaGmailId) {
      throw new UnauthorizedException('cuentaGmailId is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    if (!accessToken) {
      throw new UnauthorizedException('Valid Bearer token is required');
    }

    const maxEmailsNum = maxEmails ? parseInt(maxEmails, 10) : 30;
    
    return this.emailsService.syncEmailsWithToken(accessToken, cuentaGmailId, {
      maxEmails: maxEmailsNum,
      fullSync: false
    });
  }

  // ================================
  // 📧 ENDPOINTS PRINCIPALES
  // ================================

  /**
   * 📊 GET /emails/stats - Estadísticas de emails
   */
  @Get('stats')
  @ApiOperation({ 
    summary: 'Obtener estadísticas de emails',
    description: 'Obtiene contadores de emails totales, leídos y no leídos de una cuenta Gmail específica.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' })
  @ApiOkResponse({ 
    description: 'Estadísticas obtenidas exitosamente',
    type: EmailStatsDto 
  })
  @ApiUnauthorizedResponse({ 
    description: 'Token de Gmail inválido o expirado',
    type: EmailErrorResponseDto 
  })
  async getEmailStats(
    @Headers('authorization') authHeader: string,
    @Query('cuentaGmailId') cuentaGmailId: string
  ): Promise<EmailStatsDto> {
    if (!cuentaGmailId) {
      throw new UnauthorizedException('cuentaGmailId is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    if (!accessToken) {
      throw new UnauthorizedException('Valid Bearer token is required');
    }
    
    return this.emailsService.getInboxStatsWithToken(accessToken, cuentaGmailId);
  }

  /**
   * 📧 GET /emails/inbox - Lista de emails con paginación
   */
  @Get('inbox')
  @ApiOperation({ 
    summary: 'Obtener inbox de emails',
    description: 'Lista emails del inbox con paginación para una cuenta Gmail específica. Usa BD local primero, Gmail API como fallback.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' })
  @ApiQuery({ name: 'page', description: 'Número de página', example: 1, required: false })
  @ApiQuery({ name: 'limit', description: 'Emails por página (máx 50)', example: 10, required: false })
  @ApiOkResponse({ 
    description: 'Lista de emails obtenida exitosamente',
    type: EmailListResponseDto 
  })
  @ApiUnauthorizedResponse({ 
    description: 'Token de Gmail inválido o expirado',
    type: EmailErrorResponseDto 
  })
  @ApiBadRequestResponse({ 
    description: 'Parámetros inválidos (cuentaGmailId requerido)',
    type: EmailErrorResponseDto 
  })
  async getInbox(
    @Headers('authorization') authHeader: string,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ): Promise<EmailListResponseDto> {
    if (!cuentaGmailId) {
      throw new UnauthorizedException('cuentaGmailId is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    if (!accessToken) {
      throw new UnauthorizedException('Valid Bearer token is required');
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    // 🎯 OBTENER DATOS DEL SERVICIO
    const result = await this.emailsService.getInboxWithToken(
      accessToken, 
      cuentaGmailId, // 🎯 Cambio: cuentaGmailId en lugar de userId
      pageNum, 
      limitNum
    );

    // 🎯 CONVERTIR Date → string PARA LOS DTOs
    return {
      ...result,
      emails: result.emails.map(email => ({
        ...email,
        receivedDate: email.receivedDate.toISOString() // Date → string
      }))
    };
  }

  /**
   * 🔍 GET /emails/search - Buscar emails
   */
  @Get('search')
  @ApiOperation({ 
    summary: 'Buscar emails',
    description: 'Busca emails por término específico con paginación en una cuenta Gmail específica. Usa BD local primero.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' })
  @ApiQuery({ name: 'q', description: 'Término de búsqueda', example: 'reunión proyecto' })
  @ApiQuery({ name: 'page', description: 'Número de página', example: 1, required: false })
  @ApiQuery({ name: 'limit', description: 'Emails por página (máx 50)', example: 10, required: false })
  @ApiOkResponse({ 
    description: 'Resultados de búsqueda obtenidos exitosamente',
    type: EmailListResponseDto 
  })
  @ApiUnauthorizedResponse({ 
    description: 'Token de Gmail inválido o expirado',
    type: EmailErrorResponseDto 
  })
  @ApiBadRequestResponse({ 
    description: 'Parámetros inválidos (cuentaGmailId y q requeridos)',
    type: EmailErrorResponseDto 
  })
  async searchEmails(
    @Headers('authorization') authHeader: string,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('q') searchTerm: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ): Promise<EmailListResponseDto> {
    if (!cuentaGmailId) {
      throw new UnauthorizedException('cuentaGmailId is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    if (!searchTerm || searchTerm.trim() === '') {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 10;
      
      return {
        emails: [],
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
    
    // 🎯 OBTENER DATOS DEL SERVICIO
    const result = await this.emailsService.searchEmailsWithToken(
      accessToken, 
      cuentaGmailId, // 🎯 Cambio: cuentaGmailId en lugar de userId
      searchTerm,
      pageNum, 
      limitNum
    );

    // 🎯 CONVERTIR Date → string PARA LOS DTOs
    return {
      ...result,
      emails: result.emails.map(email => ({
        ...email,
        receivedDate: email.receivedDate.toISOString() // Date → string
      }))
    };
  }

  // ================================
  // 🔄 ENDPOINTS LEGACY (mantener compatibilidad)
  // ================================

  /**
   * 📧 GET /emails/inbox (LEGACY con userId)
   */
  @Get('inbox-legacy')
  @ApiOperation({ 
    summary: '[LEGACY] Obtener inbox por userId',
    description: 'Endpoint legacy que usa userId. Recomendado: usar /emails/inbox con cuentaGmailId'
  })
  async getInboxLegacy(
    @Headers('authorization') authHeader: string,
    @Query() query: EmailInboxQueryDto
  ): Promise<EmailListResponseDto> {
    if (!query.userId) {
      throw new UnauthorizedException('User ID is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    if (!accessToken) {
      throw new UnauthorizedException('Valid Bearer token is required');
    }
    
    const result = await this.emailsService.getInboxWithToken(
      accessToken, 
      query.userId, 
      query.page || 1, 
      query.limit || 10
    );

    return {
      ...result,
      emails: result.emails.map(email => ({
        ...email,
        receivedDate: email.receivedDate.toISOString()
      }))
    };
  }


  
/**
 * 🌍 GET /emails/search-all-accounts - Buscar en TODAS las cuentas Gmail del usuario
 * 🎯 NUEVO: Búsqueda global unificada
 */
@Get('search-all-accounts')
@ApiOperation({ 
  summary: '🌍 Buscar emails en TODAS las cuentas Gmail del usuario',
  description: 'Busca un término en TODAS las cuentas Gmail asociadas al usuario principal. Unifica resultados y los ordena por fecha globalmente.'
})
@ApiQuery({ 
  name: 'userId', 
  description: 'ID del usuario principal', 
  example: '3' 
})
@ApiQuery({ 
  name: 'q', 
  description: 'Término de búsqueda global', 
  example: 'reunión proyecto' 
})
@ApiQuery({ 
  name: 'page', 
  description: 'Número de página', 
  example: 1, 
  required: false 
})
@ApiQuery({ 
  name: 'limit', 
  description: 'Emails por página (máx 50)', 
  example: 10, 
  required: false 
})
@ApiOkResponse({ 
  description: 'Resultados de búsqueda global obtenidos exitosamente',
  schema: {
    type: 'object',
    properties: {
      emails: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '1847a8e123456789' },
            subject: { type: 'string', example: 'Reunión proyecto' },
            fromEmail: { type: 'string', example: 'jefe@empresa.com' },
            fromName: { type: 'string', example: 'Juan Pérez' },
            receivedDate: { type: 'string', example: '2024-01-15T10:30:00Z' },
            isRead: { type: 'boolean', example: false },
            hasAttachments: { type: 'boolean', example: true },
            sourceAccount: { type: 'string', example: 'juan.trabajo@gmail.com' }
          }
        }
      },
      total: { type: 'number', example: 45 },
      page: { type: 'number', example: 1 },
      limit: { type: 'number', example: 10 },
      totalPages: { type: 'number', example: 5 },
      hasNextPage: { type: 'boolean', example: true },
      hasPreviousPage: { type: 'boolean', example: false },
      searchTerm: { type: 'string', example: 'reunión proyecto' },
      accountsSearched: { 
        type: 'array', 
        items: { type: 'string' },
        example: ['juan.trabajo@gmail.com', 'juan.personal@gmail.com']
      }
    }
  }
})
@ApiBadRequestResponse({ 
  description: 'userId y q son requeridos'
})
async searchAllAccountsEmails(
  @Query('userId') userId: string,
  @Query('q') searchTerm: string,
  @Query('page') page?: string,
  @Query('limit') limit?: string
) {
  // 🎯 VALIDACIONES
  if (!userId) {
    throw new BadRequestException('userId es requerido');
  }

  if (!searchTerm || searchTerm.trim() === '') {
    return {
      emails: [],
      total: 0,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
      searchTerm: searchTerm || '',
      accountsSearched: []
    };
  }

  // 🎯 LLAMAR AL NUEVO MÉTODO DEL SERVICE
  return this.emailsService.searchAllAccountsEmailsWithUserId(
    userId, 
    searchTerm, 
    page ? parseInt(page, 10) : 1, 
    limit ? parseInt(limit, 10) : 10
  );
}


/**
 * 📥 GET /emails/inbox-all-accounts - Inbox unificado de TODAS las cuentas Gmail
 * 🎯 NUEVO: Inbox global unificado
 */
@Get('inbox-all-accounts')
@ApiOperation({ 
  summary: '📥 Inbox unificado de TODAS las cuentas Gmail del usuario',
  description: 'Obtiene los emails más recientes de TODAS las cuentas Gmail asociadas al usuario principal. Unifica resultados y los ordena por fecha globalmente.'
})
@ApiQuery({ 
  name: 'userId', 
  description: 'ID del usuario principal', 
  example: '1' 
})
@ApiQuery({ 
  name: 'page', 
  description: 'Número de página', 
  example: 1, 
  required: false 
})
@ApiQuery({ 
  name: 'limit', 
  description: 'Emails por página (máx 50)', 
  example: 10, 
  required: false 
})
@ApiOkResponse({ 
  description: 'Inbox unificado obtenido exitosamente',
  schema: {
    type: 'object',
    properties: {
      emails: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '1847a8e123456789' },
            subject: { type: 'string', example: 'Actualización del proyecto' },
            fromEmail: { type: 'string', example: 'cliente@empresa.com' },
            fromName: { type: 'string', example: 'María García' },
            receivedDate: { type: 'string', example: '2024-01-15T10:30:00Z' },
            isRead: { type: 'boolean', example: false },
            hasAttachments: { type: 'boolean', example: true },
            sourceAccount: { type: 'string', example: 'agata.morales92@gmail.com' },
            sourceAccountId: { type: 'number', example: 1 }
          }
        }
      },
      total: { type: 'number', example: 156 },
      page: { type: 'number', example: 1 },
      limit: { type: 'number', example: 10 },
      totalPages: { type: 'number', example: 16 },
      hasNextPage: { type: 'boolean', example: true },
      hasPreviousPage: { type: 'boolean', example: false },
      accountsLoaded: { 
        type: 'array', 
        items: { type: 'string' },
        example: ['agata.morales92@gmail.com', 'celestino.lely54@gmail.com']
      }
    }
  }
})
@ApiBadRequestResponse({ 
  description: 'userId es requerido'
})
async getInboxAllAccounts(
  @Query('userId') userId: string,
  @Query('page') page?: string,
  @Query('limit') limit?: string
) {
  // 🎯 VALIDACIONES
  if (!userId) {
    throw new BadRequestException('userId es requerido');
  }

  // 🎯 LLAMAR AL NUEVO MÉTODO DEL SERVICE
  return this.emailsService.getInboxAllAccountsWithUserId(
    userId, 
    page ? parseInt(page, 10) : 1, 
    limit ? parseInt(limit, 10) : 10
  );
}




  /**
   * 🔍 GET /emails/cron-status - Ver estado del CRON
   */
@Get('cron-status')
@ApiOperation({ 
  summary: '📊 Ver estado del servicio CRON',
  description: 'Muestra información sobre la configuración y estado del CRON sync.'
})
@ApiOkResponse({ 
  description: 'Estado del CRON',
  schema: {
    type: 'object',
    properties: {
      enabled: { type: 'boolean', example: true },
      weekdaySchedule: { type: 'string', example: '*/10 * * * 1-5' },
      weekendSchedule: { type: 'string', example: '0 */4 * * 0,6' },
      maxEmailsPerAccount: { type: 'number', example: 30 },
      maxAccountsPerRun: { type: 'number', example: 100 },
      nextWeekdayRun: { type: 'string', example: 'en 7 minutos' },
      nextWeekendRun: { type: 'string', example: 'Sábado a las 00:00' }
    }
  }
})
async getCronStatus() {
  return {
    enabled: true,
    weekdaySchedule: '*/10 * * * 1-5',
    weekendSchedule: '0 */4 * * 0,6',
    maxEmailsPerAccount: 30,
    maxAccountsPerRun: 100,
    nextWeekdayRun: 'en 7 minutos',
    nextWeekendRun: 'Sábado a las 00:00'
  };
}

  // ================================
  // 🚦 ENDPOINTS DEL SEMÁFORO
  // ================================

/**
 * 🚦 GET /emails/traffic-light/dashboard - Dashboard del semaforo
 */
@Get('traffic-light/dashboard')
@ApiOperation({ 
  summary: 'Dashboard del semaforo de emails',
  description: 'Obtiene estadísticas del semaforo agrupadas por cuenta Gmail del usuario.'
})
@ApiOkResponse({ 
  description: 'Estadísticas del semaforo obtenidas exitosamente',
  schema: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      dashboard: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            cuenta_id: { type: 'number', example: 1 },
            email_gmail: { type: 'string', example: 'usuario@gmail.com' },
            nombre_cuenta: { type: 'string', example: 'Juan Pérez' },
            total_sin_responder: { type: 'number', example: 25 },
            estadisticas: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  traffic_light_status: { 
                    type: 'string', 
                    enum: ['green', 'yellow', 'orange', 'red'],
                    example: 'red' 
                  },
                  count: { type: 'string', example: '15' },
                  avg_days: { type: 'string', example: '7.2' }
                }
              }
            }
          }
        }
      },
      ultima_actualizacion: { type: 'string', example: '2025-08-29T15:30:00Z' }
    }
  }
})
@ApiUnauthorizedResponse({ 
  description: 'Token JWT inválido o expirado',
  type: EmailErrorResponseDto 
})
async getTrafficLightDashboard(
  @Headers('authorization') authHeader: string
): Promise<TrafficLightDashboardResponse> {
  if (!authHeader) {
    throw new UnauthorizedException('Token JWT requerido en Authorization header');
  }

  console.log('Obteniendo dashboard del semaforo');
  
  return await this.emailsService.getTrafficLightDashboard(authHeader);
}

/**
 * 🚦 GET /emails/traffic-light/:status - Emails por estado del semaforo
 */
@Get('traffic-light/:status')
@ApiOperation({ 
  summary: 'Obtener emails por estado del semaforo',
  description: 'Obtiene emails filtrados por color del semaforo (green, yellow, orange, red).'
})
@ApiParam({ 
  name: 'status', 
  enum: TrafficLightStatus,
  description: 'Color del semaforo',
  example: 'red'
})
@ApiQuery({ 
  name: 'cuentaId', 
  required: false, 
  description: 'ID de cuenta Gmail específica (opcional)',
  example: 1
})
@ApiQuery({ 
  name: 'limit', 
  required: false, 
  description: 'Límite de resultados',
  example: 10
})
@ApiOkResponse({ 
  description: 'Emails por estado obtenidos exitosamente',
  schema: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      status: { 
        type: 'string', 
        enum: ['green', 'yellow', 'orange', 'red'],
        example: 'red'
      },
      count: { type: 'number', example: 5 },
      emails: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 12345 },
            gmail_message_id: { type: 'string', example: '1847a8e123456789' },
            asunto: { type: 'string', example: 'Proyecto urgente' },
            remitente_email: { type: 'string', example: 'cliente@empresa.com' },
            remitente_nombre: { type: 'string', example: 'María García' },
            fecha_recibido: { type: 'string', example: '2025-08-20T10:30:00Z' },
            days_without_reply: { type: 'number', example: 9 },
            traffic_light_status: { type: 'string', example: 'red' },
            replied_at: { type: 'string', nullable: true, example: null }
          }
        }
      }
    }
  }
})
@ApiBadRequestResponse({ 
  description: 'Estado del semaforo inválido',
  type: EmailErrorResponseDto 
})
async getEmailsByTrafficLight(
  @Headers('authorization') authHeader: string,
  @Param('status') status: string,
  @Query('cuentaId') cuentaId?: string,
  @Query('limit') limit?: string
): Promise<EmailsByTrafficLightResponse> {
  if (!authHeader) {
    throw new UnauthorizedException('Token JWT requerido en Authorization header');
  }

  // Validar estado del semaforo
  if (!Object.values(TrafficLightStatus).includes(status as TrafficLightStatus)) {
    throw new BadRequestException('Estado del semaforo inválido. Debe ser: green, yellow, orange, red');
  }

  const trafficStatus = status as TrafficLightStatus;
  const cuentaIdNum = cuentaId ? parseInt(cuentaId, 10) : undefined;
  const limitNum = limit ? parseInt(limit, 10) : 10;

  if (cuentaId && isNaN(cuentaIdNum!)) {
    throw new BadRequestException('cuentaId debe ser un número válido');
  }

  if (limit && (isNaN(limitNum) || limitNum < 1 || limitNum > 100)) {
    throw new BadRequestException('limit debe ser un número entre 1 y 100');
  }

  console.log(`Obteniendo emails con estado ${trafficStatus}`);
  
  return await this.emailsService.getEmailsByTrafficLight(
    authHeader, 
    trafficStatus, 
    cuentaIdNum, 
    limitNum
  );
}

/**
 * 🔄 POST /emails/traffic-light/update - Actualizar semaforos manualmente
 */
@Post('traffic-light/update')
@ApiOperation({ 
  summary: 'Actualizar semaforos de todos los emails',
  description: 'Recalcula los estados del semaforo para todos los emails del sistema.'
})
@ApiOkResponse({ 
  description: 'Semáforos actualizados correctamente',
  schema: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Semáforos actualizados correctamente' },
      estadisticas: {
        type: 'object',
        properties: {
          actualizados: { type: 'number', example: 24450 },
          tiempo_ms: { type: 'number', example: 1915 },
          por_estado: {
            type: 'object',
            properties: {
              red: { type: 'number', example: 24057 },
              orange: { type: 'number', example: 163 },
              yellow: { type: 'number', example: 44 },
              green: { type: 'number', example: 186 }
            }
          }
        }
      }
    }
  }
})
@ApiUnauthorizedResponse({ 
  description: 'Token JWT inválido o expirado',
  type: EmailErrorResponseDto 
})
async updateTrafficLights(
  @Headers('authorization') authHeader: string
): Promise<UpdateTrafficLightsResponse> {
  if (!authHeader) {
    throw new UnauthorizedException('Token JWT requerido en Authorization header');
  }

  console.log('Actualizando semaforos de todos los emails');
  
  return await this.emailsService.updateTrafficLights(authHeader);
}

/**
 * ✉️ POST /emails/:id/reply - Responder un email específico
 */
@Post(':id/reply')
@ApiOperation({ 
  summary: 'Responder a un email específico',
  description: 'Envía una respuesta a un email usando la cuenta Gmail correspondiente.'
})
@ApiParam({ 
  name: 'id', 
  description: 'ID del email a responder', 
  example: '1847a8e123456789' 
})
@ApiBody({
  description: 'Contenido de la respuesta',
  schema: {
    type: 'object',
    properties: {
      body: {
        type: 'string',
        description: 'Contenido de la respuesta',
        example: 'Gracias por tu mensaje. Te respondo que...'
      },
      bodyHtml: {
        type: 'string', 
        description: 'Contenido HTML (opcional)',
        example: '<p>Gracias por tu mensaje.</p><p>Te respondo que...</p>'
      }
    },
    required: ['body']
  }
})
@ApiOkResponse({ 
  description: 'Respuesta enviada exitosamente',
  schema: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Respuesta enviada exitosamente' },
      sentMessageId: { type: 'string', example: '1847a8e987654321' }
    }
  }
})
@ApiUnauthorizedResponse({ 
  description: 'Token JWT inválido o expirado',
  type: EmailErrorResponseDto 
})
@ApiNotFoundResponse({ 
  description: 'Email no encontrado en ninguna cuenta del usuario',
  type: EmailErrorResponseDto 
})
@ApiBadRequestResponse({ 
  description: 'Contenido de respuesta inválido',
  type: EmailErrorResponseDto 
})
async replyToEmail(
  @Headers('authorization') authHeader: string,
  @Param('id') emailId: string,
  @Body() replyData: {
    body: string;
    bodyHtml?: string;
  }
): Promise<{
  success: boolean;
  message?: string;
  sentMessageId: string;
}> {
  if (!authHeader) {
    throw new UnauthorizedException('Token JWT requerido en Authorization header');
  }

  if (!emailId) {
    throw new BadRequestException('ID del email es requerido');
  }

  if (!replyData.body || replyData.body.trim() === '') {
    throw new BadRequestException('El contenido de la respuesta es requerido');
  }

  console.log(`📧 Enviando respuesta al email ${emailId}`);
  
  // 🎯 LLAMAR AL NUEVO MÉTODO DEL SERVICE
  const result = await this.emailsService.replyToEmailWithJWT(authHeader, emailId, replyData);
  return {
    success: result.success,
    message: result.message,
    sentMessageId: result.sentMessageId ?? ''
  };
}
  //************************************************ */


  /**
   * 📧 GET /emails/:id - Obtener email específico
   */
  @Get(':id')
  @ApiOperation({ 
    summary: 'Obtener email por ID',
    description: 'Obtiene el contenido completo de un email específico por su ID desde Gmail API.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID del email en Gmail', 
    example: '1847a8e123456789' 
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' })
  @ApiOkResponse({ 
    description: 'Email obtenido exitosamente',
    type: EmailDetailDto 
  })
  @ApiUnauthorizedResponse({ 
    description: 'Token de Gmail inválido o expirado',
    type: EmailErrorResponseDto 
  })
  @ApiNotFoundResponse({ 
    description: 'Email no encontrado',
    type: EmailErrorResponseDto 
  })
async getEmailById(
  @Headers('authorization') authHeader: string,
  @Param('id') emailId: string
): Promise<EmailDetailDto> {
  if (!authHeader) {
    throw new UnauthorizedException('Token JWT requerido en Authorization header');
  }

  if (!emailId) {
    throw new BadRequestException('ID del mensaje es requerido');
  }

  console.log(`📧  Obteniendo email ${emailId} por JWT token`);
  
  // 🎯 LLAMAR AL NUEVO MÉTODO DEL SERVICE
  const result = await this.emailsService.getEmailByIdWithJWT(authHeader, emailId);

  return {
    ...result,
    receivedDate: result.receivedDate.toISOString()
  };
}
/**
 * 🗑️ DELETE /emails/:id - Eliminar un email específico
 */
@Delete(':id')
@ApiOperation({ 
  summary: 'Eliminar un email específico',
  description: 'Marca un email como eliminado. El email se marca con estado "deleted" en el semáforo y opcionalmente se puede eliminar de Gmail API si está configurado.'
})
@ApiParam({ 
  name: 'id', 
  description: 'ID del email a eliminar', 
  example: '1847a8e123456789' 
})
@ApiOkResponse({ 
  description: 'Email eliminado exitosamente',
  schema: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Email eliminado exitosamente' },
      emailId: { type: 'string', example: '1847a8e123456789' },
      previousStatus: { 
        type: 'string', 
        enum: ['green', 'yellow', 'orange', 'red'],
        example: 'red' 
      },
      deletedFromGmail: { type: 'boolean', example: false }
    }
  }
})
@ApiUnauthorizedResponse({ 
  description: 'Token JWT inválido o expirado',
  type: EmailErrorResponseDto 
})
@ApiNotFoundResponse({ 
  description: 'Email no encontrado en ninguna cuenta del usuario',
  type: EmailErrorResponseDto 
})
async deleteEmail(
  @Headers() headers: Record<string, string | undefined>,
  @Param('id') emailId: string
): Promise<{
  success: boolean;
  message?: string;
  emailId: string;
  previousStatus?: TrafficLightStatus;
  deletedFromGmail?: boolean;
  error?: string;
}> {
  const authHeader = headers?.authorization;
  
  if (!authHeader) {
    throw new UnauthorizedException('Token JWT requerido en Authorization header');
  }

  if (!emailId) {
    throw new BadRequestException('ID del email es requerido');
  }

  console.log(`🗑️ Eliminando email ${emailId}`);
  
  // Llamar al método del service
  const result = await this.emailsService.deleteEmailWithJWT(authHeader, emailId);
  
  if (!result.success) {
    if (result.error?.includes('no encontrado')) {
      throw new NotFoundException(result.error);
    } else if (result.error?.includes('JWT inválido')) {
      throw new UnauthorizedException(result.error);
    } else {
      throw new BadRequestException(result.error || 'Error eliminando email');
    }
  }
  
  return result;
}

}