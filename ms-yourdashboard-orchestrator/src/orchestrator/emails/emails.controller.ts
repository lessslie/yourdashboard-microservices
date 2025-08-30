import {
  Controller,
  Get,
  Post,
  Query,
  Headers,
  Param,
  BadRequestException, 
  UnauthorizedException,
  NotFoundException,
  Body,
  Logger,
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
  ReplyResponseDto,
} from './dto';
import { ReplyEmailRequest, ReplyEmailResponse } from './interfaces/emails.interfaces';
import { OrchestratorEmailsByTrafficLight, OrchestratorTrafficLightDashboard, OrchestratorUpdateTrafficLights, TrafficLightStatus } from './interfaces';

@Controller('emails')
@ApiTags('Emails')
export class EmailsOrchestratorController {
  private readonly logger = new Logger(EmailsOrchestratorController.name);

  constructor(private readonly emailsService: EmailsOrchestratorService) {}

  /**
   * POST /emails/sync - Sincronización manual coordinada
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
   * POST /emails/sync/incremental - Sincronización incremental coordinada
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
   * GET /emails/inbox - Obtener inbox coordinado
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
   * GET /emails/search - Buscar emails coordinado
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
   * GET /emails/search-all-accounts - Buscar emails (TODAS LAS CUENTAS)
   */
  @Get('search-all-accounts')
  @ApiOperation({ 
    summary: 'Buscar emails en TODAS las cuentas Gmail del usuario',
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
   * GET /emails/inbox-all-accounts - INBOX UNIFICADO (TODAS LAS CUENTAS)
   */
  @Get('inbox-all-accounts')
  @ApiOperation({ 
    summary: 'Inbox unificado de TODAS las cuentas Gmail',
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
   * GET /emails/stats - Estadísticas coordinadas
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

  // =================
  // ENDPOINTS SEMAFORO
  // =================

  /**
   * GET /emails/traffic-light/dashboard - Dashboard del semáforo
   */
  @Get('traffic-light/dashboard')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Dashboard del semáforo de emails',
    description: 'Obtiene estadísticas del semáforo agrupadas por cuenta Gmail del usuario autenticado.'
  })
  @ApiOkResponse({ 
    description: 'Dashboard del semáforo obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        source: { type: 'string', example: 'orchestrator' },
        data: {
          type: 'object',
          properties: {
            dashboard: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  cuentaId: { type: 'number', example: 1 },
                  emailGmail: { type: 'string', example: 'usuario@gmail.com' },
                  nombreCuenta: { type: 'string', example: 'Juan Pérez' },
                  totalSinResponder: { type: 'number', example: 25 },
                  estadisticas: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        trafficLightStatus: { 
                          type: 'string', 
                          enum: ['green', 'yellow', 'orange', 'red'],
                          example: 'red' 
                        },
                        count: { type: 'string', example: '15' },
                        avgDays: { type: 'string', example: '7.2' }
                      }
                    }
                  }
                }
              }
            },
            ultimaActualizacion: { type: 'string', example: '2025-08-30T15:30:00Z' }
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: 'Token JWT requerido',
    type: OrchestratorErrorDto 
  })
  async getTrafficLightDashboard(
    @Headers('authorization') authHeader: string
  ): Promise<OrchestratorTrafficLightDashboard> {
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido - usa el botón Authorize');
    }

    this.logger.log('Dashboard del semáforo via orchestrator');
    
    return this.emailsService.getTrafficLightDashboard(authHeader);
  }

  /**
   * GET /emails/traffic-light/:status - Emails por estado del semáforo
   */
  @Get('traffic-light/:status')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Obtener emails por estado del semáforo',
    description: 'Obtiene emails filtrados por color del semáforo (green, yellow, orange, red) del usuario autenticado.'
  })
  @ApiParam({ 
    name: 'status', 
    enum: TrafficLightStatus,
    description: 'Color del semáforo',
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
    description: 'Límite de resultados (máximo 100)',
    example: 10
  })
  @ApiOkResponse({ 
    description: 'Emails por estado obtenidos exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        source: { type: 'string', example: 'orchestrator' },
        status: { 
          type: 'string', 
          enum: ['green', 'yellow', 'orange', 'red'],
          example: 'red'
        },
        data: {
          type: 'object',
          properties: {
            count: { type: 'number', example: 5 },
            emails: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 12345 },
                  messageId: { type: 'string', example: '1847a8e123456789' },
                  subject: { type: 'string', example: 'Proyecto urgente' },
                  fromEmail: { type: 'string', example: 'cliente@empresa.com' },
                  fromName: { type: 'string', example: 'María García' },
                  receivedDate: { type: 'string', example: '2025-08-20T10:30:00Z' },
                  isRead: { type: 'boolean', example: false },
                  hasAttachments: { type: 'boolean', example: true },
                  daysWithoutReply: { type: 'number', example: 9 },
                  trafficLightStatus: { type: 'string', example: 'red' },
                  repliedAt: { type: 'string', nullable: true, example: null },
                  sourceAccount: { type: 'string', example: 'usuario@gmail.com' },
                  sourceAccountId: { type: 'number', example: 1 }
                }
              }
            }
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Estado del semáforo inválido',
    type: OrchestratorErrorDto 
  })
  @ApiUnauthorizedResponse({ 
    description: 'Token JWT requerido',
    type: OrchestratorErrorDto 
  })
  async getEmailsByTrafficLight(
    @Headers('authorization') authHeader: string,
    @Param('status') status: string,
    @Query('cuentaId') cuentaId?: string,
    @Query('limit') limit?: string
  ): Promise<OrchestratorEmailsByTrafficLight> {
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido - usa el botón Authorize');
    }

    // Validar estado del semáforo
    if (!Object.values(TrafficLightStatus).includes(status as TrafficLightStatus)) {
      throw new BadRequestException('Estado del semáforo inválido. Debe ser: green, yellow, orange, red');
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

    this.logger.log(`Obteniendo emails con estado ${trafficStatus} via orchestrator`);
    
    return this.emailsService.getEmailsByTrafficLight(
      authHeader, 
      trafficStatus, 
      cuentaIdNum, 
      limitNum
    );
  }

  /**
   * POST /emails/traffic-light/update - Actualizar semáforos manualmente
   */
  @Post('traffic-light/update')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Actualizar semáforos de todos los emails',
    description: 'Recalcula los estados del semáforo para todos los emails del usuario autenticado.'
  })
  @ApiOkResponse({ 
    description: 'Semáforos actualizados correctamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        source: { type: 'string', example: 'orchestrator' },
        data: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Semáforos actualizados correctamente' },
            estadisticas: {
              type: 'object',
              properties: {
                actualizados: { type: 'number', example: 24450 },
                tiempoMs: { type: 'number', example: 1915 },
                porEstado: {
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
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: 'Token JWT requerido',
    type: OrchestratorErrorDto 
  })
  async updateTrafficLights(
    @Headers('authorization') authHeader: string
  ): Promise<OrchestratorUpdateTrafficLights> {
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido - usa el botón Authorize');
    }

    this.logger.log('Actualizando semáforos via orchestrator');
    
    return this.emailsService.updateTrafficLights(authHeader);
  }

  /**
   * POST /emails/:id/reply
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
      this.logger.log(`DEBUG - authHeader: ${authHeader ? 'presente' : 'undefined'}`);

      if (!authHeader) {
        throw new UnauthorizedException('Token JWT requerido - usa el botón Authorize');
      }

      const userId = this.emailsService.extractUserIdFromJWT(authHeader);
      this.logger.log(`Enviando respuesta al email ${emailId} para usuario ${userId}`);

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

      this.logger.log(`Respuesta enviada exitosamente: ${result.sentMessageId}`);
      return result;

    } catch (error) {
      this.logger.error(`Error en respuesta de email:`, error);
      
      if (error instanceof NotFoundException || 
          error instanceof UnauthorizedException || 
          error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException('Error interno enviando respuesta');
    }
  }

  /**
   * GET /emails/:id - Email específico coordinado
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

    this.logger.log(`ORCHESTRATOR - Obteniendo email ${emailId} con JWT token`);
    
    return this.emailsService.getEmailByIdWithJWT(authHeader, emailId);
  }
}