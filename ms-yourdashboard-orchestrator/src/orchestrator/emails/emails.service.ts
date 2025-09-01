import { Injectable, HttpException, HttpStatus, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse, AxiosError } from 'axios';
import { CacheService } from '../cache/cache.service';
import { 
  TokenResponse, 
  EmailListResponse, 
  EmailStats, 
  EmailDetail,
  ReplyEmailRequest,
  ReplyEmailResponse
} from './interfaces/emails.interfaces';
import {
  TrafficLightStatus,
  TrafficLightDashboardResponse,
  EmailsByTrafficLightResponse,
  UpdateTrafficLightsResponse,
  OrchestratorTrafficLightDashboard,
  OrchestratorEmailsByTrafficLight,
  OrchestratorUpdateTrafficLights
} from './interfaces';

// Interfaces específicas para evitar any
export interface SyncResponse {
  success: boolean;
  source: string;
  data: {
    success: boolean;
    message: string;
    stats: {
      cuenta_gmail_id: number;
      emails_nuevos: number;
      emails_actualizados: number;
      tiempo_total_ms: number;
    };
  };
}

interface ErrorResponse {
  message: string;
}

// Interface para el payload del JWT
interface JWTPayload {
  sub?: number;
  email?: string;
  nombre?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class EmailsOrchestratorService {
  private readonly logger = new Logger(EmailsOrchestratorService.name);
  private readonly msAuthUrl: string;
  private readonly msEmailUrl: string;
  
  // TTL (Time To Live) para diferentes tipos de cache
  private readonly CACHE_TTL = {
    EMAILS: 300,     // 5 minutos
    STATS: 600,      // 10 minutos
    SEARCH: 180,     // 3 minutos
    DETAIL: 900      // 15 minutos
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService
  ) {
    this.msAuthUrl = this.configService.get<string>('MS_AUTH_URL') || 'http://localhost:3001';
    this.msEmailUrl = this.configService.get<string>('MS_EMAIL_URL') || 'http://localhost:3002';
  }

  /**
   * Obtener token válido del ms-auth usando cuentaGmailId
   */
  private async getValidTokenForGmailAccount(cuentaGmailId: string): Promise<string> {
    try {
      this.logger.debug(`Solicitando token para cuenta Gmail ${cuentaGmailId}`);
      
      const response: AxiosResponse<TokenResponse> = await axios.get(
        `${this.msAuthUrl}/tokens/gmail/${cuentaGmailId}`
      );
      
      if (!response.data.success) {
        throw new Error('No se pudo obtener token válido');
      }

      this.logger.debug(`Token obtenido para cuenta Gmail ${cuentaGmailId}`);
      return response.data.accessToken;

    } catch (error) {
      const apiError = error as AxiosError<ErrorResponse>;
      this.logger.error(`Error obteniendo token:`, apiError.message);
      throw new HttpException(
        `Error obteniendo token para cuenta Gmail: ${apiError.message}`,
        HttpStatus.UNAUTHORIZED
      );
    }
  }

  /**
   * RESPONDER A UN EMAIL - Coordina con MS-Email para enviar respuesta
   */
  async replyToEmail(
    emailId: string,
    replyData: ReplyEmailRequest,
    authHeader: string
  ): Promise<ReplyEmailResponse> {
    try {
      this.logger.log(`Coordinando respuesta al email ${emailId}`);

      const emailServiceUrl = `${this.msEmailUrl}/emails/${emailId}/reply`;

      const response = await fetch(emailServiceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(replyData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        this.logger.error(`MS-Email error: ${response.status} - ${errorData}`);
        
        if (response.status === 404) {
          throw new HttpException('Email no encontrado en ninguna cuenta del usuario', HttpStatus.NOT_FOUND);
        } else if (response.status === 401) {
          throw new HttpException('Token expirado o inválido', HttpStatus.UNAUTHORIZED);
        } else {
          throw new HttpException('Error enviando respuesta al email', HttpStatus.BAD_REQUEST);
        }
      }

      const result = await response.json() as ReplyEmailResponse;

      this.logger.log(`Respuesta enviada exitosamente via MS-Email`);

      return result;

    } catch (error) {
      this.logger.error(`Error coordinando respuesta de email:`, error);
      throw error;
    }
  }

  /**
   * INVALIDAR CACHES DE EMAILS - Limpia los caches relacionados con emails
   */
  async invalidateEmailCaches(userId: number): Promise<void> {
    try {
      const cacheKeys = [
        `emails_inbox_${userId}`,
        `emails_stats_${userId}`,
        `emails_search_${userId}`,
        'emails_all_accounts'
      ];

      await Promise.allSettled(
        cacheKeys.map(key => this.cacheService.delete(key))
      );

      this.logger.debug(`Cache invalidado para usuario ${userId}`);
      
    } catch (error) {
      this.logger.warn('Error invalidando cache:', error);
    }
  }

  /**
   * Extraer User ID del JWT token - MÉTODO PÚBLICO
   */
  extractUserIdFromJWT(authHeader: string): number | null {
    try {
      const token = authHeader.replace('Bearer ', '');
      const parts = token.split('.');
      
      if (parts.length !== 3) return null;

      const payloadBase64 = parts[1];
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
      
      const payload = JSON.parse(payloadJson) as JWTPayload;
      
      if (typeof payload.sub !== 'number') {
        this.logger.warn('JWT payload.sub no es válido');
        return null;
      }

      return payload.sub;

    } catch (error) {
      this.logger.error('Error extrayendo userId del JWT:', error);
      return null;
    }
  }

  /**
   * Sincronizar emails manualmente
   */
  async syncEmails(cuentaGmailId: string, maxEmails: number = 100): Promise<SyncResponse> {
    try {
      this.logger.log(`Iniciando sync manual para cuenta Gmail ${cuentaGmailId}`);

      const accessToken = await this.getValidTokenForGmailAccount(cuentaGmailId);
      
      const response: AxiosResponse<{ success: boolean; message: string; stats: any }> = await axios.post(
        `${this.msEmailUrl}/emails/sync`, 
        null, 
        {
          params: { cuentaGmailId, maxEmails },
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          timeout: 120000
        }
      );

      await this.clearGmailAccountCache(cuentaGmailId);
      
      this.logger.log(`Sync manual completado para cuenta Gmail ${cuentaGmailId}`);
      
      return {
        success: true,
        source: 'orchestrator',
        data: response.data
      };

    } catch (error) {
      const apiError = error as AxiosError<ErrorResponse>;
      this.logger.error(`Error en sync manual:`, apiError.message);
      throw new HttpException(
        `Error sincronizando emails: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Sincronización incremental
   */
  async syncIncremental(cuentaGmailId: string, maxEmails: number = 30): Promise<SyncResponse> {
    try {
      this.logger.log(`Iniciando sync incremental para cuenta Gmail ${cuentaGmailId}`);

      const accessToken = await this.getValidTokenForGmailAccount(cuentaGmailId);
      
      const response: AxiosResponse<{ success: boolean; message: string; stats: any }> = await axios.post(
        `${this.msEmailUrl}/emails/sync/incremental`, 
        null, 
        {
          params: { cuentaGmailId, maxEmails },
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      await this.clearGmailAccountCache(cuentaGmailId);
      
      this.logger.log(`Sync incremental completado para cuenta Gmail ${cuentaGmailId}`);
      
      return {
        success: true,
        source: 'orchestrator',
        data: response.data
      };

    } catch (error) {
      const apiError = error as AxiosError<ErrorResponse>;
      this.logger.error(`Error en sync incremental:`, apiError.message);
      throw new HttpException(
        `Error en sincronización incremental: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Limpiar cache para cuenta específica
   */
  private async clearGmailAccountCache(cuentaGmailId: string): Promise<void> {
    try {
      this.logger.log(`Limpiando cache para cuenta Gmail ${cuentaGmailId}`);
      
      await Promise.allSettled([
        this.cacheService.deletePattern(`inbox:${cuentaGmailId}`),
        this.cacheService.deletePattern(`search:${cuentaGmailId}`),
        this.cacheService.deletePattern(`stats:${cuentaGmailId}`),
        this.cacheService.deletePattern(`detail:${cuentaGmailId}`)
      ]);
      
      this.logger.log(`Cache limpiado para cuenta Gmail ${cuentaGmailId}`);
    } catch (error) {
      this.logger.error(`Error limpiando cache:`, error);
    }
  }

  /**
   * Obtener inbox del usuario - CON CACHE
   */
  async getInbox(cuentaGmailId: string, page: number = 1, limit: number = 10) {
    try {
      this.logger.log(`Obteniendo inbox para cuenta Gmail ${cuentaGmailId} - Página ${page}`);

      const cacheKey = this.cacheService.generateKey('inbox', cuentaGmailId, { page, limit });
      const cachedResult = await this.cacheService.get<EmailListResponse>(cacheKey);
      
      if (cachedResult) {
        this.logger.log(`CACHE HIT - Inbox desde cache para cuenta Gmail ${cuentaGmailId}`);
        return {
          success: true,
          source: 'orchestrator-cache',
          data: cachedResult
        };
      }

      this.logger.log(`CACHE MISS - Obteniendo inbox desde API para cuenta Gmail ${cuentaGmailId}`);
      
      const accessToken = await this.getValidTokenForGmailAccount(cuentaGmailId);
      
      const response: AxiosResponse<EmailListResponse> = await axios.get(`${this.msEmailUrl}/emails/inbox`, {
        params: { cuentaGmailId, page, limit },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      await this.cacheService.set(cacheKey, response.data, this.CACHE_TTL.EMAILS);
      
      this.logger.log(`Inbox obtenido y guardado en cache para cuenta Gmail ${cuentaGmailId}`);
      
      return {
        success: true,
        source: 'orchestrator-api',
        data: response.data
      };

    } catch (error) {
      const apiError = error as AxiosError<ErrorResponse>;
      this.logger.error(`Error obteniendo inbox:`, apiError.message);
      throw new HttpException(
        `Error obteniendo inbox: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Buscar emails del usuario - CON CACHE
   */
  async searchEmails(
    cuentaGmailId: string, 
    searchTerm: string, 
    page: number = 1, 
    limit: number = 10
  ) {
    try {
      this.logger.log(`Buscando emails para cuenta Gmail ${cuentaGmailId}: "${searchTerm}"`);

      const cacheKey = this.cacheService.generateKey('search', cuentaGmailId, { 
        searchTerm: searchTerm.toLowerCase().trim(),
        page, 
        limit 
      });
      
      const cachedResult = await this.cacheService.get<EmailListResponse>(cacheKey);
      
      if (cachedResult) {
        this.logger.log(`CACHE HIT - Búsqueda desde cache para cuenta Gmail ${cuentaGmailId}`);
        return {
          success: true,
          source: 'orchestrator-cache',
          searchTerm,
          data: cachedResult
        };
      }

      this.logger.log(`CACHE MISS - Buscando desde API para cuenta Gmail ${cuentaGmailId}`);
      
      const accessToken = await this.getValidTokenForGmailAccount(cuentaGmailId);
      
      const response: AxiosResponse<EmailListResponse> = await axios.get(`${this.msEmailUrl}/emails/search`, {
        params: { cuentaGmailId, q: searchTerm, page, limit },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      await this.cacheService.set(cacheKey, response.data, this.CACHE_TTL.SEARCH);
      
      this.logger.log(`Búsqueda completada y guardada en cache`);
      
      return {
        success: true,
        source: 'orchestrator-api',
        searchTerm,
        data: response.data
      };

    } catch (error) {
      const apiError = error as AxiosError<ErrorResponse>;
      this.logger.error(`Error buscando emails:`, apiError.message);
      throw new HttpException(
        `Error buscando emails: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Buscar emails en TODAS las cuentas Gmail del usuario - CON CACHE
   */
  async searchAllAccountsEmails(
    userId: string, 
    searchTerm: string, 
    page: number = 1, 
    limit: number = 10
  ) {
    try {
      this.logger.log(`BÚSQUEDA GLOBAL para usuario ${userId}: "${searchTerm}"`);

      const userIdNum = parseInt(userId, 10);
      if (isNaN(userIdNum)) {
        throw new BadRequestException(`userId debe ser un número válido: ${userId}`);
      }

      const cacheKey = this.cacheService.generateKey('global-search', userId, { 
        searchTerm: searchTerm.toLowerCase().trim(),
        page, 
        limit 
      });
      
      const cachedResult = await this.cacheService.get<EmailListResponse & { 
        accountsSearched?: string[]; 
      }>(cacheKey);
      
      if (cachedResult) {
        this.logger.log(`CACHE HIT - Búsqueda global desde cache para usuario ${userId}`);
        return {
          success: true,
          source: 'orchestrator-cache',
          searchTerm,
          accountsSearched: cachedResult.accountsSearched || [],
          data: cachedResult
        };
      }

      this.logger.log(`CACHE MISS - Búsqueda global desde API para usuario ${userId}`);
      
      const response: AxiosResponse<EmailListResponse & { 
        accountsSearched?: string[]; 
      }> = await axios.get(`${this.msEmailUrl}/emails/search-all-accounts`, {
        params: { userId, q: searchTerm, page, limit },
        headers: {
          'X-User-ID': userId
        }
      });

      await this.cacheService.set(cacheKey, response.data, this.CACHE_TTL.SEARCH);
      
      this.logger.log(`Búsqueda global completada y guardada en cache`);
      this.logger.log(`Resultados: ${response.data.total} emails de ${response.data.accountsSearched?.length || 0} cuentas`);
      
      return {
        success: true,
        source: 'orchestrator-api',
        searchTerm,
        accountsSearched: response.data.accountsSearched || [],
        data: response.data
      };

    } catch (error) {
      const apiError = error as AxiosError<ErrorResponse>;
      this.logger.error(`Error en búsqueda global:`, apiError.message);
      
      if (apiError.response?.status === 404) {
        throw new HttpException(
          `Usuario ${userId} no tiene cuentas Gmail conectadas`,
          HttpStatus.NOT_FOUND
        );
      }

      if (apiError.response?.status === 401) {
        throw new HttpException(
          `Error de autenticación para usuario ${userId}`,
          HttpStatus.UNAUTHORIZED
        );
      }

      throw new HttpException(
        `Error en búsqueda global: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Inbox unificado de TODAS las cuentas Gmail del usuario - CON CACHE
   */
  async getInboxAllAccounts(
    userId: string, 
    page: number = 1, 
    limit: number = 10
  ) {
    try {
      this.logger.log(`INBOX UNIFICADO para usuario ${userId} - Página ${page}`);

      const userIdNum = parseInt(userId, 10);
      if (isNaN(userIdNum)) {
        throw new BadRequestException(`userId debe ser un número válido: ${userId}`);
      }

      const cacheKey = this.cacheService.generateKey('inbox-unified', userId, { page, limit });
      
      const cachedResult = await this.cacheService.get<EmailListResponse & { 
        accountsLoaded?: string[]; 
      }>(cacheKey);
      
      if (cachedResult) {
        this.logger.log(`CACHE HIT - Inbox unificado desde cache para usuario ${userId}`);
        return {
          success: true,
          source: 'orchestrator-cache',
          accountsLoaded: cachedResult.accountsLoaded || [],
          data: cachedResult
        };
      }

      this.logger.log(`CACHE MISS - Inbox unificado desde API para usuario ${userId}`);
      
      const response: AxiosResponse<EmailListResponse & { 
        accountsLoaded?: string[]; 
      }> = await axios.get(`${this.msEmailUrl}/emails/inbox-all-accounts`, {
        params: { userId, page, limit },
        headers: {
          'X-User-ID': userId
        }
      });

      await this.cacheService.set(cacheKey, response.data, this.CACHE_TTL.EMAILS);
      
      this.logger.log(`Inbox unificado completado y guardado en cache`);
      this.logger.log(`Resultados: ${response.data.total} emails de ${response.data.accountsLoaded?.length || 0} cuentas`);
      
      return {
        success: true,
        source: 'orchestrator-api',
        accountsLoaded: response.data.accountsLoaded || [],
        data: response.data
      };

    } catch (error) {
      const apiError = error as AxiosError<ErrorResponse>;
      this.logger.error(`Error en inbox unificado:`, apiError.message);
      
      if (apiError.response?.status === 404) {
        throw new HttpException(
          `Usuario ${userId} no tiene cuentas Gmail conectadas`,
          HttpStatus.NOT_FOUND
        );
      }

      if (apiError.response?.status === 401) {
        throw new HttpException(
          `Error de autenticación para usuario ${userId}`,
          HttpStatus.UNAUTHORIZED
        );
      }

      throw new HttpException(
        `Error en inbox unificado: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Obtener estadísticas de emails - CON CACHE
   */
  async getEmailStats(cuentaGmailId: string) {
    try {
      this.logger.log(`Obteniendo estadísticas para cuenta Gmail ${cuentaGmailId}`);

      const cacheKey = this.cacheService.generateKey('stats', cuentaGmailId);
      const cachedResult = await this.cacheService.get<EmailStats>(cacheKey);
      
      if (cachedResult) {
        this.logger.log(`CACHE HIT - Stats desde cache para cuenta Gmail ${cuentaGmailId}`);
        return {
          success: true,
          source: 'orchestrator-cache',
          data: cachedResult
        };
      }

      this.logger.log(`CACHE MISS - Obteniendo stats desde API`);
      
      const accessToken = await this.getValidTokenForGmailAccount(cuentaGmailId);
      
      const response: AxiosResponse<EmailStats> = await axios.get(`${this.msEmailUrl}/emails/stats`, {
        params: { cuentaGmailId },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      await this.cacheService.set(cacheKey, response.data, this.CACHE_TTL.STATS);
      
      this.logger.log(`Stats obtenidas y guardadas en cache`);
      
      return {
        success: true,
        source: 'orchestrator-api',
        data: response.data
      };

    } catch (error) {
      const apiError = error as AxiosError<ErrorResponse>;
      this.logger.error(`Error obteniendo estadísticas:`, apiError.message);
      throw new HttpException(
        `Error obteniendo estadísticas: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Obtener email específico - CON CACHE
   */
  async getEmailByIdWithJWT(authHeader: string, emailId: string) {
    try {
      this.logger.log(`Obteniendo email ${emailId} con JWT token via orchestrator`);

      const userId = this.extractUserIdFromJWT(authHeader);
      
      if (!userId) {
        throw new UnauthorizedException('Token JWT inválido');
      }

      const cacheKey = this.cacheService.generateKey('email-detail', userId.toString(), { emailId });
      const cachedResult = await this.cacheService.get<EmailDetail>(cacheKey);
      
      if (cachedResult) {
        this.logger.log(`CACHE HIT - Email detail desde cache`);
        return {
          success: true,
          source: 'orchestrator-cache',
          data: cachedResult
        };
      }

      this.logger.log(`CACHE MISS - Obteniendo email desde MS-Email`);
      
      const response: AxiosResponse<EmailDetail> = await axios.get(`${this.msEmailUrl}/emails/${emailId}`, {
        headers: {
          'Authorization': authHeader
        }
      });

      await this.cacheService.set(cacheKey, response.data, this.CACHE_TTL.DETAIL);
      
      this.logger.log(`Email obtenido y guardado en cache`);
      
      return {
        success: true,
        source: 'orchestrator-api',
        data: response.data
      };

    } catch (error) {
      const apiError = error as AxiosError<ErrorResponse>;
      this.logger.error(`Error obteniendo email con JWT:`, apiError.message);
      
      if (apiError.response?.status === 404) {
        throw new HttpException(
          `Email ${emailId} no encontrado`,
          HttpStatus.NOT_FOUND
        );
      }
      
      if (apiError.response?.status === 401) {
        throw new HttpException(
          'Token JWT inválido o expirado',
          HttpStatus.UNAUTHORIZED
        );
      }
      
      throw new HttpException(
        `Error obteniendo email: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ==============================
  // MÉTODOS DEL SISTEMA SEMÁFORO
  // ==============================

  /**
   * DASHBOARD DEL SEMÁFORO - Estadísticas por cuenta Gmail
   */
  async getTrafficLightDashboard(authHeader: string): Promise<OrchestratorTrafficLightDashboard> {
    try {
      this.logger.log(`Obteniendo dashboard del semaforo`);

      const userId = this.extractUserIdFromJWT(authHeader);
      
      if (!userId) {
        throw new UnauthorizedException('Token JWT inválido');
      }

      const response: AxiosResponse<TrafficLightDashboardResponse> = await axios.get(
        `${this.msEmailUrl}/emails/traffic-light/dashboard`, 
        {
          headers: {
            'Authorization': authHeader
          }
        }
      );

      if (!response.data.success) {
        throw new HttpException(
          response.data.error || 'Error obteniendo dashboard del semaforo',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      this.logger.log(`Dashboard del semaforo obtenido exitosamente`);
      
      return {
        success: true,
        source: 'orchestrator',
        data: {
          dashboard: response.data.dashboard,
          ultima_actualizacion: response.data.ultima_actualizacion
        }
      };

    } catch (error) {
      const apiError = error as AxiosError<{ error?: string }>;
      this.logger.error(`Error obteniendo dashboard del semaforo:`, apiError.message);
      
      if (apiError.response?.status === 401) {
        throw new HttpException(
          'Token JWT inválido o expirado',
          HttpStatus.UNAUTHORIZED
        );
      }
      
      throw new HttpException(
        `Error obteniendo dashboard del semaforo: ${apiError.response?.data?.error || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * OBTENER EMAILS POR COLOR DEL SEMÁFORO
   */
  async getEmailsByTrafficLight(
    authHeader: string, 
    status: TrafficLightStatus, 
    cuentaId?: number,
    limit: number = 10
  ): Promise<OrchestratorEmailsByTrafficLight> {
    try {
      this.logger.log(`Obteniendo emails con estado ${status}`);

      const userId = this.extractUserIdFromJWT(authHeader);
      
      if (!userId) {
        throw new UnauthorizedException('Token JWT inválido');
      }

      // Construir parámetros de query
      const params: { limit?: number; cuentaId?: number } = { limit };
      if (cuentaId) {
        params.cuentaId = cuentaId;
      }

      const response: AxiosResponse<EmailsByTrafficLightResponse> = await axios.get(
        `${this.msEmailUrl}/emails/traffic-light/${status}`, 
        {
          params,
          headers: {
            'Authorization': authHeader
          }
        }
      );

      if (!response.data.success) {
        throw new HttpException(
          response.data.error || 'Error obteniendo emails por estado del semaforo',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      this.logger.log(`Obtenidos ${response.data.count} emails con estado ${status}`);
      
      return {
        success: true,
        source: 'orchestrator',
        status: status,
        data: {
          count: response.data.count,
          emails: response.data.emails
        }
      };

    } catch (error) {
      const apiError = error as AxiosError<{ error?: string }>;
      this.logger.error(`Error obteniendo emails por estado del semaforo:`, apiError.message);
      
      if (apiError.response?.status === 401) {
        throw new HttpException(
          'Token JWT inválido o expirado',
          HttpStatus.UNAUTHORIZED
        );
      }
      
      if (apiError.response?.status === 400) {
        throw new HttpException(
          'Estado del semaforo inválido',
          HttpStatus.BAD_REQUEST
        );
      }
      
      throw new HttpException(
        `Error obteniendo emails por estado: ${apiError.response?.data?.error || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * ACTUALIZAR SEMÁFOROS MANUALMENTE
   */
  async updateTrafficLights(authHeader: string): Promise<OrchestratorUpdateTrafficLights> {
    try {
      this.logger.log(`Actualizando semaforos de todos los emails`);

      const userId = this.extractUserIdFromJWT(authHeader);
      
      if (!userId) {
        throw new UnauthorizedException('Token JWT inválido');
      }

      const response: AxiosResponse<UpdateTrafficLightsResponse> = await axios.post(
        `${this.msEmailUrl}/emails/traffic-light/update`, 
        {}, // Body vacío
        {
          headers: {
            'Authorization': authHeader
          },
          timeout: 30000 // 30 segundos timeout para esta operación
        }
      );

      if (!response.data.success) {
        throw new HttpException(
          response.data.error || 'Error actualizando semaforos',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      this.logger.log(`Semáforos actualizados exitosamente: ${response.data.estadisticas?.actualizados} emails`);
      
      return {
        success: true,
        source: 'orchestrator',
        data: {
          message: response.data.message || 'Semáforos actualizados correctamente',
          estadisticas: response.data.estadisticas!
        }
      };

    } catch (error) {
      const apiError = error as AxiosError<{ error?: string }>;
      this.logger.error(`Error actualizando semaforos:`, apiError.message);
      
      if (apiError.response?.status === 401) {
        throw new HttpException(
          'Token JWT inválido o expirado',
          HttpStatus.UNAUTHORIZED
        );
      }
      
      if (apiError.code === 'ECONNABORTED') {
        throw new HttpException(
          'Timeout actualizando semaforos - la operación tomó demasiado tiempo',
          HttpStatus.REQUEST_TIMEOUT
        );
      }
      
      throw new HttpException(
        `Error actualizando semaforos: ${apiError.response?.data?.error || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
 * ELIMINAR EMAIL - Coordina con MS-Email para eliminar email
 */
async deleteEmail(
  emailId: string,
  authHeader: string
): Promise<{
  success: boolean;
  message?: string;
  emailId: string;
  previousStatus?: string;
  deletedFromGmail?: boolean;
  error?: string;
}> {
  try {
    this.logger.log(`Coordinando eliminación del email ${emailId}`);

    const userId = this.extractUserIdFromJWT(authHeader);
    
    if (!userId) {
      throw new UnauthorizedException('Token JWT inválido');
    }

    const response = await fetch(`${this.msEmailUrl}/emails/${emailId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      this.logger.error(`MS-Email error: ${response.status} - ${errorData}`);
      
      if (response.status === 404) {
        throw new HttpException('Email no encontrado en ninguna cuenta del usuario', HttpStatus.NOT_FOUND);
      } else if (response.status === 401) {
        throw new HttpException('Token expirado o inválido', HttpStatus.UNAUTHORIZED);
      } else {
        throw new HttpException('Error eliminando email', HttpStatus.BAD_REQUEST);
      }
    }

     // ✅ FIX: Tipar explícitamente la respuesta
    const result = await response.json() as {
      success: boolean;
      message?: string;
      emailId: string;
      previousStatus?: string;
      deletedFromGmail?: boolean;
      error?: string;
    };

    // Invalidar caches relacionados
    await this.invalidateEmailCaches(userId);

    this.logger.log(`Email eliminado exitosamente via MS-Email`);

    return result;

  } catch (error) {
    this.logger.error(`Error coordinando eliminación de email:`, error);
    throw error;
  }
}
}