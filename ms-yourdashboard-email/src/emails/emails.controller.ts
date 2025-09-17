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
  Delete,
  ServiceUnavailableException
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
  ApiBody,
  ApiForbiddenResponse,
  ApiServiceUnavailableResponse
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
import { SendEmailResponse } from './interfaces/email.interfaces-send';
import { SendEmailDto } from './dto/send-email.dto';
import { SaveFullContentResponse } from './interfaces/save-full-content.interfaces';


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
   @Headers() headers: Record<string, string | undefined>,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('maxEmails') maxEmails?: string,
    @Query('fullsync') fullsync?:string
  ) {
    const authHeader = headers?.authorization;
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
    @Headers() headers: Record<string, string | undefined>,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('maxEmails') maxEmails?: string
  ) {
    const authHeader = headers?.authorization;
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
    @Headers() headers: Record<string, string | undefined>,
    @Query('cuentaGmailId') cuentaGmailId: string
  ): Promise<EmailStatsDto> {
    const authHeader = headers?.authorization;
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
   @Headers() headers: Record<string, string | undefined>,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ): Promise<EmailListResponseDto> {
    const authHeader = headers?.authorization;
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
    @Headers() headers: Record<string, string | undefined>,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('q') searchTerm: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ): Promise<EmailListResponseDto> {
    const authHeader = headers?.authorization;
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
  @Headers() headers: Record<string, string | undefined>
): Promise<TrafficLightDashboardResponse> {
  const authHeader = headers?.authorization;
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
 @Headers() headers: Record<string, string | undefined>,
  @Param('status') status: string,
  @Query('cuentaId') cuentaId?: string,
  @Query('limit') limit?: string
): Promise<EmailsByTrafficLightResponse> {
  const authHeader = headers?.authorization;
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
 @Headers() headers: Record<string, string | undefined>
): Promise<UpdateTrafficLightsResponse> {
  const authHeader = headers?.authorization;
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
  @Headers() headers: Record<string, string | undefined>,
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
  const authHeader = headers?.authorization;
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

/**
 * 📤 POST /emails/send - Enviar email nuevo
 */
@Post('send')
@ApiOperation({ 
  summary: 'Enviar email nuevo',
  description: 'Crea y envía un email completamente nuevo (no respuesta) usando Gmail API.'
})
@ApiBody({
  description: 'Datos del email a enviar',
  type: SendEmailDto
})
@ApiOkResponse({ 
  description: 'Email enviado exitosamente',
  schema: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      messageId: { type: 'string', example: '1847a8e123456789' },
      threadId: { type: 'string', example: '1847a8e123456789' },
      sentAt: { type: 'string', example: '2024-01-15T10:30:00Z' },
      fromEmail: { type: 'string', example: 'agata.backend@gmail.com' },
      toEmails: { type: 'array', items: { type: 'string' }, example: ['cliente@empresa.com'] },
      ccEmails: { type: 'array', items: { type: 'string' }, example: ['jefe@empresa.com'] },
      bccEmails: { type: 'array', items: { type: 'string' }, example: [] },
      subject: { type: 'string', example: 'Propuesta comercial' },
      priority: { type: 'string', enum: ['low', 'normal', 'high'], example: 'normal' },
      hasAttachments: { type: 'boolean', example: false },
      attachmentCount: { type: 'number', example: 0 },
      sizeEstimate: { type: 'number', example: 2048 }
    }
  }
})
@ApiUnauthorizedResponse({ 
  description: 'Token JWT inválido o expirado',
  type: EmailErrorResponseDto 
})
@ApiBadRequestResponse({ 
  description: 'Datos del email inválidos',
  schema: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      error: { type: 'string', example: 'INVALID_EMAIL' },
      message: { type: 'string', example: 'El email cliente@empresa..com es inválido' },
      field: { type: 'string', example: 'to[0]' }
    }
  }
})
@ApiForbiddenResponse({ 
  description: 'Cuenta Gmail no pertenece al usuario',
  schema: {
    type: 'object', 
    properties: {
      success: { type: 'boolean', example: false },
      error: { type: 'string', example: 'INVALID_ACCOUNT' },
      message: { type: 'string', example: 'La cuenta agata.backend@gmail.com no está asociada a tu usuario' }
    }
  }
})
@ApiServiceUnavailableResponse({
  description: 'Límite de quota de Gmail excedido',
  schema: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      error: { type: 'string', example: 'QUOTA_EXCEEDED' },
      message: { type: 'string', example: 'Límite diario de envío excedido. Podés enviar más emails mañana a las 00:00' },
      retryAfter: { type: 'number', example: 86400 }
    }
  }
})
/**
 * 📤 POST /emails/send - Enviar email nuevo (REFACTORIZADO)
 */
@Post('send')
@ApiOperation({ 
  summary: 'Enviar email nuevo',
  description: 'Crea y envía un email completamente nuevo (no respuesta) usando Gmail API.'
})
@ApiBody({ description: 'Datos del email a enviar', type: SendEmailDto })
@ApiOkResponse({ 
  description: 'Email enviado exitosamente',
  schema: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      messageId: { type: 'string', example: '1847a8e123456789' },
      threadId: { type: 'string', example: '1847a8e123456789' },
      sentAt: { type: 'string', example: '2024-01-15T10:30:00Z' },
      fromEmail: { type: 'string', example: 'agata.backend@gmail.com' },
      toEmails: { type: 'array', items: { type: 'string' }, example: ['cliente@empresa.com'] },
      subject: { type: 'string', example: 'Propuesta comercial' },
      priority: { type: 'string', enum: ['low', 'normal', 'high'], example: 'normal' },
      hasAttachments: { type: 'boolean', example: false }
    }
  }
})
@ApiUnauthorizedResponse({ description: 'Token JWT inválido', type: EmailErrorResponseDto })
@ApiBadRequestResponse({ description: 'Datos inválidos', type: EmailErrorResponseDto })
@ApiForbiddenResponse({ description: 'Cuenta no autorizada', type: EmailErrorResponseDto })
@ApiServiceUnavailableResponse({ description: 'Límite de quota excedido', type: EmailErrorResponseDto })
async sendEmail(
  @Headers() headers: Record<string, string | undefined >,
  @Body() sendEmailData: SendEmailDto
): Promise<SendEmailResponse> {
  const authHeader = headers?.authorization;
  
  // 🔒 VALIDACIONES BÁSICAS (extraídas a método privado)
  if (!authHeader) {
    throw new UnauthorizedException('Token JWT requerido en Authorization header');
  }
  this.validateSendEmailRequest(authHeader, sendEmailData);

  // 📝 LOGGING DE LA REQUEST
  this.logSendEmailRequest(sendEmailData);

  try {
    // 🚀 ENVIAR EMAIL
    const result = await this.emailsService.sendEmailWithJWT(authHeader, sendEmailData);
    
    this.logger.log(`✅ Email enviado exitosamente - ID: ${result.messageId}`);
    return result;

  } catch (error) {
    // 🚨 MANEJO DE ERRORES (extraído a método privado)
    this.handleSendEmailError(error, sendEmailData);
  }
}

// ================================
// 🔧 MÉTODOS PRIVADOS EXTRAÍDOS
// ================================

/**
 * ✅ VALIDAR REQUEST DE SEND EMAIL
 */
private validateSendEmailRequest(authHeader: string, sendEmailData: SendEmailDto): void {
  if (!authHeader) {
    throw new UnauthorizedException('Token JWT requerido en Authorization header');
  }

  if (!sendEmailData.from) {
    throw new BadRequestException('Email remitente (from) es requerido');
  }

  if (!sendEmailData.to || sendEmailData.to.length === 0) {
    throw new BadRequestException('Al menos un destinatario (to) es requerido');
  }

  if (!sendEmailData.subject?.trim()) {
    throw new BadRequestException('Asunto del email es requerido');
  }

  if (!sendEmailData.body?.trim()) {
    throw new BadRequestException('Contenido del email (body) es requerido');
  }
}

/**
 * 📝 LOGGING DE REQUEST
 */
private logSendEmailRequest(sendEmailData: SendEmailDto): void {
  this.logger.log(`📤 Enviando email desde ${sendEmailData.from} a ${sendEmailData.to.length} destinatario(s)`);
  this.logger.debug(`Destinatarios: ${sendEmailData.to.join(', ')}`);
  this.logger.debug(`Asunto: ${sendEmailData.subject}`);
  this.logger.debug(`Prioridad: ${sendEmailData.priority || 'normal'}`);
  this.logger.debug(`Attachments: ${sendEmailData.attachments?.length || 0}`);
}

/**
 * 🚨 MANEJO DE ERRORES ESPECÍFICOS
 */
private handleSendEmailError(error: any, sendEmailData: SendEmailDto): never {
  this.logger.error('❌ Error enviando email:', error);
  
  // Re-throw specific exceptions
  if (this.isKnownException(error)) {
    throw error;
  }

  // Transform Gmail API errors
  const gmailError = this.parseErrorMessage(error?.message || 'Error desconocido');
  throw new BadRequestException(gmailError);
}

/**
 * 🔍 VERIFICAR SI ES EXCEPCIÓN CONOCIDA
 */
private isKnownException(error: any): boolean {
  return error instanceof UnauthorizedException ||
         error instanceof BadRequestException ||
         error instanceof NotFoundException ||
         error instanceof ServiceUnavailableException;
}

/**
 * 🎯 PARSEAR MENSAJE DE ERROR
 */
private parseErrorMessage(errorMessage: string): object {
  if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
    return {
      success: false,
      error: 'QUOTA_EXCEEDED',
      message: 'Límite de envío de Gmail excedido. Inténtalo más tarde.',
      retryAfter: 3600
    };
  }

  if (errorMessage.includes('Invalid recipients')) {
    return {
      success: false,
      error: 'INVALID_RECIPIENTS',
      message: 'Uno o más destinatarios tienen emails inválidos',
      field: 'to'
    };
  }

  if (errorMessage.includes('permission') || errorMessage.includes('access')) {
    return {
      success: false,
      error: 'INVALID_ACCOUNT',
      message: 'No tienes permisos para enviar desde esta cuenta'
    };
  }

  return {
    success: false,
    error: 'SEND_FAILED',
    message: 'Error interno enviando email. Inténtalo nuevamente.'
  };
}
/**
 * 💾 POST /emails/:id/save-full-content
 */
@Post(':id/save-full-content')
@ApiOperation({ 
  summary: 'Guardar contenido completo de email offline',
  description: 'Descarga y guarda el contenido completo de un email para acceso offline rápido.'
})
@ApiParam({ 
  name: 'id', 
  description: 'gmail_message_id del email', 
  example: '1847a8e123456789' 
})
@ApiOkResponse({ 
  description: 'Contenido guardado exitosamente',
  schema: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Contenido guardado exitosamente' },
      gmailMessageId: { type: 'string', example: '1847a8e123456789' }
    }
  }
})
async saveFullEmailContent(
  @Headers() headers: Record<string, string | undefined>,
  @Param('id') gmailMessageId: string
): Promise<SaveFullContentResponse> {
  
  const authHeader = headers?.authorization;
  if (!authHeader) {
    throw new UnauthorizedException('Token JWT requerido en Authorization header');
  }

  if (!gmailMessageId?.trim()) {
    throw new BadRequestException('gmail_message_id es requerido');
  }

  this.logger.log(`💾 Guardando contenido completo del email: ${gmailMessageId}`);
  
  return this.emailsService.saveFullEmailContentWithJWT(authHeader, gmailMessageId);
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
  @Headers() headers: Record<string, string | undefined>,
  @Param('id') emailId: string
): Promise<EmailDetailDto> {
  const authHeader = headers?.authorization;
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