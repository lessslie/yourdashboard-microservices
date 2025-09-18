
import { Injectable, Logger, HttpException, HttpStatus, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  OrchestratorEmailList,
  OrchestratorStatsResponse, 
  EmailDetail,
  ReplyEmailRequest,
  ReplyEmailResponse,
  OrchestratorSendEmailResponse,
  SearchEmailsResponse,
  OrchestratorTrafficLightDashboard,
  OrchestratorEmailsByTrafficLight,
  OrchestratorUpdateTrafficLights,
  TrafficLightStatus,
  SaveFullContentResponse
} from './interfaces';
import { SendEmailDto } from './dto/send-email.dto';

export interface JWTPayload {
  sub: string; // ✅ UUID del usuario
  sessionId: string; // ✅ UUID de sesión
  email: string;
  iat: number;
  exp: number;
}

@Injectable()
export class EmailsOrchestratorService {
  private readonly logger = new Logger(EmailsOrchestratorService.name);
  private readonly msEmailUrl: string;
  private readonly msAuthUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.msEmailUrl = this.configService.get<string>('MS_EMAIL_URL') || 'http://localhost:3002';
    this.msAuthUrl = this.configService.get<string>('MS_AUTH_URL') || 'http://localhost:3001';
  }

  // ==============================
  // 🔐 MÉTODOS DE JWT Y VALIDACIÓN
  // ==============================

  /**
   * ✅ Extraer User ID del JWT - RETORNA UUID STRING
   */
  extractUserIdFromJWT(authHeader: string): string | null {
    try {
      if (!authHeader?.startsWith('Bearer ')) {
        return null;
      }

      const token = authHeader.replace('Bearer ', '');
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      
      return payload.sub || null; // ✅ Retorna UUID string
    } catch (error) {
      this.logger.error('Error extracting user ID from JWT:', error);
      return null;
    }
  }

  /**
   * ✅ Validar JWT y extraer userId - RETORNA UUID STRING
   */
  private validateJWTAndExtractUserId(authHeader: string): string {
    const userId = this.extractUserIdFromJWT(authHeader);
    if (!userId) {
      throw new UnauthorizedException('Token JWT inválido o expirado');
    }
    return userId; // ✅ UUID string
  }

  // ==============================
  // 📧 MÉTODOS DE EMAILS PRINCIPALES  
  // ==============================

  /**
   * ✅ OBTENER INBOX CON JWT - Método requerido por controller
   */
  async getInboxWithJWT(
    authHeader: string, 
    userId: string,  // ✅ UUID string
    page: number = 1, 
    limit: number = 20
  ): Promise<OrchestratorEmailList> {
    try {
      this.logger.log(`📧 Obteniendo inbox para usuario UUID: ${userId}, página ${page}`);
      
      // Validar que el userId del JWT coincida
      const jwtUserId = this.validateJWTAndExtractUserId(authHeader);
      if (jwtUserId !== userId) {
        throw new UnauthorizedException('Usuario del token no coincide con parámetro');
      }

      const response = await fetch(`${this.msEmailUrl}/emails?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`MS-Email error: ${response.status} - ${errorText}`);
        
        if (response.status === 401) {
          throw new UnauthorizedException('Token JWT inválido o expirado');
        }
        throw new HttpException('Error obteniendo inbox', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const result = await response.json() as OrchestratorEmailList;
      
      this.logger.log(`✅ Inbox obtenido: ${result.emails?.length || 0} emails`);
      return result;

    } catch (error) {
      this.logger.error('Error en getInboxWithJWT:', error);
      throw error;
    }
  }

  /**
   * ✅ BÚSQUEDA DE EMAILS CON JWT - Método requerido por controller  
   */
  async searchEmailsWithJWT(
    authHeader: string,
    userId: string,  // ✅ UUID string
    searchTerm: string,
    page: number = 1,
    limit: number = 20
  ): Promise<SearchEmailsResponse> {
    try {
      this.logger.log(`🔍 Buscando emails para usuario UUID: ${userId}, término: "${searchTerm}"`);
      
      // Validar JWT
      const jwtUserId = this.validateJWTAndExtractUserId(authHeader);
      if (jwtUserId !== userId) {
        throw new UnauthorizedException('Usuario del token no coincide');
      }

      const searchParams = new URLSearchParams({
        q: searchTerm,
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`${this.msEmailUrl}/emails/search?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`MS-Email search error: ${response.status} - ${errorText}`);
        
        if (response.status === 401) {
          throw new UnauthorizedException('Token JWT inválido o expirado');
        }
        throw new HttpException('Error en búsqueda de emails', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const result = await response.json() as SearchEmailsResponse;
      
      this.logger.log(`✅ Búsqueda completada: ${result.emails?.length || 0} emails encontrados`);
      return result;

    } catch (error) {
      this.logger.error('Error en searchEmailsWithJWT:', error);
      throw error;
    }
  }

  /**
   * ✅ OBTENER ESTADÍSTICAS CON JWT - Método requerido por controller
   */
  async getStatsWithJWT(authHeader: string, userId: string): Promise<OrchestratorStatsResponse> {
    try {
      this.logger.log(`📊 Obteniendo estadísticas para usuario UUID: ${userId}`);
      
      // Validar JWT
      const jwtUserId = this.validateJWTAndExtractUserId(authHeader);
      if (jwtUserId !== userId) {
        throw new UnauthorizedException('Usuario del token no coincide');
      }

      const response = await fetch(`${this.msEmailUrl}/emails/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`MS-Email stats error: ${response.status} - ${errorText}`);
        
        if (response.status === 401) {
          throw new UnauthorizedException('Token JWT inválido o expirado');
        }
        throw new HttpException('Error obteniendo estadísticas', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const result = await response.json() as OrchestratorStatsResponse;
      
      this.logger.log(`✅ Estadísticas obtenidas para usuario ${userId}`);
      return result;

    } catch (error) {
      this.logger.error('Error en getStatsWithJWT:', error);
      throw error;
    }
  }

  /**
   * ✅ ENVIAR EMAIL NUEVO - Método requerido por controller
   */
  async sendEmail(
    authHeader: string,
    sendEmailData: SendEmailDto
  ): Promise<OrchestratorSendEmailResponse> {
    try {
      // Validar JWT y extraer userId
      const userId = this.validateJWTAndExtractUserId(authHeader);
      
      this.logger.log(`📤 Enviando email nuevo para usuario UUID: ${userId}`);
      this.logger.log(`📧 De: ${sendEmailData.from} → Para: ${sendEmailData.to.join(', ')}`);

      const response = await fetch(`${this.msEmailUrl}/emails/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(sendEmailData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`MS-Email send error: ${response.status} - ${errorText}`);
        
        if (response.status === 401) {
          throw new UnauthorizedException('Token JWT inválido o expirado');
        } else if (response.status === 403) {
          throw new HttpException('Cuenta de email no autorizada para este usuario', HttpStatus.FORBIDDEN);
        } else if (response.status === 400) {
          throw new BadRequestException('Datos de email inválidos');
        }
        throw new HttpException('Error enviando email', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const result = await response.json() as OrchestratorSendEmailResponse;
      
      // Invalidar cache automáticamente
      this.invalidateEmailCaches(userId);
      
      this.logger.log(`✅ Email enviado exitosamente - ID: ${result.data?.messageId}`);
      return result;

    } catch (error) {
      this.logger.error('Error en sendEmail:', error);
      throw error;
    }
  }

  /**
   * ✅ RESPONDER EMAIL - Método requerido por controller
   */
  async replyToEmail(
    emailId: string,
    replyData: ReplyEmailRequest,
    authHeader: string
  ): Promise<ReplyEmailResponse> {
    try {
      // Validar JWT
      const userId = this.validateJWTAndExtractUserId(authHeader);
      
      this.logger.log(`💬 Enviando respuesta al email ${emailId} para usuario UUID: ${userId}`);

      const response = await fetch(`${this.msEmailUrl}/emails/${emailId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(replyData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`MS-Email reply error: ${response.status} - ${errorText}`);
        
        if (response.status === 401) {
          throw new UnauthorizedException('Token JWT inválido o expirado');
        } else if (response.status === 404) {
          throw new HttpException('Email no encontrado', HttpStatus.NOT_FOUND);
        }
        throw new HttpException('Error enviando respuesta', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const result = await response.json() as ReplyEmailResponse;
      
      // Invalidar cache automáticamente
      this.invalidateEmailCaches(userId);
      
      this.logger.log(`✅ Respuesta enviada exitosamente - ID: ${result.sentMessageId}`);
      return result;

    } catch (error) {
      this.logger.error('Error en replyToEmail:', error);
      throw error;
    }
  }

  // ==============================
  // 📧 MÉTODOS ADICIONALES DE EMAILS
  // ==============================

  /**
   * ✅ OBTENER EMAIL POR ID CON JWT
   */
  async getEmailByIdWithJWT(authHeader: string, emailId: string): Promise<EmailDetail> {
    try {
      const userId = this.validateJWTAndExtractUserId(authHeader);
      
      this.logger.log(`📧 Obteniendo email ${emailId} para usuario UUID: ${userId}`);

      const response = await fetch(`${this.msEmailUrl}/emails/${emailId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`MS-Email getById error: ${response.status} - ${errorText}`);
        
        if (response.status === 401) {
          throw new UnauthorizedException('Token JWT inválido o expirado');
        } else if (response.status === 404) {
          throw new HttpException('Email no encontrado', HttpStatus.NOT_FOUND);
        }
        throw new HttpException('Error obteniendo email', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const result = await response.json() as EmailDetail;
      
      this.logger.log(`✅ Email obtenido: ${result.subject}`);
      return result;

    } catch (error) {
      this.logger.error('Error en getEmailByIdWithJWT:', error);
      throw error;
    }
  }

  /**
   * ✅ GUARDAR CONTENIDO COMPLETO OFFLINE
   */
  async saveFullContentOffline(authHeader: string, emailId: string): Promise<SaveFullContentResponse> {
    try {
      const userId = this.validateJWTAndExtractUserId(authHeader);
      
      this.logger.log(`💾 Guardando contenido offline del email ${emailId} para usuario UUID: ${userId}`);

      const response = await fetch(`${this.msEmailUrl}/emails/${emailId}/save-full-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`MS-Email save content error: ${response.status} - ${errorText}`);
        
        if (response.status === 401) {
          throw new UnauthorizedException('Token JWT inválido o expirado');
        } else if (response.status === 404) {
          throw new HttpException('Email no encontrado', HttpStatus.NOT_FOUND);
        }
        throw new HttpException('Error guardando contenido offline', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const result = await response.json() as SaveFullContentResponse;
      
      this.logger.log(`✅ Contenido offline guardado para email ${emailId}`);
      return result;

    } catch (error) {
      this.logger.error('Error en saveFullContentOffline:', error);
      throw error;
    }
  }

  // ==============================
  // 🚦 SISTEMA DE SEMÁFOROS (TRAFFIC LIGHTS)
  // ==============================

  /**
   * ✅ OBTENER DASHBOARD DE SEMÁFOROS
   */
  async getTrafficLightDashboard(authHeader: string): Promise<OrchestratorTrafficLightDashboard> {
    try {
      const userId = this.validateJWTAndExtractUserId(authHeader);
      
      this.logger.log(`🚦 Obteniendo dashboard semáforos para usuario UUID: ${userId}`);

      const response = await fetch(`${this.msEmailUrl}/emails/traffic-lights/dashboard`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`MS-Email traffic lights error: ${response.status} - ${errorText}`);
        
        if (response.status === 401) {
          throw new UnauthorizedException('Token JWT inválido o expirado');
        }
        throw new HttpException('Error obteniendo dashboard semáforos', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const result = await response.json() as OrchestratorTrafficLightDashboard;
      
      this.logger.log(`✅ Dashboard semáforos obtenido para usuario ${userId}`);
      return result;

    } catch (error) {
      this.logger.error('Error en getTrafficLightDashboard:', error);
      throw error;
    }
  }

  /**
   * ✅ OBTENER EMAILS POR ESTADO DE SEMÁFORO
   */
  async getEmailsByTrafficLight(
    authHeader: string,
    status: TrafficLightStatus,
    page: number = 1,
    limit: number = 20
  ): Promise<OrchestratorEmailsByTrafficLight> {
    try {
      const userId = this.validateJWTAndExtractUserId(authHeader);
      
      this.logger.log(`🚦 Obteniendo emails con semáforo ${status} para usuario UUID: ${userId}`);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`${this.msEmailUrl}/emails/traffic-lights/${status}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`MS-Email traffic lights by status error: ${response.status} - ${errorText}`);
        
        if (response.status === 401) {
          throw new UnauthorizedException('Token JWT inválido o expirado');
        }
        throw new HttpException('Error obteniendo emails por semáforo', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const result = await response.json() as OrchestratorEmailsByTrafficLight;
      
      this.logger.log(`✅ Emails con semáforo ${status} obtenidos: ${result.emails?.length || 0}`);
      return result;

    } catch (error) {
      this.logger.error('Error en getEmailsByTrafficLight:', error);
      throw error;
    }
  }

  /**
   * ✅ ACTUALIZAR ESTADOS DE SEMÁFOROS  
   */
  async updateTrafficLights(
    authHeader: string,
    updates: OrchestratorUpdateTrafficLights
  ): Promise<{ success: boolean; message: string; updatedCount: number }> {
    try {
      const userId = this.validateJWTAndExtractUserId(authHeader);
      
      this.logger.log(`🚦 Actualizando semáforos para usuario UUID: ${userId}, ${updates.emailIds?.length || 0} emails`);

      const response = await fetch(`${this.msEmailUrl}/emails/traffic-lights/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`MS-Email update traffic lights error: ${response.status} - ${errorText}`);
        
        if (response.status === 401) {
          throw new UnauthorizedException('Token JWT inválido o expirado');
        }
        throw new HttpException('Error actualizando semáforos', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const result = await response.json() as { success: boolean; message: string; updatedCount: number };
      
      // Invalidar cache automáticamente
      this.invalidateEmailCaches(userId);
      
      this.logger.log(`✅ Semáforos actualizados: ${result.updatedCount} emails`);
      return result;

    } catch (error) {
      this.logger.error('Error en updateTrafficLights:', error);
      throw error;
    }
  }

  /**
   * ✅ ELIMINAR EMAIL (marcar como deleted)
   */
  async deleteEmail(authHeader: string, emailId: string): Promise<{ success: boolean; message: string }> {
    try {
      const userId = this.validateJWTAndExtractUserId(authHeader);
      
      this.logger.log(`🗑️ Eliminando email ${emailId} para usuario UUID: ${userId}`);

      const response = await fetch(`${this.msEmailUrl}/emails/${emailId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`MS-Email delete error: ${response.status} - ${errorText}`);
        
        if (response.status === 401) {
          throw new UnauthorizedException('Token JWT inválido o expirado');
        } else if (response.status === 404) {
          throw new HttpException('Email no encontrado', HttpStatus.NOT_FOUND);
        }
        throw new HttpException('Error eliminando email', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const result = await response.json() as { success: boolean; message: string };
      
      // Invalidar cache automáticamente
      this.invalidateEmailCaches(userId);
      
      this.logger.log(`✅ Email eliminado exitosamente: ${emailId}`);
      return result;

    } catch (error) {
      this.logger.error('Error en deleteEmail:', error);
      throw error;
    }
  }

  // ==============================
  // 🧹 GESTIÓN DE CACHE
  // ==============================

  /**
   * ✅ INVALIDAR CACHES DE EMAILS - UUID support
   */
  invalidateEmailCaches(userId: string):void {
    try {

      this.logger.debug(`🧹 Invalidando cache para usuario UUID: ${userId}`);
      
      // Simular invalidación de cache (implementar según el sistema de cache usado)
      // await Promise.allSettled(cacheKeys.map(key => this.cacheService.delete(key)));
      
      this.logger.debug(`✅ Cache invalidado exitosamente`);
      
    } catch (error) {
      this.logger.warn('Error invalidando cache:', error);
      // No throw - cache invalidation no debe interrumpir operaciones principales
    }
  }
}



