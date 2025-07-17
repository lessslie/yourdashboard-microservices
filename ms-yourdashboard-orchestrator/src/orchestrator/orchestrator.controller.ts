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
import { OrchestratorService } from './orchestrator.service';
import {
  OrchestratorEmailListDto,
  OrchestratorStatsDto,
  OrchestratorEmailQueryDto,
  OrchestratorSearchQueryDto,
  OrchestratorErrorDto
} from './dto';

@Controller()
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  /**
   * 🏠 GET / - Información del orchestrator
   */
  @Get()
  @ApiTags('Health')
  @ApiOperation({ 
    summary: 'Información del servicio',
    description: 'Obtiene información general sobre el Backend For Frontend y endpoints disponibles.'
  })
  @ApiOkResponse({ 
    description: 'Información del servicio obtenida exitosamente',
    schema: {
      type: 'object',
      properties: {
        service: { type: 'string', example: 'ms-yourdashboard-orchestrator' },
        status: { type: 'string', example: 'OK' },
        description: { type: 'string', example: 'Backend For Frontend - Coordina llamadas entre microservicios' },
        port: { type: 'number', example: 3003 },
        endpoints: {
          type: 'object',
          properties: {
            auth: { type: 'string', example: 'GET /auth/start' },
            emails: {
              type: 'object',
              properties: {
                inbox: { type: 'string', example: 'GET /emails/inbox?userId=X&page=1&limit=10' },
                search: { type: 'string', example: 'GET /emails/search?userId=X&q=term' },
                stats: { type: 'string', example: 'GET /emails/stats?userId=X' },
                detail: { type: 'string', example: 'GET /emails/:id?userId=X' }
              }
            },
            dashboard: { type: 'string', example: 'GET /dashboard/summary?userId=X' }
          }
        }
      }
    }
  })
  getInfo() {
    return {
  service: 'ms-yourdashboard-orchestrator',
  status: 'OK',
  description: 'Backend For Frontend - Coordina llamadas entre microservicios',
  timestamp: new Date().toISOString(),
  port: process.env.PORT || 3003,
  endpoints: {
    auth: 'GET /auth/start',
    emails: {
      inbox: 'GET /emails/inbox?userId=X&page=1&limit=10',
      search: 'GET /emails/search?userId=X&q=term',
      stats: 'GET /emails/stats?userId=X',
      detail: 'GET /emails/:id?userId=X'
    },
    dashboard: 'GET /dashboard/summary?userId=X'
  }
};
  }

  /**
   * 🔐 GET /auth/start - Iniciar autenticación
   */
  @Get('auth/start')
  @ApiTags('Authentication')
  @ApiOperation({ 
    summary: 'Iniciar proceso de autenticación',
    description: 'Obtiene la URL para redirigir al usuario a Google OAuth via MS-Auth.'
  })
  @ApiOkResponse({ 
    description: 'URL de autenticación obtenida exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Redirigir al ms-auth para autenticación' },
        authUrl: { type: 'string', example: 'http://localhost:3001/auth/google' },
        instructions: { type: 'string', example: 'El frontend debe redirigir al usuario a esta URL' }
      }
    }
  })
  startAuth() {
    return this.orchestratorService.startAuthentication();
  }

  /**
   * 📧 GET /emails/inbox - Obtener inbox coordinado
   */
  @Get('emails/inbox')
  @ApiTags('Emails')
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

    return this.orchestratorService.getInbox(
      query.userId,
      query.page || 1,
      query.limit || 10
    );
  }

  /**
   * 🔍 GET /emails/search - Buscar emails coordinado
   */
  @Get('emails/search')
  @ApiTags('Emails')
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

    return this.orchestratorService.searchEmails(
      query.userId, 
      query.q, 
      query.page || 1, 
      query.limit || 10
    );
  }

  /**
   * 📊 GET /emails/stats - Estadísticas coordinadas
   */
  @Get('emails/stats')
  @ApiTags('Emails')
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

    return this.orchestratorService.getEmailStats(userId);
  }

  /**
   * 📧 GET /emails/:id - Email específico coordinado
   */
  @Get('emails/:id')
  @ApiTags('Emails')
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

    return this.orchestratorService.getEmailById(userId, emailId);
  }

  /**
   * 📊 GET /dashboard/summary - Resumen coordinado
   */
  @Get('dashboard/summary')
  @ApiTags('Dashboard')
  @ApiOperation({ 
    summary: 'Resumen del dashboard',
    description: 'Coordina múltiples llamadas para obtener un resumen completo: estadísticas + emails recientes.'
  })
  @ApiQuery({ name: 'userId', description: 'ID del usuario', example: '1' })
  @ApiOkResponse({ 
    description: 'Resumen obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        source: { type: 'string', example: 'orchestrator' },
        data: {
          type: 'object',
          properties: {
            stats: {
              type: 'object',
              properties: {
                totalEmails: { type: 'number', example: 247 },
                unreadEmails: { type: 'number', example: 23 },
                readEmails: { type: 'number', example: 224 }
              }
            },
            recentEmails: {
              type: 'array',
              items: { type: 'object' }
            },
            lastUpdated: { type: 'string', example: '2024-01-15T10:30:00Z' }
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'userId es requerido',
    type: OrchestratorErrorDto 
  })
  async getDashboardSummary(@Query('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId es requerido');
    }

    return this.orchestratorService.getDashboardSummary(userId);
  }

  /**
   * 📊 GET /health - Health check coordinado
   */
  @Get('health')
  @ApiTags('Health')
  @ApiOperation({ 
    summary: 'Estado del servicio',
    description: 'Verifica el estado del orchestrator y la conectividad con los microservicios dependientes.'
  })
  @ApiOkResponse({ 
    description: 'Servicio funcionando correctamente',
    schema: {
      type: 'object',
      properties: {
        service: { type: 'string', example: 'ms-yourdashboard-orchestrator' },
        status: { type: 'string', example: 'OK' },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00Z' },
        uptime: { type: 'number', example: 3600.5 },
        memory: {
          type: 'object',
          properties: {
            rss: { type: 'number' },
            heapTotal: { type: 'number' },
            heapUsed: { type: 'number' },
            external: { type: 'number' }
          }
        },
        dependencies: {
          type: 'object',
          properties: {
            'ms-auth': { type: 'string', example: 'http://localhost:3001' },
            'ms-email': { type: 'string', example: 'http://localhost:3002' }
          }
        }
      }
    }
  })
  getHealth() {
    return {
      service: 'ms-yourdashboard-orchestrator',
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      dependencies: {
        'ms-auth': process.env.MS_AUTH_URL || 'http://localhost:3001',
        'ms-email': process.env.MS_EMAIL_URL || 'http://localhost:3002'
      }
    };
  }
}