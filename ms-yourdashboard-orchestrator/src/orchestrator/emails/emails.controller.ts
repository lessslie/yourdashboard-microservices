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
  Delete,
  HttpException,
  HttpStatus,
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
  ApiForbiddenResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import { EmailsOrchestratorService } from './emails.service';
import {
  OrchestratorEmailListDto,
  OrchestratorStatsDto,
  OrchestratorErrorDto,
  ReplyEmailDto,
  ReplyResponseDto,
  OrchestratorSendEmailResponseDto,
} from './dto';
import {
  ReplyEmailRequest,
  ReplyEmailResponse,
} from './interfaces/emails.interfaces';
import {
  OrchestratorEmailsByTrafficLight,
  OrchestratorTrafficLightDashboard,
  OrchestratorUpdateTrafficLights,
  SaveFullContentResponse,
  TrafficLightStatus,
} from './interfaces';
import { SendEmailDto } from './dto/send-email.dto';

@Controller('emails')
@ApiTags('Emails')
export class EmailsOrchestratorController {
  private readonly logger = new Logger(EmailsOrchestratorController.name);

  constructor(private readonly emailsService: EmailsOrchestratorService) {}

  /**
   * POST /emails/:id/save-full-content - Guardar contenido completo offline
   */
  @Post(':id/save-full-content')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Guardar contenido completo de email offline',
    description:
      'Descarga y guarda el contenido completo de un email para acceso offline rápido.',
  })
  @ApiParam({
    name: 'id',
    description: 'gmail_message_id del email',
    example: '1847a8e123456789',
  })
  @ApiOkResponse({
    description: 'Contenido guardado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        source: { type: 'string', example: 'orchestrator' },
        data: {
          type: 'object',
          properties: {
            emailId: { type: 'string', example: '1847a8e123456789' },
            savedAt: { type: 'string', example: '2025-09-05T18:30:00Z' },
            contentSize: { type: 'number', example: 61437 },
            attachmentsCount: { type: 'number', example: 0 },
            hasFullContent: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  async saveEmailContent(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') emailId: string,
  ): Promise<SaveFullContentResponse> {
    const authHeader = headers?.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido');
    }

    if (!emailId?.trim()) {
      throw new BadRequestException('gmail_message_id es requerido');
    }

    this.logger.log(
      `ORCHESTRATOR - Guardando contenido completo del email: ${emailId}`,
    );

    return this.emailsService.saveEmailContent(authHeader, emailId);
  }
  /**
   * POST /emails/sync - Sincronización manual coordinada
   */
  @Post('sync')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Sincronizar emails manualmente',
    description:
      'Coordina MS-Auth + MS-Email para ejecutar sincronización manual de emails.',
  })
  @ApiQuery({
    name: 'cuentaGmailId',
    description: 'ID de la cuenta Gmail específica',
    example: '1847a8e123456789',
  })
  @ApiQuery({
    name: 'maxEmails',
    description: 'Máximo emails a sincronizar',
    example: 100,
    required: false,
  })
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
            message: {
              type: 'string',
              example: 'Sincronización completada exitosamente',
            },
            stats: {
              type: 'object',
              properties: {
                cuenta_gmail_id: {
                  type: 'string',
                  example: '1847a8e123456789',
                },
                emails_nuevos: { type: 'number', example: 15 },
                emails_actualizados: { type: 'number', example: 5 },
                tiempo_total_ms: { type: 'number', example: 2500 },
              },
            },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'cuentaGmailId es requerido',
    type: OrchestratorErrorDto,
  })
  async syncEmails(
    @Headers() headers: Record<string, string | undefined>,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('maxEmails') maxEmails?: string,
  ) {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido');
    }
    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId es requerido');
    }

    return this.emailsService.syncEmails(
      cuentaGmailId,
      maxEmails ? parseInt(maxEmails, 10) : 10000,
    );
  }

  /**
   * POST /emails/sync/incremental - Sincronización incremental coordinada
   */
  @Post('sync/incremental')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Sincronización incremental de emails',
    description:
      'Coordina MS-Auth + MS-Email para sincronizar solo emails nuevos.',
  })
  @ApiQuery({
    name: 'cuentaGmailId',
    description: 'ID de la cuenta Gmail específica',
    example: '1847a8e123456789',
  })
  @ApiQuery({
    name: 'maxEmails',
    description: 'Máximo emails nuevos',
    example: 30,
    required: false,
  })
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
            message: {
              type: 'string',
              example: 'Sincronización incremental completada',
            },
            stats: {
              type: 'object',
              properties: {
                cuenta_gmail_id: {
                  type: 'string',
                  example: '1847a8e123456789',
                },
                emails_nuevos: { type: 'number', example: 8 },
                emails_actualizados: { type: 'number', example: 2 },
              },
            },
          },
        },
      },
    },
  })
  async syncIncremental(
    @Headers() headers: Record<string, string | undefined>,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('maxEmails') maxEmails?: string,
  ) {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido');
    }

    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId es requerido');
    }

    return this.emailsService.syncIncremental(
      cuentaGmailId,
      maxEmails ? parseInt(maxEmails, 10) : 10000,
    );
  }

  /**
   * GET /emails/inbox - Obtener inbox coordinado
   */
  @Get('inbox')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener inbox de emails',
    description:
      'Coordina MS-Auth (tokens) + MS-Email (datos) para obtener la lista de emails del usuario.',
  })
  @ApiQuery({
    name: 'cuentaGmailId',
    description: 'ID de la cuenta Gmail específica',
    example: '1847a8e123456789',
  })
  @ApiQuery({
    name: 'page',
    description: 'Número de página',
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Emails por página (máx 50)',
    example: 10,
    required: false,
  })
  @ApiOkResponse({
    description: 'Inbox obtenido exitosamente',
    type: OrchestratorEmailListDto,
  })
  @ApiBadRequestResponse({
    description: 'cuentaGmailId es requerido',
    type: OrchestratorErrorDto,
  })
  async getInbox(
    @Headers() headers: Record<string, string | undefined>,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // ← Cerrar los parámetros correctamente
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido');
    }

    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId es requerido');
    }

    return this.emailsService.getInbox(
      cuentaGmailId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  /**
   * GET /emails/search - Buscar emails coordinado
   */
  @Get('search')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Buscar emails',
    description:
      'Coordina MS-Auth + MS-Email para buscar emails por término específico con paginación.',
  })
  @ApiQuery({
    name: 'cuentaGmailId',
    description: 'ID de la cuenta Gmail específica',
    example: '1847a8e123456789',
  })
  @ApiQuery({
    name: 'q',
    description: 'Término de búsqueda',
    example: 'reunión proyecto',
  })
  @ApiQuery({
    name: 'page',
    description: 'Número de página',
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Emails por página (máx 50)',
    example: 10,
    required: false,
  })
  @ApiOkResponse({
    description: 'Resultados de búsqueda obtenidos exitosamente',
    type: OrchestratorEmailListDto,
  })
  @ApiBadRequestResponse({
    description: 'cuentaGmailId y q son requeridos',
    type: OrchestratorErrorDto,
  })
  async searchEmails(
    @Headers() headers: Record<string, string | undefined>,
    @Query('cuentaGmailId') cuentaGmailId: string,
    @Query('q') searchTerm: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido');
    }

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
          searchTerm: searchTerm || '',
        },
      };
    }

    return this.emailsService.searchEmails(
      cuentaGmailId,
      searchTerm,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  /**
   * GET /emails/search-all-accounts - Buscar emails (TODAS LAS CUENTAS)
   */
  @Get('search-all-accounts')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Buscar emails en TODAS las cuentas Gmail del usuario',
    description:
      'Coordina MS-Auth + MS-Email para buscar emails en TODAS las cuentas Gmail asociadas al usuario principal. Unifica resultados y los ordena por fecha globalmente.',
  })
  @ApiQuery({
    name: 'userId',
    description: 'ID del usuario principal',
    example: '1847a8e123456789',
  })
  @ApiQuery({
    name: 'q',
    description: 'Término de búsqueda global',
    example: 'reunión proyecto',
  })
  @ApiQuery({
    name: 'page',
    description: 'Número de página',
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Emails por página (máx 50)',
    example: 10,
    required: false,
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
          example: ['juan.trabajo@gmail.com', 'juan.personal@gmail.com'],
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
                  receivedDate: {
                    type: 'string',
                    example: '2024-01-15T10:30:00Z',
                  },
                  isRead: { type: 'boolean', example: false },
                  hasAttachments: { type: 'boolean', example: true },
                  sourceAccount: {
                    type: 'string',
                    example: 'juan.trabajo@gmail.com',
                  },
                },
              },
            },
            total: { type: 'number', example: 45 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 5 },
            hasNextPage: { type: 'boolean', example: true },
            hasPreviousPage: { type: 'boolean', example: false },
            searchTerm: { type: 'string', example: 'reunión proyecto' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'userId y q son requeridos',
    type: OrchestratorErrorDto,
  })
  async searchAllAccountsEmails(
    @Headers() headers: Record<string, string | undefined>,
    @Query('userId') userId: string,
    @Query('q') searchTerm: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido');
    }
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
          searchTerm: searchTerm || '',
        },
      };
    }

    return this.emailsService.searchAllAccountsEmails(
      userId,
      searchTerm,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  /**
   * GET /emails/inbox-all-accounts - INBOX UNIFICADO (TODAS LAS CUENTAS)
   */
  @Get('inbox-all-accounts')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Inbox unificado de TODAS las cuentas Gmail',
    description: `
      Obtiene los emails más recientes de TODAS las cuentas Gmail del usuario unificados y ordenados por fecha.
      Similar a /emails/inbox pero abarca múltiples cuentas en lugar de una sola.
      
      Perfecto para ver un "stream unificado" de todos los emails recientes del usuario.
    `,
  })
  @ApiQuery({
    name: 'userId',
    description: 'ID del usuario principal',
    example: '1847a8e123456789',
  })
  @ApiQuery({
    name: 'page',
    description: 'Número de página para paginación unificada',
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Emails por página (máx 50)',
    example: 10,
    required: false,
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
          example: ['agata.morals92@gmail.com', 'celestino54@gmail.com'],
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
                  subject: {
                    type: 'string',
                    example: 'Actualización del proyecto',
                  },
                  fromEmail: { type: 'string', example: 'cliente@empresa.com' },
                  fromName: { type: 'string', example: 'María García' },
                  receivedDate: {
                    type: 'string',
                    example: '2024-01-15T10:30:00Z',
                  },
                  isRead: { type: 'boolean', example: false },
                  hasAttachments: { type: 'boolean', example: true },
                  sourceAccount: {
                    type: 'string',
                    example: 'agata.morales92@gmail.com',
                  },
                  sourceAccountId: {
                    type: 'string',
                    example: '1847a8e123456789',
                  },
                },
              },
            },
            total: { type: 'number', example: 156 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 16 },
            hasNextPage: { type: 'boolean', example: true },
            hasPreviousPage: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'userId es requerido',
    type: OrchestratorErrorDto,
  })
  async getInboxAllAccounts(
    @Headers() headers: Record<string, string | undefined>,
    @Query('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido');
    }
    if (!userId) {
      throw new BadRequestException('userId es requerido para inbox unificado');
    }

    return this.emailsService.getInboxAllAccounts(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  /**
   * GET /emails/stats - Estadísticas coordinadas
   */
  @Get('stats')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener estadísticas de emails',
    description:
      'Coordina MS-Auth + MS-Email para obtener contadores de emails totales, leídos y no leídos.',
  })
  @ApiQuery({
    name: 'cuentaGmailId',
    description: 'ID de la cuenta Gmail específica',
    example: '1847a8e123456789',
  })
  @ApiOkResponse({
    description: 'Estadísticas obtenidas exitosamente',
    type: OrchestratorStatsDto,
  })
  @ApiBadRequestResponse({
    description: 'cuentaGmailId es requerido',
    type: OrchestratorErrorDto,
  })
  async getEmailStats(
    @Headers() headers: Record<string, string | undefined>,
    @Query('cuentaGmailId') cuentaGmailId: string,
  ) {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido');
    }
    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId es requerido');
    }

    return this.emailsService.getEmailStats(cuentaGmailId);
  }

  // =================
  // ENDPOINTS SEMAFORO
  // =================

  /**
   * GET /emails/traffic-light/dashboard - Dashboard del semaforo
   */
  @Get('traffic-light/dashboard')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Dashboard del semaforo de emails',
    description:
      'Obtiene estadísticas del semaforo agrupadas por cuenta Gmail del usuario autenticado.',
  })
  @ApiOkResponse({
    description: 'Dashboard del semaforo obtenido exitosamente',
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
                  cuentaId: { type: 'string', example: '1847a8e123456789' },
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
                          example: 'red',
                        },
                        count: { type: 'string', example: '15' },
                        avgDays: { type: 'string', example: '7.2' },
                      },
                    },
                  },
                },
              },
            },
            ultimaActualizacion: {
              type: 'string',
              example: '2025-08-30T15:30:00Z',
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Token JWT requerido',
    type: OrchestratorErrorDto,
  })
  async getTrafficLightDashboard(
    @Headers() headers: Record<string, string | undefined>,
  ): Promise<OrchestratorTrafficLightDashboard> {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException(
        'Token JWT requerido - usa el botón Authorize',
      );
    }

    this.logger.log('Dashboard del semaforo via orchestrator');

    return this.emailsService.getTrafficLightDashboard(authHeader);
  }

  /**
   * GET /emails/traffic-light/:status - Emails por estado del semaforo
   */
  @Get('traffic-light/:status')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener emails por estado del semaforo',
    description:
      'Obtiene emails filtrados por color del semaforo (green, yellow, orange, red) del usuario autenticado.',
  })
  @ApiParam({
    name: 'status',
    enum: TrafficLightStatus,
    description: 'Color del semaforo',
    example: 'red',
  })
  @ApiQuery({
    name: 'cuentaId',
    required: false,
    description: 'ID de cuenta Gmail específica (opcional)',
    example: '1847a8e123456789',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Límite de resultados (máximo 100)',
    example: 10,
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
          example: 'red',
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
                  id: { type: 'string', example: '1847a8e123456789' },
                  messageId: { type: 'string', example: '1847a8e123456789' },
                  subject: { type: 'string', example: 'Proyecto urgente' },
                  fromEmail: { type: 'string', example: 'cliente@empresa.com' },
                  fromName: { type: 'string', example: 'María García' },
                  receivedDate: {
                    type: 'string',
                    example: '2025-08-20T10:30:00Z',
                  },
                  isRead: { type: 'boolean', example: false },
                  hasAttachments: { type: 'boolean', example: true },
                  daysWithoutReply: { type: 'number', example: 9 },
                  trafficLightStatus: { type: 'string', example: 'red' },
                  repliedAt: { type: 'string', nullable: true, example: null },
                  sourceAccount: {
                    type: 'string',
                    example: 'usuario@gmail.com',
                  },
                  sourceAccountId: {
                    type: 'string',
                    example: '1847a8e123456789',
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Estado del semaforo inválido',
    type: OrchestratorErrorDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token JWT requerido',
    type: OrchestratorErrorDto,
  })
  async getEmailsByTrafficLight(
    @Headers() headers: Record<string, string | undefined>,
    @Param('status') status: string,
    @Query('cuentaId') cuentaId?: string,
    @Query('limit') limit?: string,
  ): Promise<OrchestratorEmailsByTrafficLight> {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException(
        'Token JWT requerido - usa el botón Authorize',
      );
    }

    // Validar estado del semaforo
    if (
      !Object.values(TrafficLightStatus).includes(status as TrafficLightStatus)
    ) {
      throw new BadRequestException(
        'Estado del semaforo inválido. Debe ser: green, yellow, orange, red',
      );
    }

    const trafficStatus = status as TrafficLightStatus;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    if (cuentaId && (!cuentaId || cuentaId.trim() === '')) {
      throw new BadRequestException('cuentaId debe ser un valor válido');
    }

    if (limit && (isNaN(limitNum) || limitNum < 1 || limitNum > 100)) {
      throw new BadRequestException('limit debe ser un número entre 1 y 100');
    }

    this.logger.log(
      `Obteniendo emails con estado ${trafficStatus} via orchestrator`,
    );

    return this.emailsService.getEmailsByTrafficLight(
      authHeader,
      trafficStatus,
      cuentaId,
      limitNum,
    );
  }

  /**
   * POST /emails/traffic-light/update - Actualizar semaforos manualmente
   */
  @Post('traffic-light/update')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Actualizar semaforos de todos los emails',
    description:
      'Recalcula los estados del semaforo para todos los emails del usuario autenticado.',
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
            message: {
              type: 'string',
              example: 'Semáforos actualizados correctamente',
            },
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
                    green: { type: 'number', example: 186 },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Token JWT requerido',
    type: OrchestratorErrorDto,
  })
  async updateTrafficLights(
    @Headers() headers: Record<string, string | undefined>,
  ): Promise<OrchestratorUpdateTrafficLights> {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException(
        'Token JWT requerido - usa el botón Authorize',
      );
    }

    this.logger.log('Actualizando semaforos via orchestrator');

    return this.emailsService.updateTrafficLights(authHeader);
  }

  /**
   * POST /emails/:id/reply
   */
  @Post(':id/reply')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Responder a un email específico',
    description:
      'Envía una respuesta a un email usando la cuenta Gmail correspondiente.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del email a responder',
    example: '1847a8e123456789',
  })
  @ApiBody({ type: ReplyEmailDto })
  @ApiOkResponse({
    description: 'Respuesta enviada exitosamente',
    type: ReplyResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token JWT inválido',
    type: OrchestratorErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Email no encontrado',
    type: OrchestratorErrorDto,
  })
  @ApiBadRequestResponse({
    description: 'Datos inválidos',
    type: OrchestratorErrorDto,
  })
  async replyToEmail(
    @Param('id') emailId: string,
    @Body() replyData: ReplyEmailRequest,
    @Headers() headers: Record<string, string | undefined>,
  ): Promise<ReplyEmailResponse> {
    const authHeader = headers?.authorization || undefined;
    try {
      this.logger.log(
        `DEBUG - authHeader: ${authHeader ? 'presente' : 'undefined'}`,
      );

      if (!authHeader) {
        throw new UnauthorizedException(
          'Token JWT requerido - usa el botón Authorize',
        );
      }

      const userId = this.emailsService.extractUserIdFromJWT(authHeader);
      this.logger.log(
        `Enviando respuesta al email ${emailId} para usuario ${userId}`,
      );

      if (!replyData.body || replyData.body.trim() === '') {
        throw new BadRequestException(
          'El contenido de la respuesta es requerido',
        );
      }

      const result = await this.emailsService.replyToEmail(
        emailId,
        replyData,
        authHeader,
      );

      if (userId) {
        await this.emailsService.invalidateEmailCaches(userId);
      }

      this.logger.log(
        `Respuesta enviada exitosamente: ${result.sentMessageId}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Error en respuesta de email:`, error);

      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('Error interno enviando respuesta');
    }
  }

  //*************************************** */
  // ENVIAR EMAIL NUEVO
  //*************************************** */

  /**
   * 📤 POST /emails/send - Enviar email nuevo
   */
  @Post('send')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Enviar email nuevo',
    description: `
    **Funcionalidad:** Crea y envía un email completamente nuevo (no respuesta) coordinando MS-Auth + MS-Email.
    
    **Diferencia con REPLY:**
    - REPLY responde a emails existentes (usa In-Reply-To, References, threadId)
    - SEND crea emails nuevos desde cero (headers simples, nuevo threadId)
    
    **Proceso interno:**
    1. Valida token JWT y extrae userId
    2. Valida que la cuenta FROM pertenezca al usuario autenticado
    3. Coordina con MS-Auth para obtener tokens válidos
    4. Delega a MS-Email para construcción y envío via Gmail API
    5. Invalida caches automáticamente
    
    **Características soportadas:**
    - Múltiples destinatarios (TO, CC, BCC)
    - Contenido HTML y texto plano
    - Archivos adjuntos (máximo 10 archivos, 25MB total)
    - Prioridades de email (low, normal, high)
    - Confirmación de lectura
    - Validaciones de seguridad y límites
  `,
  })
  @ApiBody({
    description: 'Datos completos del email a enviar',
    type: SendEmailDto,
    examples: {
      'email-simple': {
        summary: 'Email simple sin attachments',
        description: 'Ejemplo básico de email con texto plano y HTML',
        value: {
          from: 'agata.backend@gmail.com',
          to: ['cliente@empresa.com'],
          subject: 'Propuesta comercial - Proyecto ABC',
          body: 'Hola, espero que estés bien. Te envío la propuesta que discutimos...',
          bodyHtml:
            '<p>Hola,</p><p>Espero que estés bien. Te envío la propuesta que discutimos...</p>',
          priority: 'normal',
        },
      },
      'email-completo': {
        summary: 'Email completo con CC, BCC y attachments',
        description: 'Ejemplo avanzado con múltiples destinatarios y archivos',
        value: {
          from: 'agata.backend@gmail.com',
          to: ['cliente@empresa.com', 'socio@empresa.com'],
          cc: ['jefe@empresa.com'],
          bcc: ['supervisor@empresa.com'],
          subject: 'Propuesta comercial con documentos - Proyecto ABC',
          body: 'Adjunto encuentran la propuesta detallada y los documentos técnicos.',
          bodyHtml:
            '<p>Adjunto encuentran la <strong>propuesta detallada</strong> y los documentos técnicos.</p>',
          priority: 'high',
          requestReadReceipt: true,
          attachments: [
            {
              filename: 'propuesta.pdf',
              content: 'JVBERi0xLjQKJdP...',
              mimeType: 'application/pdf',
            },
          ],
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Email enviado exitosamente',
    type: OrchestratorSendEmailResponseDto,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        source: { type: 'string', example: 'orchestrator' },
        data: {
          type: 'object',
          properties: {
            messageId: { type: 'string', example: '1847a8e123456789' },
            threadId: { type: 'string', example: '1847a8e123456789' },
            sentAt: { type: 'string', example: '2024-01-15T10:30:00Z' },
            fromEmail: { type: 'string', example: 'agata.backend@gmail.com' },
            toEmails: {
              type: 'array',
              items: { type: 'string' },
              example: ['cliente@empresa.com'],
            },
            ccEmails: {
              type: 'array',
              items: { type: 'string' },
              example: ['jefe@empresa.com'],
            },
            subject: { type: 'string', example: 'Propuesta comercial' },
            priority: {
              type: 'string',
              enum: ['low', 'normal', 'high'],
              example: 'normal',
            },
            hasAttachments: { type: 'boolean', example: true },
            attachmentCount: { type: 'number', example: 1 },
            sizeEstimate: { type: 'number', example: 2048000 },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Token JWT inválido o expirado',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: { type: 'string', example: 'TOKEN_EXPIRED' },
        message: { type: 'string', example: 'Token JWT inválido o expirado' },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00Z' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Datos del email inválidos',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: { type: 'string', example: 'INVALID_RECIPIENTS' },
        message: {
          type: 'string',
          example: 'El email cliente@empresa..com es inválido',
        },
        field: { type: 'string', example: 'to[0]' },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00Z' },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Cuenta Gmail no pertenece al usuario',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: { type: 'string', example: 'ACCOUNT_NOT_AUTHORIZED' },
        message: {
          type: 'string',
          example:
            'La cuenta agata.backend@gmail.com no está asociada a tu usuario',
        },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00Z' },
      },
    },
  })
  @ApiServiceUnavailableResponse({
    description: 'Límite de quota de Gmail excedido o servicio no disponible',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: { type: 'string', example: 'QUOTA_EXCEEDED' },
        message: {
          type: 'string',
          example:
            'Límite diario de envío excedido. Podrás enviar más emails mañana a las 00:00',
        },
        retryAfter: { type: 'number', example: 86400 },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00Z' },
      },
    },
  })
  async sendEmail(
    @Headers() headers: Record<string, string | undefined>,
    @Body() sendEmailData: SendEmailDto,
  ): Promise<OrchestratorSendEmailResponseDto> {
    const authHeader = headers?.authorization;

    try {
      // 1️⃣ VALIDACIONES DE ENTRADA
      if (!authHeader) {
        throw new UnauthorizedException(
          'Token JWT requerido - usa el botón Authorize',
        );
      }

      this.validateSendEmailRequest(authHeader, sendEmailData);

      // 2️⃣ LOGGING DE LA REQUEST
      this.logSendEmailControllerRequest(sendEmailData);

      // 3️⃣ DELEGAR AL SERVICE
      const result = await this.emailsService.sendEmail(
        authHeader,
        sendEmailData,
      );

      this.logger.log(
        `✅ Email enviado exitosamente via orchestrator - ID: ${result.data?.messageId}`,
      );

      return {
        success: true,
        source: 'orchestrator',
        data: result.data!,
      };
    } catch (error) {
      // 4️⃣ MANEJO ESPECÍFICO DE ERRORES
      this.handleSendEmailError(error, sendEmailData);
    }
  }

  // ================================
  // 🔧 MÉTODOS PRIVADOS PARA EL ENDPOINT SEND
  // ================================

  /**
   * ✅ VALIDAR REQUEST DE SEND EMAIL
   */
  private validateSendEmailRequest(
    authHeader: string,
    sendEmailData: SendEmailDto,
  ): void {
    if (!authHeader) {
      throw new UnauthorizedException(
        'Token JWT requerido en Authorization header',
      );
    }

    if (!sendEmailData.from) {
      throw new BadRequestException('Email remitente (from) es requerido');
    }

    if (!sendEmailData.to || sendEmailData.to.length === 0) {
      throw new BadRequestException(
        'Al menos un destinatario (to) es requerido',
      );
    }

    if (!sendEmailData.subject?.trim()) {
      throw new BadRequestException('Asunto del email es requerido');
    }

    if (!sendEmailData.body?.trim()) {
      throw new BadRequestException('Contenido del email (body) es requerido');
    }

    // Validación adicional de límites del controller
    const totalRecipients =
      sendEmailData.to.length +
      (sendEmailData.cc?.length || 0) +
      (sendEmailData.bcc?.length || 0);
    if (totalRecipients > 100) {
      throw new BadRequestException(
        `Demasiados destinatarios: ${totalRecipients}. Límite: 100 total`,
      );
    }

    if (sendEmailData.attachments && sendEmailData.attachments.length > 10) {
      throw new BadRequestException('Máximo 10 archivos adjuntos permitidos');
    }
  }

  /**
   * 📝 LOGGING DE REQUEST EN CONTROLLER
   */
  private logSendEmailControllerRequest(sendEmailData: SendEmailDto): void {
    this.logger.log(
      `📤 ORCHESTRATOR - Enviando email desde ${sendEmailData.from} a ${sendEmailData.to.length} destinatario(s)`,
    );
    this.logger.debug(`Destinatarios: ${sendEmailData.to.join(', ')}`);
    this.logger.debug(`Asunto: ${sendEmailData.subject}`);
    this.logger.debug(`Prioridad: ${sendEmailData.priority || 'normal'}`);
    this.logger.debug(`Attachments: ${sendEmailData.attachments?.length || 0}`);
    this.logger.debug(
      `CC: ${sendEmailData.cc?.length || 0}, BCC: ${sendEmailData.bcc?.length || 0}`,
    );
  }

  /**
   * 🚨 MANEJO DE ERRORES ESPECÍFICOS DE SEND
   */
  private handleSendEmailError(error: any, sendEmailData: SendEmailDto): never {
    this.logger.error('❌ Error enviando email via orchestrator:', error);
    console.log(sendEmailData);

    // Re-throw specific exceptions
    if (this.isKnownHttpException(error)) {
      throw error;
    }

    // Transform otros errores conocidos
    if (error instanceof Error) {
      const errorMessage = error.message;

      if (errorMessage.includes('fetch')) {
        throw new HttpException(
          'Error de conexión con el servicio de email',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (
        errorMessage.includes('timeout') ||
        errorMessage.includes('AbortError')
      ) {
        throw new HttpException(
          'Timeout enviando email - el proceso tomó demasiado tiempo',
          HttpStatus.REQUEST_TIMEOUT,
        );
      }
    }

    // Error genérico
    throw new BadRequestException({
      success: false,
      error: 'SEND_FAILED',
      message: 'Error interno enviando email. Inténtalo nuevamente.',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 🔍 VERIFICAR SI ES EXCEPCIÓN HTTP CONOCIDA
   */
  private isKnownHttpException(error: any): error is HttpException {
    return (
      error instanceof UnauthorizedException ||
      error instanceof BadRequestException ||
      error instanceof NotFoundException ||
      error instanceof HttpException
    );
  }
  /**
   * GET /emails/:id - Email específico coordinado
   */
  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener email por ID',
    description:
      'Coordina MS-Auth + MS-Email para obtener email específico. Solo necesita messageId + JWT token.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del email en Gmail',
    example: '1847a8e123456789',
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
            bodyHtml: {
              type: 'string',
              example: '<p>Contenido del email...</p>',
            },
            sourceAccount: { type: 'string', example: 'usuario@gmail.com' },
            sourceAccountId: { type: 'string', example: '1847a8e123456789' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Token JWT faltante o inválido',
    type: OrchestratorErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Email no encontrado',
    type: OrchestratorErrorDto,
  })
  async getEmailById(
    @Param('id') emailId: string,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException(
        'Token JWT requerido - usa el botón Authorize',
      );
    }

    if (!emailId) {
      throw new BadRequestException('ID del mensaje es requerido');
    }

    this.logger.log(`ORCHESTRATOR - Obteniendo email ${emailId} con JWT token`);

    return this.emailsService.getEmailByIdWithJWT(authHeader, emailId);
  }

  /**
   * 🗑️ DELETE /emails/:id - Eliminar un email específico
   */
  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Eliminar un email específico',
    description: `
    **Funcionalidad:** Marca un email como eliminado usando el sistema de semáforo.
    
    **Comportamiento:**
    - El email se marca con estado "deleted" en la base de datos
    - Se mantiene auditoría del estado anterior
    - Opcionalmente se elimina de Gmail API (configurable via DELETE_FROM_GMAIL)
    - Se invalida automáticamente el cache del usuario
    
    **Requisitos:**
    - Token JWT válido en Authorization header
    - El email debe pertenecer al usuario autenticado
    
    **Casos de uso:** Eliminar emails spam, promocionales o irrelevantes del dashboard.
  `,
  })
  @ApiParam({
    name: 'id',
    description:
      'ID único del email en Gmail (messageId). Ejemplo: mensaje de Temu con ID 1636a01f584c48c1',
    example: '1847a8e123456789',
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
          example: 'red',
        },
        deletedFromGmail: { type: 'boolean', example: false },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Parámetros inválidos o email ya eliminado',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'ID del email es requerido' },
        statusCode: { type: 'number', example: 400 },
        timestamp: { type: 'string', example: '2025-09-01T15:30:00Z' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Token JWT inválido o expirado',
    type: OrchestratorErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Email no encontrado en ninguna cuenta del usuario',
    type: OrchestratorErrorDto,
  })
  async deleteEmail(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') emailId: string,
  ): Promise<{
    success: boolean;
    message?: string;
    emailId: string;
    previousStatus?: string;
    deletedFromGmail?: boolean;
    error?: string;
  }> {
    const authHeader = headers?.authorization;

    if (!authHeader) {
      throw new UnauthorizedException(
        'Token JWT requerido - usa el botón Authorize',
      );
    }

    if (!emailId) {
      throw new BadRequestException('ID del email es requerido');
    }

    this.logger.log(`🗑️ Eliminando email ${emailId} via orchestrator`);

    // Llamar al método del service
    return this.emailsService.deleteEmail(emailId, authHeader);
  }
}
