import {
  Controller,
  Get,
  Post,
  Query,
  Headers,
  Delete,
  Param,
  BadRequestException, 
  UnauthorizedException,
  NotFoundException,
  Body,
  Logger,
  Request
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EmailsOrchestratorService } from './emails.service';
import {
  OrchestratorEmailListDto,
  OrchestratorStatsDto,
  OrchestratorErrorDto,
  ReplyEmailDto,
  ReplyResponseDto
} from './dto';
import { ReplyEmailRequest, ReplyEmailResponse } from './interfaces/emails.interfaces';

@Controller('emails')
@ApiTags('Emails')
export class EmailsOrchestratorController {
  private readonly logger = new Logger(EmailsOrchestratorController.name);

  constructor(private readonly emailsService: EmailsOrchestratorService) {}

  /**
   * 🔄 POST /emails/sync - Sincronización manual coordinada
   */
  @Post('sync')
  @ApiOperation({ 
    summary: 'Sincronizar emails manualmente',
    description: 'Coordina MS-Auth + MS-Email para ejecutar sincronización manual de emails.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' })
  @ApiQuery({ name: 'maxEmails', description: 'Máximo emails a sincronizar', example: 100, required: false })
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
                cuenta_gmail_id: { type: 'number', example: 4 },
                emails_nuevos: { type: 'number', example: 15 },
                emails_actualizados: { type: 'number', example: 5 },
                tiempo_total_ms: { type: 'number', example: 2500 }
              }
            }
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'cuentaGmailId es requerido',
    type: OrchestratorErrorDto
  })
  async syncEmails(
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('maxEmails') maxEmails?: string
  ) {
    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId es requerido');
    }

    return this.emailsService.syncEmails(
      cuentaGmailId, 
      maxEmails ? parseInt(maxEmails, 10) : 10000
    );
  }

  /**
   * 🔄 POST /emails/sync/incremental - Sincronización incremental coordinada
   */
  @Post('sync/incremental')
  @ApiOperation({ 
    summary: 'Sincronización incremental de emails',
    description: 'Coordina MS-Auth + MS-Email para sincronizar solo emails nuevos.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' })
  @ApiQuery({ name: 'maxEmails', description: 'Máximo emails nuevos', example: 30, required: false })
  @ApiOkResponse({ 
    description: 'Sincronización incremental completada',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        source: { type: 'string', example: 'orchestrator' },
        data: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Sincronización incremental completada' },
            stats: {
              type: 'object',
              properties: {
                cuenta_gmail_id: { type: 'number', example: 4 },
                emails_nuevos: { type: 'number', example: 8 },
                emails_actualizados: { type: 'number', example: 2 }
              }
            }
          }
        }
      }
    }
  })
  async syncIncremental(
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('maxEmails') maxEmails?: string
  ) {
    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId es requerido');
    }

    return this.emailsService.syncIncremental(
      cuentaGmailId, 
      maxEmails ? parseInt(maxEmails, 10) : 10000
    );
  }

  /**
   * 📧 GET /emails/inbox - Obtener inbox coordinado
   */
  @Get('inbox')
  @ApiOperation({ 
    summary: 'Obtener inbox de emails',
    description: 'Coordina MS-Auth (tokens) + MS-Email (datos) para obtener la lista de emails del usuario.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' })
  @ApiQuery({ name: 'page', description: 'Número de página', example: 1, required: false })
  @ApiQuery({ name: 'limit', description: 'Emails por página (máx 50)', example: 10, required: false })
  @ApiOkResponse({ 
    description: 'Inbox obtenido exitosamente',
    type: OrchestratorEmailListDto
  })
  @ApiBadRequestResponse({ 
    description: 'cuentaGmailId es requerido',
    type: OrchestratorErrorDto
  })
  async getInbox(
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId es requerido');
    }

    return this.emailsService.getInbox(
      cuentaGmailId, 
      page ? parseInt(page, 10) : 1, 
      limit ? parseInt(limit, 10) : 10
    );
  }

  /**
   * 🔍 GET /emails/search - Buscar emails coordinado
   */
  @Get('search')
  @ApiOperation({ 
    summary: 'Buscar emails',
    description: 'Coordina MS-Auth + MS-Email para buscar emails por término específico con paginación.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' })
  @ApiQuery({ name: 'q', description: 'Término de búsqueda', example: 'reunión proyecto' })
  @ApiQuery({ name: 'page', description: 'Número de página', example: 1, required: false })
  @ApiQuery({ name: 'limit', description: 'Emails por página (máx 50)', example: 10, required: false })
  @ApiOkResponse({ 
    description: 'Resultados de búsqueda obtenidos exitosamente',
    type: OrchestratorEmailListDto
  })
  @ApiBadRequestResponse({ 
    description: 'cuentaGmailId y q son requeridos',
    type: OrchestratorErrorDto 
  })
  async searchEmails(
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('q') searchTerm: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId es requerido');
    }

    if (!searchTerm || searchTerm.trim() === '') {
      return {
        success: true,
        source: 'orchestrator',
        data: {
          emails: [],
          total: 0,
          page: page ? parseInt(page, 10) : 1,
          limit: limit ? parseInt(limit, 10) : 10,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
          searchTerm: searchTerm || ''
        }
      };
    }

    return this.emailsService.searchEmails(
      cuentaGmailId, 
      searchTerm, 
      page ? parseInt(page, 10) : 1, 
      limit ? parseInt(limit, 10) : 10
    );
  }

  /**
   * 🌐 GET /emails/search-all-accounts - Buscar emails (TODAS LAS CUENTAS)
   */
  @Get('search-all-accounts')
  @ApiOperation({ 
    summary: '🌐 Buscar emails en TODAS las cuentas Gmail del usuario',
    description: 'Coordina MS-Auth + MS-Email para buscar emails en TODAS las cuentas Gmail asociadas al usuario principal. Unifica resultados y los ordena por fecha globalmente.'
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
    type: OrchestratorEmailListDto,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        source: { type: 'string', example: 'orchestrator-global-search' },
        searchTerm: { type: 'string', example: 'reunión proyecto' },
        accountsSearched: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['juan.trabajo@gmail.com', 'juan.personal@gmail.com']
        },
        data: {
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
            searchTerm: { type: 'string', example: 'reunión proyecto' }
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'userId y q son requeridos',
    type: OrchestratorErrorDto 
  })
  async searchAllAccountsEmails(
    @Query('userId') userId: string,
    @Query('q') searchTerm: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    if (!userId) {
      throw new BadRequestException('userId es requerido');
    }

    if (!searchTerm || searchTerm.trim() === '') {
      return {
        success: true,
        source: 'orchestrator-global-search',
        searchTerm: searchTerm || '',
        accountsSearched: [],
        data: {
          emails: [],
          total: 0,
          page: page ? parseInt(page, 10) : 1,
          limit: limit ? parseInt(limit, 10) : 10,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
          searchTerm: searchTerm || ''
        }
      };
    }

    return this.emailsService.searchAllAccountsEmails(
      userId, 
      searchTerm, 
      page ? parseInt(page, 10) : 1, 
      limit ? parseInt(limit, 10) : 10
    );
  }

  /**
   * 🔥 GET /emails/inbox-all-accounts - INBOX UNIFICADO (TODAS LAS CUENTAS)
   */
  @Get('inbox-all-accounts')
  @ApiOperation({ 
    summary: '🔥 Inbox unificado de TODAS las cuentas Gmail',
    description: `
      Obtiene los emails más recientes de TODAS las cuentas Gmail del usuario unificados y ordenados por fecha.
      Similar a /emails/inbox pero abarca múltiples cuentas en lugar de una sola.
      
      Perfecto para ver un "stream unificado" de todos los emails recientes del usuario.
    `
  })
  @ApiQuery({ 
    name: 'userId', 
    description: 'ID del usuario principal', 
    example: '1' 
  })
  @ApiQuery({ 
    name: 'page', 
    description: 'Número de página para paginación unificada', 
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
    type: OrchestratorEmailListDto,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        source: { type: 'string', example: 'orchestrator-unified-inbox' },
        accountsLoaded: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['agata.morales92@gmail.com', 'celestino.lely54@gmail.com']
        },
        data: {
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
            hasPreviousPage: { type: 'boolean', example: false }
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'userId es requerido',
    type: OrchestratorErrorDto 
  })
  async getInboxAllAccounts(
    @Query('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    if (!userId) {
      throw new BadRequestException('userId es requerido para inbox unificado');
    }

    return this.emailsService.getInboxAllAccounts(
      userId, 
      page ? parseInt(page, 10) : 1, 
      limit ? parseInt(limit, 10) : 10
    );
  }

  /**
   * 📊 GET /emails/stats - Estadísticas coordinadas
   */
  @Get('stats')
  @ApiOperation({ 
    summary: 'Obtener estadísticas de emails',
    description: 'Coordina MS-Auth + MS-Email para obtener contadores de emails totales, leídos y no leídos.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' })
  @ApiOkResponse({ 
    description: 'Estadísticas obtenidas exitosamente',
    type: OrchestratorStatsDto
  })
  @ApiBadRequestResponse({ 
    description: 'cuentaGmailId es requerido',
    type: OrchestratorErrorDto 
  })
  async getEmailStats(@Query('cuentaGmailId') cuentaGmailId: string) {
    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId es requerido');
    }

    return this.emailsService.getEmailStats(cuentaGmailId);
  }
  /**
 * ✉️ POST /emails/:id/reply
 */
@Post(':id/reply')
@ApiBearerAuth('JWT-auth') 
@ApiOperation({ 
  summary: 'Responder a un email específico',
  description: 'Envía una respuesta a un email usando la cuenta Gmail correspondiente.'
})
@ApiParam({ name: 'id', description: 'ID del email a responder', example: '1847a8e123456789' })
@ApiBody({ type: ReplyEmailDto })
@ApiOkResponse({ description: 'Respuesta enviada exitosamente', type: ReplyResponseDto })
@ApiUnauthorizedResponse({ description: 'Token JWT inválido', type: OrchestratorErrorDto })
@ApiNotFoundResponse({ description: 'Email no encontrado', type: OrchestratorErrorDto })
@ApiBadRequestResponse({ description: 'Datos inválidos', type: OrchestratorErrorDto })
async replyToEmail(
  @Param('id') emailId: string,
  @Body() replyData: ReplyEmailRequest,
  @Headers('authorization') authHeader: string
): Promise<ReplyEmailResponse> {
  try {
    this.logger.log(`🔍 DEBUG - authHeader: ${authHeader ? 'presente' : 'undefined'}`);

    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido - usa el botón Authorize');
    }

    const userId = this.emailsService.extractUserIdFromJWT(authHeader);
    this.logger.log(`📧 Enviando respuesta al email ${emailId} para usuario ${userId}`);

    if (!replyData.body || replyData.body.trim() === '') {
      throw new BadRequestException('El contenido de la respuesta es requerido');
    }

    const result = await this.emailsService.replyToEmail(
      emailId,
      replyData,
      authHeader
    );

    if (userId) {
      await this.emailsService.invalidateEmailCaches(userId);
    }

    this.logger.log(`✅ Respuesta enviada exitosamente: ${result.sentMessageId}`);
    return result;

  } catch (error) {
    this.logger.error(`❌ Error en respuesta de email:`, error);
    
    if (error instanceof NotFoundException || 
        error instanceof UnauthorizedException || 
        error instanceof BadRequestException) {
      throw error;
    }
    
    throw new BadRequestException('Error interno enviando respuesta');
  }
}
/**
 * 📧 GET /emails/:id - Email específico coordinado
 */
@Get(':id')
@ApiBearerAuth('JWT-auth')
@ApiOperation({ 
  summary: 'Obtener email por ID',
  description: 'Coordina MS-Auth + MS-Email para obtener email específico. Solo necesita messageId + JWT token.'
})
@ApiParam({ 
  name: 'id', 
  description: 'ID del email en Gmail', 
  example: '1847a8e123456789' 
})
@ApiOkResponse({ 
  description: 'Email obtenido exitosamente',
  schema: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      source: { type: 'string', example: 'orchestrator' },
      data: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '1847a8e123456789' },
          subject: { type: 'string', example: 'Reunión de proyecto' },
          fromEmail: { type: 'string', example: 'jefe@empresa.com' },
          fromName: { type: 'string', example: 'Juan Pérez' },
          receivedDate: { type: 'string', example: '2024-01-15T10:30:00Z' },
          isRead: { type: 'boolean', example: false },
          hasAttachments: { type: 'boolean', example: true },
          toEmails: { type: 'array', items: { type: 'string' } },
          bodyText: { type: 'string', example: 'Contenido del email...' },
          bodyHtml: { type: 'string', example: '<p>Contenido del email...</p>' },
          sourceAccount: { type: 'string', example: 'usuario@gmail.com' },
          sourceAccountId: { type: 'number', example: 4 }
        }
      }
    }
  }
})
@ApiUnauthorizedResponse({ 
  description: 'Token JWT faltante o inválido',
  type: OrchestratorErrorDto 
})
@ApiNotFoundResponse({ 
  description: 'Email no encontrado',
  type: OrchestratorErrorDto 
})
async getEmailById(
  @Param('id') emailId: string,
  @Headers('authorization') authHeader: string
) {
  if (!authHeader) {
    throw new UnauthorizedException('Token JWT requerido - usa el botón Authorize');
  }

  if (!emailId) {
    throw new BadRequestException('ID del mensaje es requerido');
  }

  this.logger.log(`🎭 ORCHESTRATOR - Obteniendo email ${emailId} con JWT token`);
  
  return this.emailsService.getEmailByIdWithJWT(authHeader, emailId);
}
}