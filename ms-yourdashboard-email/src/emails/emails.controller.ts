import { 
  Controller, 
  Get, 
  Query, 
  Param, 
  Headers,
  UnauthorizedException 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse
} from '@nestjs/swagger';
import { EmailsService } from './emails.service';
import { 
  EmailListResponseDto,
  EmailStatsDto,
  EmailDetailDto,
  EmailInboxQueryDto,
  EmailSearchQueryDto,
  EmailStatsQueryDto,
  EmailDetailQueryDto,
  EmailErrorResponseDto,
  EmailHealthResponseDto
} from './dto';

@ApiTags('Emails')
@Controller('emails')
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}


  /**
   * 📊 GET /emails/stats - Estadísticas de emails
   */
  @Get('stats')
  @ApiBearerAuth('Gmail-Token')
  @ApiOperation({ 
    summary: 'Obtener estadísticas de emails',
    description: 'Obtiene contadores de emails totales, leídos y no leídos.'
  })
  @ApiQuery({ name: 'userId', description: 'ID del usuario', example: '1' })
  @ApiOkResponse({ 
    description: 'Estadísticas obtenidas exitosamente',
    type: EmailStatsDto 
  })
  @ApiUnauthorizedResponse({ 
    description: 'Token de Gmail inválido o expirado',
    type: EmailErrorResponseDto 
  })
  async getEmailStats(
    @Headers('authorization') authHeader: string,
    @Query() query: EmailStatsQueryDto
  ): Promise<EmailStatsDto> {
    if (!query.userId) {
      throw new UnauthorizedException('User ID is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    if (!accessToken) {
      throw new UnauthorizedException('Valid Bearer token is required');
    }
    
    return this.emailsService.getInboxStatsWithToken(accessToken, query.userId);
  }
/**
   *  GET /emails/inbox - Lista de emails con paginación
   */
  @Get('inbox')
  @ApiBearerAuth('Gmail-Token')
  @ApiOperation({ 
    summary: 'Obtener inbox de emails',
    description: 'Lista emails del inbox con paginación. Requiere token de Gmail válido proporcionado por MS-Orchestrator.'
  })
  @ApiQuery({ name: 'userId', description: 'ID del usuario', example: '1' })
  @ApiQuery({ name: 'page', description: 'Número de página', example: 1, required: false })
  @ApiQuery({ name: 'limit', description: 'Emails por página (máx 50)', example: 10, required: false })
  @ApiOkResponse({ 
    description: 'Lista de emails obtenida exitosamente',
    type: EmailListResponseDto 
  })
  @ApiUnauthorizedResponse({ 
    description: 'Token de Gmail inválido o expirado',
    type: EmailErrorResponseDto 
  })
  @ApiBadRequestResponse({ 
    description: 'Parámetros inválidos (userId requerido)',
    type: EmailErrorResponseDto 
  })
  async getInbox(
    @Headers('authorization') authHeader: string,
    @Query() query: EmailInboxQueryDto
  ): Promise<EmailListResponseDto> {
    if (!query.userId) {
      throw new UnauthorizedException('User ID is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    if (!accessToken) {
      throw new UnauthorizedException('Valid Bearer token is required');
    }
    
    //  OBTENER DATOS DEL SERVICIO
    const result = await this.emailsService.getInboxWithToken(
      accessToken, 
      query.userId, 
      query.page || 1, 
      query.limit || 10
    );

    //  CONVERTIR Date → string PARA LOS DTOs
    return {
      ...result,
      emails: result.emails.map(email => ({
        ...email,
        receivedDate: email.receivedDate.toISOString() // Date → string
      }))
    };
  }

  /**
   *  GET /emails/search - Buscar emails
   */
  @Get('search')
  @ApiBearerAuth('Gmail-Token')
  @ApiOperation({ 
    summary: 'Buscar emails',
    description: 'Busca emails por término específico con paginación. Requiere token de Gmail válido.'
  })
  @ApiQuery({ name: 'userId', description: 'ID del usuario', example: '1' })
  @ApiQuery({ name: 'q', description: 'Término de búsqueda', example: 'reunión proyecto' })
  @ApiQuery({ name: 'page', description: 'Número de página', example: 1, required: false })
  @ApiQuery({ name: 'limit', description: 'Emails por página (máx 50)', example: 10, required: false })
  @ApiOkResponse({ 
    description: 'Resultados de búsqueda obtenidos exitosamente',
    type: EmailListResponseDto 
  })
  @ApiUnauthorizedResponse({ 
    description: 'Token de Gmail inválido o expirado',
    type: EmailErrorResponseDto 
  })
  @ApiBadRequestResponse({ 
    description: 'Parámetros inválidos (userId y q requeridos)',
    type: EmailErrorResponseDto 
  })
  async searchEmails(
    @Headers('authorization') authHeader: string,
    @Query() query: EmailSearchQueryDto
  ): Promise<EmailListResponseDto> {
    if (!query.userId) {
      throw new UnauthorizedException('User ID is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    if (!query.q || query.q.trim() === '') {
      return {
        emails: [],
        total: 0,
        page: query.page || 1,
        limit: query.limit || 10,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        searchTerm: query.q || ''
      };
    }

    const accessToken = authHeader.replace('Bearer ', '');
    
    if (!accessToken) {
      throw new UnauthorizedException('Valid Bearer token is required');
    }
    
    // OBTENER DATOS DEL SERVICIO
    const result = await this.emailsService.searchEmailsWithToken(
      accessToken, 
      query.userId, 
      query.q, 
      query.page || 1, 
      query.limit || 10
    );

    // CONVERTIR Date → string PARA LOS DTOs
    return {
      ...result,
      emails: result.emails.map(email => ({
        ...email,
        receivedDate: email.receivedDate.toISOString() // Date → string
      }))
    };
  }

  /**
   * 📧 GET /emails/:id - Obtener email específico
   */
  @Get(':id')
  @ApiBearerAuth('Gmail-Token')
  @ApiOperation({ 
    summary: 'Obtener email por ID',
    description: 'Obtiene el contenido completo de un email específico por su ID.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID del email en Gmail', 
    example: '1847a8e123456789' 
  })
  @ApiQuery({ name: 'userId', description: 'ID del usuario', example: '1' })
  @ApiOkResponse({ 
    description: 'Email obtenido exitosamente',
    type: EmailDetailDto 
  })
  @ApiUnauthorizedResponse({ 
    description: 'Token de Gmail inválido o expirado',
    type: EmailErrorResponseDto 
  })
  @ApiNotFoundResponse({ 
    description: 'Email no encontrado',
    type: EmailErrorResponseDto 
  })
  async getEmailById(
    @Headers('authorization') authHeader: string,
    @Param('id') emailId: string,
    @Query() query: EmailDetailQueryDto
  ): Promise<EmailDetailDto> {
    if (!query.userId) {
      throw new UnauthorizedException('User ID is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    if (!emailId) {
      throw new UnauthorizedException('Message ID is required');
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    if (!accessToken) {
      throw new UnauthorizedException('Valid Bearer token is required');
    }
    
    //  OBTENER DATOS DEL SERVICIO
    const result = await this.emailsService.getEmailByIdWithToken(accessToken, query.userId, emailId);

    //  CONVERTIR Date → string PARA EL DTO
    return {
      ...result,
      receivedDate: result.receivedDate.toISOString() // Date → string
    };
  }

  /**
   * 🔧 GET /emails/health - Health check
   */
  @Get('health')
  @ApiTags('Health')
  @ApiOperation({ 
    summary: 'Estado del servicio',
    description: 'Verifica que el microservicio de emails esté funcionando correctamente.'
  })
  @ApiOkResponse({ 
    description: 'Servicio funcionando correctamente',
    type: EmailHealthResponseDto 
  })
  getHealth(): EmailHealthResponseDto {
    return {
      service: 'ms-yourdashboard-email',
      status: 'OK',
      timestamp: new Date().toISOString(),
      port: process.env.PORT || 3002,
      mode: 'microservices'
    };
  }
}