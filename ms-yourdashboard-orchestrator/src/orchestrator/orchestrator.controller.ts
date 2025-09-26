//ms-yourdashboard-orchestrator/src/orchestrator/orchestrator.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { OrchestratorService } from './orchestrator.service';

@Controller()
@ApiTags('Health')
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  /**
   * 🏠 GET / - Información del orchestrator
   */
  @Get()
  @ApiOperation({
    summary: 'Información del servicio',
    description:
      'Obtiene información general sobre el Backend For Frontend y endpoints disponibles.',
  })
  @ApiOkResponse({
    description: 'Información del servicio obtenida exitosamente',
    schema: {
      type: 'object',
      properties: {
        service: { type: 'string', example: 'ms-yourdashboard-orchestrator' },
        status: { type: 'string', example: 'OK' },
        description: {
          type: 'string',
          example:
            'Backend For Frontend - Coordina llamadas entre microservicios',
        },
        port: { type: 'number', example: 3003 },
        modules: {
          type: 'object',
          properties: {
            emails: {
              type: 'string',
              example: 'Gestión de emails via MS-Email',
            },
            calendar: {
              type: 'string',
              example: 'Gestión de calendario (próximamente)',
            },
            whatsapp: {
              type: 'string',
              example: 'Gestión de WhatsApp (próximamente)',
            },
          },
        },
        endpoints: {
          type: 'object',
          properties: {
            emails: {
              type: 'object',
              properties: {
                inbox: {
                  type: 'string',
                  example: 'GET /emails/inbox?userId=X&page=1&limit=10',
                },
                search: {
                  type: 'string',
                  example: 'GET /emails/search?userId=X&q=term',
                },
                stats: {
                  type: 'string',
                  example: 'GET /emails/stats?userId=X',
                },
                detail: { type: 'string', example: 'GET /emails/:id?userId=X' },
              },
            },
            auth: {
              type: 'object',
              properties: {
                start: { type: 'string', example: 'GET /auth/start' },
              },
            },
          },
        },
      },
    },
  })
  getInfo() {
    return {
      service: 'ms-yourdashboard-orchestrator',
      status: 'OK',
      description:
        'Backend For Frontend - Coordina llamadas entre microservicios',
      timestamp: new Date().toISOString(),
      port: process.env.PORT || 3003,
      modules: {
        emails: 'Gestión de emails via MS-Email',
        calendar: 'Gestión de calendario (próximamente)',
        whatsapp: 'Gestión de WhatsApp (próximamente)',
      },
      endpoints: {
        emails: {
          inbox: 'GET /emails/inbox?userId=X&page=1&limit=10',
          search: 'GET /emails/search?userId=X&q=term',
          stats: 'GET /emails/stats?userId=X',
          detail: 'GET /emails/:id?userId=X',
        },
        auth: {
          start: 'GET /auth/start',
        },
      },
    };
  }

  /**
   * 📊 GET /health - Health check coordinado
   */
  @Get('health')
  @ApiOperation({
    summary: 'Estado del servicio',
    description:
      'Verifica el estado del orchestrator y la conectividad con los microservicios dependientes.',
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
        'ms-email': process.env.MS_EMAIL_URL || 'http://localhost:3002',
      },
    };
  }
}
