
import {
  Controller,
  Get,
  Post,
  Query,
  Headers,
  Param,
  BadRequestException, 
  UnauthorizedException,
  Body,
  Logger,
  Delete,
  Put,
} from '@nestjs/common';
import { 
  EmailDetail,
  ReplyEmailRequest,
  ReplyEmailResponse
} from './interfaces/emails.interfaces';
import { 
  ApiTags, 
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiOkResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiBody,
  ApiForbiddenResponse,
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
import { OrchestratorEmailsByTrafficLight, OrchestratorTrafficLightDashboard, OrchestratorUpdateTrafficLights, SaveFullContentResponse } from './interfaces';
import { EmailPriority, SendEmailDto } from './dto/send-email.dto';

// ✅ IMPORT CORRECTO DEL ENUM
enum TrafficLightStatus {
  GREEN = 'green',
  YELLOW = 'yellow',
  RED = 'red',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

@Controller('emails')
@ApiTags('Emails')
export class EmailsOrchestratorController {
  private readonly logger = new Logger(EmailsOrchestratorController.name);

  constructor(private readonly emailsService: EmailsOrchestratorService) {}

  // ==============================
  // 📧 ENDPOINTS PRINCIPALES DE EMAILS
  // ==============================

  /**
   * ✅ GET /emails - Obtener inbox de emails
   */
  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener lista de emails del usuario',
    description: 'Retorna la lista paginada de emails del usuario autenticado con soporte para filtros y cache.'
  })
  @ApiQuery({ 
    name: 'userId', 
    description: 'UUID del usuario (se valida contra JWT)', 
    example: '550e8400-e29b-41d4-a716-446655440000' 
  })
  @ApiQuery({ name: 'page', required: false, description: 'Página a obtener', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Emails por página', example: 20 })
  @ApiOkResponse({ 
    description: 'Lista de emails obtenida exitosamente',
    type: OrchestratorEmailListDto
  })
  @ApiUnauthorizedResponse({ 
    description: 'Token JWT inválido o faltante',
    type: OrchestratorErrorDto 
  })
  async getEmails(
    @Headers() headers: Record<string, string | undefined>,
    @Query('userId') userId: string,  // ✅ UUID string
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido - usa el botón Authorize');
    }

    if (!userId) {
      throw new BadRequestException('UUID del usuario es requerido');
    }

    this.logger.log(`📧 Obteniendo emails para usuario UUID: ${userId}, página ${page}`);
    
    // ✅ LLAMADA CORREGIDA AL SERVICE
    return this.emailsService.getInboxWithJWT(authHeader, userId, page, limit);
  }

  /**
   * ✅ GET /emails/search - Búsqueda de emails
   */
  @Get('search')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Buscar emails por texto',
    description: 'Permite buscar emails usando texto libre en asunto, contenido, remitente, etc.'
  })
  @ApiQuery({ 
    name: 'userId', 
    description: 'UUID del usuario', 
    example: '550e8400-e29b-41d4-a716-446655440000' 
  })
  @ApiQuery({ name: 'q', description: 'Término de búsqueda', example: 'meeting agenda' })
  @ApiQuery({ name: 'page', required: false, description: 'Página a obtener', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Emails por página', example: 20 })
  async searchEmails(
    @Headers() headers: Record<string, string | undefined>,
    @Query('userId') userId: string,  // ✅ UUID string
    @Query('q') searchTerm: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido - usa el botón Authorize');
    }

    if (!userId || !searchTerm) {
      throw new BadRequestException('UUID del usuario y término de búsqueda son requeridos');
    }

    this.logger.log(`🔍 Buscando emails para usuario UUID: ${userId}, término: "${searchTerm}"`);
    
    // ✅ LLAMADA CORREGIDA AL SERVICE
    return this.emailsService.searchEmailsWithJWT(authHeader, userId, searchTerm, page, limit);
  }

  /**
   * ✅ GET /emails/stats - Estadísticas de emails
   */
  @Get('stats')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener estadísticas de emails',
    description: 'Retorna estadísticas generales de emails del usuario incluyendo conteos y estado de cuentas.'
  })
  @ApiQuery({ 
    name: 'userId', 
    description: 'UUID del usuario', 
    example: '550e8400-e29b-41d4-a716-446655440000' 
  })
  @ApiOkResponse({ 
    description: 'Estadísticas obtenidas exitosamente',
    type: OrchestratorStatsDto
  })
  async getStats(
    @Headers() headers: Record<string, string | undefined>,
    @Query('userId') userId: string  // ✅ UUID string
  ) {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido - usa el botón Authorize');
    }

    if (!userId) {
      throw new BadRequestException('UUID del usuario es requerido');
    }

    this.logger.log(`📊 Obteniendo estadísticas para usuario UUID: ${userId}`);
    
    // ✅ LLAMADA CORREGIDA AL SERVICE
    return this.emailsService.getStatsWithJWT(authHeader, userId);
  }

  /**
   * ✅ GET /emails/:id - Obtener email específico
   */
  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Obtener email específico por ID',
    description: 'Retorna el contenido completo de un email específico incluyendo texto HTML y attachments.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID del email en Gmail', 
    example: '1847a8e123456789' 
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
            bodyHtml: { type: 'string', example: '<p>Contenido del email...</p>' },
            sourceAccount: { type: 'string', example: 'usuario@gmail.com' },
            sourceAccountId: { type: 'string', example: '650e8400-e29b-41d4-a716-446655440001' }  // ✅ UUID
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: 'Token JWT faltante o inválido',
    type: OrchestratorErrorDto 
  })
  @ApiNotFoundResponse({ 
    description: 'Email no encontrado',
    type: OrchestratorErrorDto 
  })
  // ✅ RETURN TYPE CORREGIDO
  async getEmailById(
    @Param('id') emailId: string,
    @Headers() headers: Record<string, string | undefined>
  ): Promise<EmailDetail> {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido - usa el botón Authorize');
    }

    if (!emailId) {
      throw new BadRequestException('ID del mensaje es requerido');
    }

    this.logger.log(`📧 Obteniendo email ${emailId} con JWT token`);
    
    return this.emailsService.getEmailByIdWithJWT(authHeader, emailId);
  }

  // ==============================
  // 📤 ENDPOINTS DE ENVÍO DE EMAILS  
  // ==============================

  /**
   * ✅ POST /emails/send - Enviar email nuevo
   */
  @Post('send')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Enviar email nuevo',
    description: 'Crea y envía un email completamente nuevo coordinando MS-Auth + MS-Email.'
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
          bodyHtml: '<p>Hola,</p><p>Espero que estés bien. Te envío la propuesta que discutimos...</p>',
          priority: 'normal'
        }
      }
    }
  })
  @ApiOkResponse({
    description: 'Email enviado exitosamente',
    type: OrchestratorSendEmailResponseDto
  })
  @ApiForbiddenResponse({ 
    description: 'Cuenta Gmail no pertenece al usuario',
    schema: {
      type: 'object', 
      properties: {
        success: { type: 'boolean', example: false },
        error: { type: 'string', example: 'ACCOUNT_NOT_AUTHORIZED' },
        message: { type: 'string', example: 'La cuenta agata.backend@gmail.com no está asociada a tu usuario' }
      }
    }
  })
  async sendEmail(
    @Headers() headers: Record<string, string | undefined>,
    @Body() sendEmailData: SendEmailDto
  ): Promise<OrchestratorSendEmailResponseDto> {
    const authHeader = headers?.authorization;
    
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido - usa el botón Authorize');
    }

    this.logger.log(`📤 Enviando email nuevo desde ${sendEmailData.from}`);

    // ✅ LLAMADA CORREGIDA AL SERVICE  
    const result = await this.emailsService.sendEmail(authHeader, sendEmailData);
    
    this.logger.log(`✅ Email enviado exitosamente via orchestrator - ID: ${result.data?.messageId}`);
    
   return {
  success: true,
  source: 'orchestrator', 
  data: {
    messageId: result.data?.messageId || 'unknown',
    threadId:  'unknown',
    sentAt: new Date().toISOString(),
    fromEmail: sendEmailData.from,
    toEmails: sendEmailData.to,
    ccEmails: sendEmailData.cc || [],
    bccEmails: sendEmailData.bcc || [],
    subject: sendEmailData.subject,
    priority: sendEmailData.priority || EmailPriority.NORMAL || 'normal',
    hasAttachments: (sendEmailData.attachments?.length || 0) > 0,
    attachmentCount: sendEmailData.attachments?.length || 0,
    sizeEstimate: 0
  }
};
  }

  /**
   * ✅ POST /emails/:id/reply - Responder a email
   */
  @Post(':id/reply')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Responder a un email específico',
    description: 'Envía una respuesta a un email existente manteniendo el thread y referencias.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID del email a responder', 
    example: '1847a8e123456789' 
  })
  @ApiBody({
    description: 'Contenido de la respuesta',
    type: ReplyEmailDto,
    examples: {
      'reply-simple': {
        summary: 'Respuesta simple',
        value: {
          body: 'Gracias por tu mensaje. Te respondo que...',
          bodyHtml: '<p>Gracias por tu mensaje.</p><p>Te respondo que...</p>'
        }
      }
    }
  })
  @ApiOkResponse({ 
    description: 'Respuesta enviada exitosamente',
    type: ReplyResponseDto
  })
  async replyToEmail(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') emailId: string,
    @Body() replyData: ReplyEmailRequest
  ): Promise<ReplyEmailResponse> {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido - usa el botón Authorize');
    }

    if (!emailId) {
      throw new BadRequestException('ID del email es requerido');
    }

    if (!replyData.body || replyData.body.trim() === '') {
      throw new BadRequestException('El contenido de la respuesta es requerido');
    }

    this.logger.log(`💬 Enviando respuesta al email ${emailId}`);

    // ✅ LLAMADA CORREGIDA AL SERVICE
    const result = await this.emailsService.replyToEmail(emailId, replyData, authHeader);

    const userId = this.emailsService.extractUserIdFromJWT(authHeader);
    if (userId) {
      await this.emailsService.invalidateEmailCaches(userId);
    }

    this.logger.log(`✅ Respuesta enviada exitosamente: ${result.sentMessageId}`);
    return result;
  }

  // ==============================
  // 🚦 ENDPOINTS DE SISTEMA SEMÁFORO  
  // ==============================

  /**
   * ✅ GET /emails/traffic-lights/dashboard - Dashboard de semáforos
   */
  @Get('traffic-lights/dashboard')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener dashboard de sistema de semáforos',
    description: 'Retorna estadísticas completas del sistema de clasificación por colores de emails.'
  })
  @ApiOkResponse({
    description: 'Dashboard obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        source: { type: 'string', example: 'orchestrator' },
        data: {
          type: 'object',
          properties: {
            summary: {
              type: 'object',
              properties: {
                green: { type: 'number', example: 25 },
                yellow: { type: 'number', example: 15 },
                red: { type: 'number', example: 8 },
                archived: { type: 'number', example: 102 },
                deleted: { type: 'number', example: 5 },
                total: { type: 'number', example: 155 }
              }
            }
          }
        }
      }
    }
  })
  // ✅ RETURN TYPE CORREGIDO
  async getTrafficLightDashboard(
    @Headers() headers: Record<string, string | undefined>
  ): Promise<OrchestratorTrafficLightDashboard> {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido - usa el botón Authorize');
    }

    this.logger.log(`🚦 Obteniendo dashboard de semáforos`);
    
    return this.emailsService.getTrafficLightDashboard(authHeader);
  }

  /**
   * ✅ GET /emails/traffic-lights/:status - Emails por estado de semáforo
   */
  @Get('traffic-lights/:status')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener emails por estado de semáforo',
    description: 'Retorna lista paginada de emails filtrados por estado de semáforo específico.'
  })
  @ApiParam({ 
    name: 'status', 
    description: 'Estado del semáforo', 
    enum: TrafficLightStatus,
    example: 'red'
  })
  @ApiQuery({ name: 'page', required: false, description: 'Página a obtener', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Emails por página', example: 20 })
  // ✅ RETURN TYPE CORREGIDO
  async getEmailsByTrafficLight(
    @Headers() headers: Record<string, string | undefined>,
    @Param('status') status: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ): Promise<OrchestratorEmailsByTrafficLight> {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido - usa el botón Authorize');
    }

    // ✅ VALIDACIÓN CORREGIDA CON ENUM
    const validStatuses = Object.values(TrafficLightStatus);
    if (!validStatuses.includes(status as TrafficLightStatus)) {
      throw new BadRequestException(`Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}`);
    }

    this.logger.log(`🚦 Obteniendo emails con semáforo ${status}, página ${page}`);
    
    return this.emailsService.getEmailsByTrafficLight(
      authHeader,
      status as TrafficLightStatus,
      page,
      limit
    );
  }

  /**
   * ✅ PUT /emails/traffic-lights - Actualizar estados de semáforos
   */
  @Put('traffic-lights')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Actualizar estados de semáforos de emails',
    description: 'Permite actualizar masivamente el estado de semáforo de múltiples emails.'
  })
  @ApiBody({
    description: 'Datos para actualización de semáforos',
    schema: {
      type: 'object',
      properties: {
        emailIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['1847a8e123456789', '1847a8e987654321']
        },
        newStatus: {
          type: 'string',
          enum: Object.values(TrafficLightStatus),
          example: 'archived'
        },
        reason: {
          type: 'string',
          example: 'Bulk archive old promotional emails',
          required: ['emailIds', 'newStatus']
        }
      },
      required: ['emailIds', 'newStatus']
    }
  })
  @ApiOkResponse({
    description: 'Estados actualizados exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Estados actualizados exitosamente' },
        updatedCount: { type: 'number', example: 5 }
      }
    }
  })
  async updateTrafficLights(
    @Headers() headers: Record<string, string | undefined>,
    @Body() updates: OrchestratorUpdateTrafficLights
  ): Promise<{ success: boolean; message: string; updatedCount: number }> {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido - usa el botón Authorize');
    }

    if (!updates.emailIds || updates.emailIds.length === 0) {
      throw new BadRequestException('Se requiere al menos un email ID');
    }

    if (!Object.values(TrafficLightStatus).includes(updates.newStatus)) {
      throw new BadRequestException('Estado de semáforo inválido');
    }

    this.logger.log(`🚦 Actualizando semáforos: ${updates.emailIds.length} emails → ${updates.newStatus}`);
    
    return this.emailsService.updateTrafficLights(authHeader, updates);
  }

  // ==============================
  // 💾 ENDPOINTS DE CONTENIDO OFFLINE
  // ==============================

  /**
   * ✅ POST /emails/:id/save-full-content - Guardar contenido completo offline
   */
  @Post(':id/save-full-content')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Guardar contenido completo de email offline',
    description: 'Descarga y guarda el contenido completo de un email para acceso offline rápido.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID del email en Gmail', 
    example: '1847a8e123456789' 
  })
  @ApiOkResponse({
    description: 'Contenido guardado offline exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Contenido guardado offline exitosamente' },
        emailId: { type: 'string', example: '1847a8e123456789' }
      }
    }
  })
  // ✅ RETURN TYPE CORREGIDO
  async saveFullContentOffline(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') emailId: string
  ): Promise<SaveFullContentResponse> {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido - usa el botón Authorize');
    }

    if (!emailId) {
      throw new BadRequestException('ID del email es requerido');
    }

    this.logger.log(`💾 Guardando contenido offline del email ${emailId}`);
    
    return this.emailsService.saveFullContentOffline(authHeader, emailId);
  }

  // ==============================
  // 🗑️ ENDPOINTS DE ELIMINACIÓN
  // ==============================

  /**
   * ✅ DELETE /emails/:id - Eliminar email
   */
  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Eliminar un email específico',
    description: 'Marca un email como eliminado usando el sistema de semáforo.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID del email a eliminar', 
    example: '1847a8e123456789' 
  })
  @ApiOkResponse({
    description: 'Email eliminado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Email eliminado exitosamente' }
      }
    }
  })
  async deleteEmail(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') emailId: string
  ): Promise<{ success: boolean; message: string }> {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token JWT requerido - usa el botón Authorize');
    }

    if (!emailId) {
      throw new BadRequestException('ID del email es requerido');
    }

    this.logger.log(`🗑️ Eliminando email ${emailId}`);
    
    return this.emailsService.deleteEmail(authHeader, emailId);
  }
}
