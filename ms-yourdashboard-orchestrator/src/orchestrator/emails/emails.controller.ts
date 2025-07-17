import {
  Controller,
  Get,
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
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse
} from '@nestjs/swagger';
import { EmailsOrchestratorService } from './emails.service';
import {
  OrchestratorEmailListDto,
  OrchestratorStatsDto,
  OrchestratorEmailQueryDto,
  OrchestratorSearchQueryDto,
  OrchestratorErrorDto
} from './dto';

@Controller('emails')
@ApiTags('Emails')
export class EmailsOrchestratorController {
  constructor(private readonly emailsService: EmailsOrchestratorService) {}

  /**
   * 📧 GET /emails/inbox - Obtener inbox coordinado
   */
  @Get('inbox')
  @ApiOperation({ 
    summary: 'Obtener inbox de emails',
    description: 'Coordina MS-Auth (tokens) + MS-Email (datos) para obtener la lista de emails del usuario.'
  })
  @ApiQuery({ name: 'userId', description: 'ID del usuario', example: '1' })
  @ApiQuery({ name: 'page', description: 'Número de página', example: 1, required: false })
  @ApiQuery({ name: 'limit', description: 'Emails por página (máx 50)', example: 10, required: false })
  @ApiOkResponse({ 
    description: 'Inbox obtenido exitosamente',
    type: OrchestratorEmailListDto
  })
  @ApiBadRequestResponse({ 
    description: 'userId es requerido',
    type: OrchestratorErrorDto 
  })
  @ApiUnauthorizedResponse({ 
    description: 'Error obteniendo token del usuario o token de Gmail expirado',
    type: OrchestratorErrorDto 
  })
  @ApiInternalServerErrorResponse({ 
    description: 'Error interno coordinando microservicios',
    type: OrchestratorErrorDto 
  })
  async getInbox(@Query() query: OrchestratorEmailQueryDto) {
    if (!query.userId) {
      throw new BadRequestException('userId es requerido');
    }

    return this.emailsService.getInbox(
      query.userId, 
      query.page || 1, 
      query.limit || 10
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
  @ApiQuery({ name: 'userId', description: 'ID del usuario', example: '1' })
  @ApiQuery({ name: 'q', description: 'Término de búsqueda', example: 'reunión proyecto' })
  @ApiQuery({ name: 'page', description: 'Número de página', example: 1, required: false })
  @ApiQuery({ name: 'limit', description: 'Emails por página (máx 50)', example: 10, required: false })
  @ApiOkResponse({ 
    description: 'Resultados de búsqueda obtenidos exitosamente',
    type: OrchestratorEmailListDto
  })
  @ApiBadRequestResponse({ 
    description: 'userId y q son requeridos',
    type: OrchestratorErrorDto 
  })
  @ApiUnauthorizedResponse({ 
    description: 'Error obteniendo token del usuario',
    type: OrchestratorErrorDto 
  })
  async searchEmails(@Query() query: OrchestratorSearchQueryDto) {
    if (!query.userId) {
      throw new BadRequestException('userId es requerido');
    }

    if (!query.q || query.q.trim() === '') {
      return {
        success: true,
        source: 'orchestrator',
        data: {
          emails: [],
          total: 0,
          page: query.page || 1,
          limit: query.limit || 10,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
          searchTerm: query.q || ''
        }
      };
    }

    return this.emailsService.searchEmails(
      query.userId, 
      query.q, 
      query.page || 1, 
      query.limit || 10
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
  @ApiQuery({ name: 'userId', description: 'ID del usuario', example: '1' })
  @ApiOkResponse({ 
    description: 'Estadísticas obtenidas exitosamente',
    type: OrchestratorStatsDto
  })
  @ApiBadRequestResponse({ 
    description: 'userId es requerido',
    type: OrchestratorErrorDto 
  })
  @ApiUnauthorizedResponse({ 
    description: 'Error obteniendo token del usuario',
    type: OrchestratorErrorDto 
  })
  async getEmailStats(@Query('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId es requerido');
    }

    return this.emailsService.getEmailStats(userId);
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
  @ApiQuery({ name: 'userId', description: 'ID del usuario', example: '1' })
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
    description: 'userId es requerido',
    type: OrchestratorErrorDto 
  })
  @ApiNotFoundResponse({ 
    description: 'Email no encontrado',
    type: OrchestratorErrorDto 
  })
  async getEmailById(
    @Param('id') emailId: string,
    @Query('userId') userId: string
  ) {
    if (!userId) {
      throw new BadRequestException('userId es requerido');
    }

    return this.emailsService.getEmailById(userId, emailId);
  }
}