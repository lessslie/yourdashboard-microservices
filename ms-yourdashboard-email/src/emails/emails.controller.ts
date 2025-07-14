import { Controller, Get, Query, Param, ParseIntPipe, DefaultValuePipe, UnauthorizedException, Headers } from '@nestjs/common';
import { EmailsService } from './emails.service';

@Controller('emails')
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  /**
   * 📧 GET /emails/inbox?userId=123&page=1&limit=10
   * VERSIÓN MICROSERVICIOS: Recibe token del orchestrator
   */
  @Get('inbox')
  async getInbox(
    @Headers('authorization') authHeader: string,
    @Query('userId') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ) {
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    // Extraer token del header Bearer
    const accessToken = authHeader.replace('Bearer ', '');
    
    return this.emailsService.getInboxWithToken(accessToken, userId, page, limit);
  }

  /**
   * 🔍 GET /emails/search?userId=123&q=palabra&page=1&limit=10
   * VERSIÓN MICROSERVICIOS: Recibe token del orchestrator
   */
  @Get('search')
  async searchEmails(
    @Headers('authorization') authHeader: string,
    @Query('userId') userId: string,
    @Query('q') searchTerm: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ) {
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    if (!searchTerm || searchTerm.trim() === '') {
      return {
        emails: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        searchTerm: searchTerm || ''
      };
    }

    const accessToken = authHeader.replace('Bearer ', '');
    
    return this.emailsService.searchEmailsWithToken(accessToken, userId, searchTerm, page, limit);
  }

  /**
   * 📊 GET /emails/stats?userId=123
   * VERSIÓN MICROSERVICIOS: Recibe token del orchestrator
   */
  @Get('stats')
  async getInboxStats(
    @Headers('authorization') authHeader: string,
    @Query('userId') userId: string
  ) {
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    return this.emailsService.getInboxStatsWithToken(accessToken, userId);
  }

  /**
   * 📧 GET /emails/:id?userId=123
   * VERSIÓN MICROSERVICIOS: Recibe token del orchestrator
   */
  @Get(':id')
  async getEmailById(
    @Headers('authorization') authHeader: string,
    @Query('userId') userId: string,
    @Param('id') messageId: string
  ) {
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    return this.emailsService.getEmailByIdWithToken(accessToken, userId, messageId);
  }

  /**
   * 🔧 GET /emails/health
   * Health check del microservicio
   */
  @Get('health')
  getHealth() {
    return {
      service: 'ms-yourdashboard-email',
      status: 'OK',
      timestamp: new Date().toISOString(),
      port: process.env.PORT || 3002,
      mode: 'microservices'
    };
  }
}