import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  BadRequestException 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { EmailsOrchestratorService } from './emails.service';
import {
  OrchestratorEmailListDto,
  OrchestratorStatsDto,
  OrchestratorErrorDto
} from './dto';

@Controller('emails')
@ApiTags('Emails')
export class EmailsOrchestratorController {
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
      maxEmails ? parseInt(maxEmails, 10) : 100
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
      maxEmails ? parseInt(maxEmails, 10) : 30
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
   * 📧 GET /emails/:id - Email específico coordinado
   */
  @Get(':id')
  @ApiOperation({ 
    summary: 'Obtener email por ID',
    description: 'Coordina MS-Auth + MS-Email para obtener el contenido completo de un email específico.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID del email en Gmail', 
    example: '1847a8e123456789' 
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID de la cuenta Gmail específica', example: '4' })
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
            bodyHtml: { type: 'string', example: '<p>Contenido del email...</p>' }
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'cuentaGmailId es requerido',
    type: OrchestratorErrorDto 
  })
  @ApiNotFoundResponse({ 
    description: 'Email no encontrado',
    type: OrchestratorErrorDto 
  })
  async getEmailById(
    @Param('id') emailId: string,
    @Query('cuentaGmailId') cuentaGmailId: string
  ) {
    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId es requerido');
    }

    return this.emailsService.getEmailById(cuentaGmailId, emailId);
  }
}