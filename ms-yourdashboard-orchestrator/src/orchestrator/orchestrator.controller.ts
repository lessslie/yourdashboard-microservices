import { Controller, Get, Query, Param, ParseIntPipe, DefaultValuePipe, BadRequestException } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';

@Controller()
export class OrchestratorController {
  constructor(private orchestratorService: OrchestratorService) {}

  /**
   * 🏠 GET /
   * Health check y info del orchestrator
   */
  @Get()
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
   * 🔐 GET /auth/start
   * Iniciar proceso de autenticación
   */
  @Get('auth/start')
  async startAuth() {
    return this.orchestratorService.startAuthentication();
  }

  /**
   * 📧 GET /emails/inbox?userId=1&page=1&limit=10
   * Obtener inbox del usuario (orquesta ms-auth + ms-email)
   */
  @Get('emails/inbox')
  async getInbox(
    @Query('userId') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ) {
    if (!userId) {
      throw new BadRequestException('userId es requerido');
    }

    return this.orchestratorService.getInbox(userId, page, limit);
  }

  /**
   * 🔍 GET /emails/search?userId=1&q=term&page=1&limit=10
   * Buscar emails (orquesta ms-auth + ms-email)
   */
  @Get('emails/search')
  async searchEmails(
    @Query('userId') userId: string,
    @Query('q') searchTerm: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ) {
    if (!userId) {
      throw new BadRequestException('userId es requerido');
    }

    if (!searchTerm || searchTerm.trim() === '') {
      return {
        success: true,
        source: 'orchestrator',
        data: {
          emails: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
          searchTerm: searchTerm || ''
        }
      };
    }

    return this.orchestratorService.searchEmails(userId, searchTerm, page, limit);
  }

  /**
   * 📊 GET /emails/stats?userId=1
   * Estadísticas de emails (orquesta ms-auth + ms-email)
   */
  @Get('emails/stats')
  async getEmailStats(@Query('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId es requerido');
    }

    return this.orchestratorService.getEmailStats(userId);
  }

  /**
   * 📧 GET /emails/:id?userId=1
   * Obtener email específico (orquesta ms-auth + ms-email)
   */
  @Get('emails/:id')
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
   * 📊 GET /dashboard/summary?userId=1
   * Resumen del dashboard (orquesta múltiples llamadas)
   */
  @Get('dashboard/summary')
  async getDashboardSummary(@Query('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId es requerido');
    }

    return this.orchestratorService.getDashboardSummary(userId);
  }

  /**
   * 📊 GET /health
   * Health check detallado
   */
  @Get('health')
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