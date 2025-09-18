// ms-yourdashboard-email/src/emails/emails.controller.ts
// ✅ MIGRADO A UUID - Todos los parámetros cuentaGmailId y userId cambiados a string

import { 
  Controller, 
  Get, 
  Post,
  Query, 
  Param, 
  Headers,
  UnauthorizedException, 
  BadRequestException,
  Logger,
  Body,
  NotFoundException,
  Delete,
  ServiceUnavailableException
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
  ApiBody,
  ApiForbiddenResponse,
  ApiServiceUnavailableResponse
} from '@nestjs/swagger';
import { EmailsService } from './emails.service';
import { 
  EmailListResponseDto,
  EmailStatsDto,
  EmailDetailDto,
  EmailInboxQueryDto,
  EmailErrorResponseDto,
  EmailHealthResponseDto
} from './dto';
import { ConfigService } from '@nestjs/config';
import { 
  TrafficLightStatus, 
  TrafficLightDashboardResponse,
  EmailsByTrafficLightResponse,
  UpdateTrafficLightsResponse,
  
} from './interfaces/traffic-light.interfaces';
import { SendEmailResponse } from './interfaces/email.interfaces-send';
import { SendEmailDto } from './dto/send-email.dto';
import { SaveFullContentResponse } from './interfaces/save-full-content.interfaces';

@ApiTags('Emails')
@Controller('emails')
export class EmailsController {
  private readonly logger = new Logger(EmailsController.name);
  constructor(
    private readonly emailsService: EmailsService,
    private readonly configService: ConfigService
  ) {}

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
  getHealth() : EmailHealthResponseDto {
    return {
      service: 'ms-yourdashboard-email',
      status: 'OK',
      timestamp: new Date().toISOString(),
      port: process.env.PORT || 3002,
      mode: 'microservices'
    };
  }

  // ================================
  // 🔄 ENDPOINTS DE SINCRONIZACIÓN
  // ================================

  /**
   * 🔄 POST /emails/sync - Sincronización manual
   * ✅ MIGRADO: cuentaGmailId ahora recibe UUID string
   */
  @Post('sync')
  @ApiOperation({ 
    summary: 'Sincronizar emails manualmente',
    description: 'Ejecuta sincronización manual de emails desde Gmail para una cuenta específica.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID UUID de la cuenta Gmail específica', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @ApiQuery({ name: 'maxEmails', description: 'Máximo emails a sincronizar', example: 100, required: false })
  @ApiOkResponse({ 
    description: 'Sincronización completada exitosamente'
  })
  @ApiUnauthorizedResponse({ 
    description: 'Token de Gmail inválido o expirado',
    type: EmailErrorResponseDto 
  })
  async syncEmails(
    @Headers() headers: Record<string, string | undefined>,
    @Query('cuentaGmailId') cuentaGmailId: string, // ✅ YA ES STRING - PERFECTO
    @Query('maxEmails') maxEmails?: string,
    @Query('fullsync') fullsync?: string
  ) {
    const authHeader = headers?.authorization;
    if (!cuentaGmailId) {
      throw new UnauthorizedException('cuentaGmailId is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    if (!accessToken) {
      throw new UnauthorizedException('Valid Bearer token is required');
    }

    const maxEmailsNum = maxEmails ? parseInt(maxEmails, 10) : 100;
    
    return this.emailsService.syncEmailsWithToken(accessToken, cuentaGmailId, {
      maxEmails: maxEmailsNum,
      fullSync: fullsync === 'true'
    });
  }

  /**
   * 🔄 POST /emails/sync/incremental - Sincronización incremental
   * ✅ MIGRADO: cuentaGmailId ahora recibe UUID string
   */
  @Post('sync/incremental')
  @ApiOperation({ 
    summary: 'Sincronización incremental de emails',
    description: 'Sincroniza solo emails nuevos desde la última sincronización.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID UUID de la cuenta Gmail específica', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @ApiQuery({ name: 'maxEmails', description: 'Máximo emails nuevos', example: 30, required: false })
  @ApiOkResponse({ 
    description: 'Sincronización incremental completada'
  })
  async syncIncremental(
    @Headers() headers: Record<string, string | undefined>,
    @Query('cuentaGmailId') cuentaGmailId: string, // ✅ YA ES STRING - PERFECTO
    @Query('maxEmails') maxEmails?: string
  ) {
    const authHeader = headers?.authorization;
    if (!cuentaGmailId) {
      throw new UnauthorizedException('cuentaGmailId is required');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    if (!accessToken) {
      throw new UnauthorizedException('Valid Bearer token is required');
    }

    const maxEmailsNum = maxEmails ? parseInt(maxEmails, 10) : 30;
    
    return this.emailsService.syncEmailsWithToken(accessToken, cuentaGmailId, {
      maxEmails: maxEmailsNum,
      fullSync: false
    });
  }

  // ================================
  // 📧 ENDPOINTS PRINCIPALES
  // ================================

  /**
   * 📊 GET /emails/stats - Estadísticas de emails
   * ✅ MIGRADO: cuentaGmailId ahora recibe UUID string
   */
  @Get('stats')
  @ApiOperation({ 
    summary: 'Obtener estadísticas de emails',
    description: 'Obtiene contadores de emails totales, leídos y no leídos de una cuenta Gmail específica.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID UUID de la cuenta Gmail específica', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @ApiOkResponse({ 
    description: 'Estadísticas obtenidas exitosamente',
    type: EmailStatsDto 
  })
  @ApiUnauthorizedResponse({ 
    description: 'Token inválido o expirado',
    type: EmailErrorResponseDto 
  })
  async getEmailStats(
    @Headers() headers: Record<string, string | undefined>,
    @Query('cuentaGmailId') cuentaGmailId: string // ✅ YA ES STRING - PERFECTO
  ) {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido en Authorization header');
    }
    
    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId es requerido');
    }

    this.logger.log(`📊 Obteniendo estadísticas para cuenta Gmail: ${cuentaGmailId}`);
    
    return this.emailsService.getStatsWithJWT(authHeader, cuentaGmailId);
  }
  /**
   * 📥 GET /emails/inbox - Listar emails del inbox
   * ✅ MIGRADO: cuentaGmailId ahora recibe UUID string
   */
  @Get('inbox')
  @ApiOperation({ 
    summary: 'Obtener lista de emails del inbox',
    description: 'Lista paginada de emails del inbox desde Gmail API con filtros opcionales.'
  })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID UUID de la cuenta Gmail específica', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @ApiQuery({ name: 'page', description: 'Número de página', example: 1, required: false })
  @ApiQuery({ name: 'limit', description: 'Emails por página', example: 20, required: false })
  @ApiQuery({ name: 'q', description: 'Término de búsqueda', required: false })
  @ApiQuery({ name: 'label', description: 'Etiqueta de Gmail (INBOX, SENT, etc.)', required: false })
  @ApiOkResponse({ 
    description: 'Lista de emails obtenida exitosamente',
    type: EmailListResponseDto 
  })
  @ApiUnauthorizedResponse({ 
    description: 'Token inválido o expirado',
    type: EmailErrorResponseDto 
  })
  async getInboxEmails(
    @Headers() headers: Record<string, string | undefined>,
    @Query() queryParams: EmailInboxQueryDto,
    @Query('cuentaGmailId') cuentaGmailId: string // ✅ YA ES STRING - PERFECTO
  ) {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido en Authorization header');
    }
    
    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId es requerido');
    }

    this.logger.log(`📥 Listando inbox para cuenta Gmail: ${cuentaGmailId}, página: ${queryParams.page || 1}`);
    
    return this.emailsService.listEmailsWithJWT(authHeader, cuentaGmailId, queryParams);
  }

  /**
   * 🔍 GET /emails/search - Búsqueda global de emails
   * ✅ MIGRADO: Preparado para manejar múltiples cuentas UUID
   */
  @Get('search')
  @ApiOperation({ 
    summary: 'Búsqueda global de emails',
    description: 'Busca emails en todas las cuentas Gmail del usuario o en una cuenta específica.'
  })
  @ApiQuery({ name: 'q', description: 'Término de búsqueda', example: 'important meeting' })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID UUID de cuenta específica (opcional)', required: false, example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @ApiQuery({ name: 'page', description: 'Número de página', example: 1, required: false })
  @ApiQuery({ name: 'limit', description: 'Resultados por página', example: 20, required: false })
  @ApiQuery({ name: 'includeRead', description: 'Incluir emails leídos', required: false })
  @ApiOkResponse({ 
    description: 'Resultados de búsqueda obtenidos exitosamente',
    type: EmailListResponseDto
  })
  @ApiUnauthorizedResponse({ 
    description: 'Token inválido o expirado',
    type: EmailErrorResponseDto 
  })
  async searchEmails(
    @Headers() headers: Record<string, string | undefined>,
    @Query('q') searchTerm: string,
    @Query('cuentaGmailId') cuentaGmailId?: string, // ✅ YA ES STRING - PERFECTO 
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('includeRead') includeRead?: string
  ) {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido en Authorization header');
    }
    
    if (!searchTerm?.trim()) {
      throw new BadRequestException('Término de búsqueda (q) es requerido');
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const includeReadBool = includeRead === 'true';

    this.logger.log(`🔍 Búsqueda global: "${searchTerm}" ${cuentaGmailId ? `en cuenta ${cuentaGmailId}` : 'en todas las cuentas'}`);
    
    return this.emailsService.globalSearchWithJWT(authHeader, {
      searchTerm,
      cuentaGmailId, // Puede ser undefined o UUID string
      page: pageNum,
      limit: limitNum,
      includeRead: includeReadBool
    });
  }

  /**
   * 📧 GET /emails/:id - Obtener email específico
   */
  @Get(':id')
  @ApiOperation({ 
    summary: 'Obtener email por ID',
    description: 'Obtiene el contenido completo de un email específico por su ID desde Gmail API.'
  })
  @ApiParam({ name: 'id', description: 'gmail_message_id del email', example: '1847a8e123456789' })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID UUID de la cuenta Gmail específica', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @ApiOkResponse({ 
    description: 'Email obtenido exitosamente',
    type: EmailDetailDto 
  })
  @ApiNotFoundResponse({ 
    description: 'Email no encontrado',
    type: EmailErrorResponseDto 
  })
  @ApiUnauthorizedException({ 
    description: 'Token inválido o expirado',
    type: EmailErrorResponseDto 
  })
  async getEmailDetail(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') gmailMessageId: string,
    @Query('cuentaGmailId') cuentaGmailId: string // ✅ YA ES STRING - PERFECTO
  ) {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido en Authorization header');
    }

    if (!gmailMessageId?.trim()) {
      throw new BadRequestException('gmail_message_id es requerido');
    }

    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId es requerido');
    }

    this.logger.log(`📧 Obteniendo detalle del email: ${gmailMessageId} de cuenta: ${cuentaGmailId}`);
    
    return this.emailsService.getEmailDetailWithJWT(authHeader, gmailMessageId, cuentaGmailId);
  }

  // ================================
  // 🚦 ENDPOINTS DE SEMÁFORO
  // ================================

  /**
   * 🚦 GET /emails/traffic-light/dashboard - Dashboard del semáforo
   * ✅ MIGRADO: Preparado para manejar cuentas UUID
   */
  @Get('traffic-light/dashboard')
  @ApiOperation({ 
    summary: 'Dashboard del semáforo de emails',
    description: 'Obtiene estadísticas del semáforo para todas las cuentas Gmail del usuario autenticado.'
  })
  @ApiOkResponse({ 
    description: 'Dashboard obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        dashboard: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              cuenta_id: { type: 'string', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
              email_gmail: { type: 'string', example: 'agata.backend@gmail.com' },
              nombre_cuenta: { type: 'string', example: 'Cuenta Principal' },
              total_sin_responder: { type: 'number', example: 15 },
              estadisticas: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    traffic_light_status: { type: 'string', enum: ['red', 'orange', 'yellow', 'green'] },
                    count: { type: 'string', example: '5' },
                    avg_days: { type: 'string', example: '3.2', nullable: true }
                  }
                }
              }
            }
          }
        },
        ultima_actualizacion: { type: 'string', example: '2024-01-15T10:30:00Z' }
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: 'Token JWT inválido o expirado',
    type: EmailErrorResponseDto 
  })
  async getTrafficLightDashboard(
    @Headers() headers: Record<string, string | undefined>
  ): Promise<TrafficLightDashboardResponse> {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido en Authorization header');
    }

    this.logger.log('🚦 Obteniendo dashboard del semáforo');
    
    return this.emailsService.getTrafficLightDashboardWithJWT(authHeader);
  }/**
   * 🚦 GET /emails/traffic-light/:status - Obtener emails por color del semáforo
   * ✅ MIGRADO: cuentaGmailId ahora recibe UUID string
   */
  @Get('traffic-light/:status')
  @ApiOperation({ 
    summary: 'Obtener emails por color del semáforo',
    description: 'Lista emails filtrados por estado del semáforo (red, orange, yellow, green).'
  })
  @ApiParam({ name: 'status', enum: TrafficLightStatus, description: 'Color del semáforo', example: 'red' })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID UUID de cuenta específica (opcional)', required: false, example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @ApiQuery({ name: 'limit', description: 'Máximo emails a retornar', example: 50, required: false })
  @ApiOkResponse({ 
    description: 'Emails obtenidos exitosamente',
    type: EmailsByTrafficLightResponse 
  })
  async getEmailsByTrafficLight(
    @Headers() headers: Record<string, string | undefined>,
    @Param('status') status: TrafficLightStatus,
    @Query('cuentaGmailId') cuentaGmailId?: string, // ✅ YA ES STRING - PERFECTO
    @Query('limit') limit?: string
  ): Promise<EmailsByTrafficLightResponse> {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido en Authorization header');
    }

    if (!Object.values(TrafficLightStatus).includes(status)) {
      throw new BadRequestException(`Status inválido. Debe ser uno de: ${Object.values(TrafficLightStatus).join(', ')}`);
    }

    const limitNum = limit ? parseInt(limit, 10) : 100;

    this.logger.log(`🚦 Obteniendo emails con semáforo ${status} ${cuentaGmailId ? `de cuenta ${cuentaGmailId}` : 'de todas las cuentas'}`);
    
    return this.emailsService.getEmailsByTrafficLightWithJWT(authHeader, status, cuentaGmailId, limitNum);
  }

  /**
   * 🔄 PUT /emails/traffic-light/update - Actualizar semáforos manualmente
   * ✅ MIGRADO: Preparado para manejar UUID en requests
   */
  @Put('traffic-light/update')
  @ApiOperation({ 
    summary: 'Actualizar colores del semáforo',
    description: 'Recalcula y actualiza los colores del semáforo para emails sin responder.'
  })
  @ApiOkResponse({ 
    description: 'Semáforos actualizados exitosamente',
    type: UpdateTrafficLightsResponse 
  })
  async updateTrafficLights(
    @Headers() headers: Record<string, string | undefined>
  ): Promise<UpdateTrafficLightsResponse> {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido en Authorization header');
    }

    this.logger.log('🔄 Actualizando semáforos de emails');
    
    return this.emailsService.updateTrafficLightsWithJWT(authHeader);
  }

  // ================================
  // 📤 ENDPOINTS DE ENVÍO
  // ================================

  /**
   * 📤 POST /emails/send - Enviar email nuevo
   * ✅ MIGRADO: SendEmailDto ya maneja UUID correctamente
   */
  @Post('send')
  @ApiOperation({ 
    summary: 'Enviar email nuevo',
    description: 'Crea y envía un email completamente nuevo (no respuesta) usando Gmail API.'
  })
  @ApiBody({ description: 'Datos del email a enviar', type: SendEmailDto })
  @ApiOkResponse({ 
    description: 'Email enviado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        messageId: { type: 'string', example: '1847a8e123456789' },
        threadId: { type: 'string', example: '1847a8e123456789' },
        sentAt: { type: 'string', example: '2024-01-15T10:30:00Z' },
        fromEmail: { type: 'string', example: 'agata.backend@gmail.com' },
        toEmails: { type: 'array', items: { type: 'string' }, example: ['cliente@empresa.com'] },
        subject: { type: 'string', example: 'Propuesta comercial' },
        priority: { type: 'string', enum: ['low', 'normal', 'high'], example: 'normal' },
        hasAttachments: { type: 'boolean', example: false }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Token JWT inválido', type: EmailErrorResponseDto })
  @ApiBadRequestResponse({ description: 'Datos inválidos', type: EmailErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Cuenta no autorizada', type: EmailErrorResponseDto })
  @ApiServiceUnavailableResponse({ description: 'Límite de quota excedido', type: EmailErrorResponseDto })
  async sendEmail(
    @Headers() headers: Record<string, string | undefined>,
    @Body() sendEmailData: SendEmailDto
  ): Promise<SendEmailResponse> {
    const authHeader = headers?.authorization;
    
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido en Authorization header');
    }

    if (!sendEmailData.from?.trim()) {
      throw new BadRequestException('Email remitente (from) es requerido');
    }

    if (!sendEmailData.to?.length) {
      throw new BadRequestException('Al menos un destinatario (to) es requerido');
    }

    if (!sendEmailData.subject?.trim()) {
      throw new BadRequestException('Asunto (subject) es requerido');
    }

    if (!sendEmailData.body?.trim()) {
      throw new BadRequestException('Contenido del email (body) es requerido');
    }

    this.logger.log(`📤 Enviando email desde ${sendEmailData.from} a ${sendEmailData.to.length} destinatarios`);
    
    return this.emailsService.sendEmailWithJWT(authHeader, sendEmailData);
  }

  // ================================
  // 💾 ENDPOINTS DE CONTENIDO OFFLINE
  // ================================

  /**
   * 💾 POST /emails/:id/save-full-content - Guardar contenido completo offline
   */
  @Post(':id/save-full-content')
  @ApiOperation({ 
    summary: 'Guardar contenido completo de email offline',
    description: 'Descarga y guarda el contenido completo de un email para acceso offline rápido.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'gmail_message_id del email', 
    example: '1847a8e123456789' 
  })
  @ApiOkResponse({ 
    description: 'Contenido guardado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Contenido guardado exitosamente' },
        gmailMessageId: { type: 'string', example: '1847a8e123456789' }
      }
    }
  })
  async saveFullEmailContent(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') gmailMessageId: string
  ): Promise<SaveFullContentResponse> {
    
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido en Authorization header');
    }

    if (!gmailMessageId?.trim()) {
      throw new BadRequestException('gmail_message_id es requerido');
    }

    this.logger.log(`💾 Guardando contenido completo del email: ${gmailMessageId}`);
    
    return this.emailsService.saveFullEmailContentWithJWT(authHeader, gmailMessageId);
  }

  // ================================
  // 🗑️ ENDPOINTS DE ELIMINACIÓN
  // ================================

  /**
   * 🗑️ DELETE /emails/:id - Eliminar email
   */
  @Delete(':id')
  @ApiOperation({ 
    summary: 'Eliminar email',
    description: 'Elimina un email específico (marca como eliminado en el semáforo).'
  })
  @ApiParam({ name: 'id', description: 'gmail_message_id del email', example: '1847a8e123456789' })
  @ApiQuery({ name: 'cuentaGmailId', description: 'ID UUID de la cuenta Gmail específica', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @ApiOkResponse({ 
    description: 'Email eliminado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Email eliminado exitosamente' },
        emailId: { type: 'string', example: '1847a8e123456789' },
        previousStatus: { type: 'string', enum: ['red', 'orange', 'yellow', 'green'], example: 'red' }
      }
    }
  })
  async deleteEmail(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') gmailMessageId: string,
    @Query('cuentaGmailId') cuentaGmailId: string // ✅ YA ES STRING - PERFECTO
  ) {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido en Authorization header');
    }

    if (!gmailMessageId?.trim()) {
      throw new BadRequestException('gmail_message_id es requerido');
    }

    if (!cuentaGmailId) {
      throw new BadRequestException('cuentaGmailId es requerido');
    }

    this.logger.log(`🗑️ Eliminando email: ${gmailMessageId} de cuenta: ${cuentaGmailId}`);
    
    return this.emailsService.deleteEmailWithJWT(authHeader, gmailMessageId, cuentaGmailId);
  }

  // ================================
  // 🛡️ MÉTODOS PRIVADOS DE VALIDACIÓN
  // ================================

  /**
   * Maneja errores de envío de email de forma consistente
   */
  private handleSendEmailError(error: any) {
    const errorMessage = error?.message || error?.toString() || '';
    
    if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
      return {
        success: false,
        error: 'QUOTA_EXCEEDED',
        message: 'Límite diario de envío excedido. Podés enviar más emails mañana a las 00:00',
        retryAfter: 86400
      };
    }

    if (errorMessage.includes('Rate limit')) {
      return {
        success: false,
        error: 'RATE_LIMIT',
        message: 'Demasiadas solicitudes. Inténtalo más tarde.',
        retryAfter: 3600
      };
    }

    if (errorMessage.includes('Invalid recipients')) {
      return {
        success: false,
        error: 'INVALID_RECIPIENTS',
        message: 'Uno o más destinatarios tienen emails inválidos',
        field: 'to'
      };
    }

    if (errorMessage.includes('permission') || errorMessage.includes('access')) {
      return {
        success: false,
        error: 'INVALID_ACCOUNT',
        message: 'No tienes permisos para enviar desde esta cuenta'
      };
    }

    return {
      success: false,
      error: 'SEND_FAILED',
      message: 'Error interno enviando email. Inténtalo nuevamente.'
    };
  }
}