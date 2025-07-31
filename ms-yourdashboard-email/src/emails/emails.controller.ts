import { 
  Controller, 
  Get, 
  Post,
  Query, 
  Param, 
  Headers,
  UnauthorizedException, 
  BadRequestException
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse
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

@ApiTags('Emails')
@Controller('emails')
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}



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
  getHealth(): EmailHealthResponseDto {
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
  @ApiBearerAuth('Gmail-Token')
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

    const maxEmailsNum = maxEmails ? parseInt(maxEmails, 10) : 100;
    
    return this.emailsService.syncEmailsWithToken(accessToken, cuentaGmailId, {
      maxEmails: maxEmailsNum,
      fullSync: false
    });
  }

  /**
   * 🔄 POST /emails/sync/incremental - Sincronización incremental,mas rapido, solo trae los ultimos no actuliza tooodoooo
   */
  @Post('sync/incremental')
  @ApiBearerAuth('Gmail-Token')
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
  // 📧 ENDPOINTS PRINCIPALES - ACTUALIZADOS
  // ================================

  /**
   * 📊 GET /emails/stats - Estadísticas de emails
   */
  @Get('stats')
  @ApiBearerAuth('Gmail-Token')
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
  @ApiBearerAuth('Gmail-Token')
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
  @ApiBearerAuth('Gmail-Token')
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
  @ApiBearerAuth('Gmail-Token')
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
   * 📧 GET /emails/:id - Obtener email específico
   */
  @Get(':id')
  @ApiBearerAuth('Gmail-Token')
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
    @Param('id') emailId: string,
    @Query('cuentaGmailId') cuentaGmailId: string
  ): Promise<EmailDetailDto> {
    if (!cuentaGmailId) {
      throw new UnauthorizedException('cuentaGmailId is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    if (!emailId) {
      throw new UnauthorizedException('Message ID is required');
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    if (!accessToken) {
      throw new UnauthorizedException('Valid Bearer token is required');
    }
    
    // 🎯 OBTENER DATOS DEL SERVICIO
    const result = await this.emailsService.getEmailByIdWithToken(accessToken, cuentaGmailId, emailId);

    // 🎯 CONVERTIR Date → string PARA EL DTO
    return {
      ...result,
      receivedDate: result.receivedDate.toISOString() // Date → string
    };
  }
}