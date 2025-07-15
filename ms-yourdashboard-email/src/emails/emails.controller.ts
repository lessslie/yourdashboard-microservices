import { 
  Controller, 
  Get, 
  Query, 
  Param, 
  ParseIntPipe, 
  DefaultValuePipe, 
  UnauthorizedException, 
  Headers 
} from '@nestjs/common';
import { EmailsService } from './emails.service';
import { 
  EmailListResponse, 
  EmailStats, 
  EmailDetail, 
  HealthResponse 
} from './interfaces/email.interfaces';

@Controller('emails')
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  /**
   * 📧 GET /emails/inbox?userId=${getCurrentUserId()}23&page=1&limit=10
   * VERSIÓN MICROSERVICIOS: Recibe token del orchestrator
   */
  @Get('inbox')
  async getInbox(
    @Headers('authorization') authHeader: string,
    @Query('userId') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ): Promise<EmailListResponse> {
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    // Extraer token del header Bearer
    const accessToken = authHeader.replace('Bearer ', '');
    
    if (!accessToken) {
      throw new UnauthorizedException('Valid Bearer token is required');
    }
    
    return this.emailsService.getInboxWithToken(accessToken, userId, page, limit);
  }

  /**
   * 🔍 GET /emails/search?userId=${getCurrentUserId()}23&q=palabra&page=1&limit=10
   * VERSIÓN MICROSERVICIOS: Recibe token del orchestrator
   */
  @Get('search')
  async searchEmails(
    @Headers('authorization') authHeader: string,
    @Query('userId') userId: string,
    @Query('q') searchTerm: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ): Promise<EmailListResponse> {
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
    
    if (!accessToken) {
      throw new UnauthorizedException('Valid Bearer token is required');
    }
    
    return this.emailsService.searchEmailsWithToken(accessToken, userId, searchTerm, page, limit);
  }

  /**
   * 📊 GET /emails/stats?userId=${getCurrentUserId()}23
   * VERSIÓN MICROSERVICIOS: Recibe token del orchestrator
   */
  @Get('stats')
  async getInboxStats(
    @Headers('authorization') authHeader: string,
    @Query('userId') userId: string
  ): Promise<EmailStats> {
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    if (!accessToken) {
      throw new UnauthorizedException('Valid Bearer token is required');
    }
    
    return this.emailsService.getInboxStatsWithToken(accessToken, userId);
  }

  /**
   * 📧 GET /emails/:id?userId=${getCurrentUserId()}23
   * VERSIÓN MICROSERVICIOS: Recibe token del orchestrator
   */
  @Get(':id')
  async getEmailById(
    @Headers('authorization') authHeader: string,
    @Query('userId') userId: string,
    @Param('id') messageId: string
  ): Promise<EmailDetail> {
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    if (!messageId) {
      throw new UnauthorizedException('Message ID is required');
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    if (!accessToken) {
      throw new UnauthorizedException('Valid Bearer token is required');
    }
    
    return this.emailsService.getEmailByIdWithToken(accessToken, userId, messageId);
  }

  /**
   * 🔧 GET /emails/health
   * Health check del microservicio
   */
  @Get('health')
  getHealth(): HealthResponse {
    return {
      service: 'ms-yourdashboard-email',
      status: 'OK',
      timestamp: new Date().toISOString(),
      port: process.env.PORT || 3002,
      mode: 'microservices'
    };
  }
}