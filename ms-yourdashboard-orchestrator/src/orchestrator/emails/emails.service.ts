import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse, AxiosError } from 'axios';
import { CacheService } from '../cache/cache.service';
import * as jwt from 'jsonwebtoken';
import {
  TokenResponse,
  EmailListResponse,
  EmailStats,
  EmailDetail,
  ReplyEmailRequest,
  ReplyEmailResponse,
} from './interfaces/emails.interfaces';
import {
  TrafficLightStatus,
  TrafficLightDashboardResponse,
  EmailsByTrafficLightResponse,
  UpdateTrafficLightsResponse,
  OrchestratorTrafficLightDashboard,
  OrchestratorEmailsByTrafficLight,
  OrchestratorUpdateTrafficLights,
} from './interfaces';
import { SendEmailDto } from './dto/send-email.dto';
import {
  OrchestratorSendEmailResponse,
  SendEmailResponse,
} from './dto/send-email-response.dto';

// 2️⃣ INTERFACE PARA MANEJO TIPADO DE ERRORES
interface ParsedEmailError {
  message: string;
  code: string;
}

// Interfaces específicas para evitar any
export interface SyncResponse {
  success: boolean;
  source: string;
  data: {
    success: boolean;
    message: string;
    stats: {
      cuenta_gmail_id: string;
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
  sub?: string;
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
    EMAILS: 300, // 5 minutos
    STATS: 600, // 10 minutos
    SEARCH: 180, // 3 minutos
    DETAIL: 900, // 15 minutos
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    this.msAuthUrl =
      this.configService.get<string>('MS_AUTH_URL') || 'http://localhost:3001';
    this.msEmailUrl =
      this.configService.get<string>('MS_EMAIL_URL') || 'http://localhost:3002';
  }

  /**
   * GUARDAR CONTENIDO COMPLETO DE EMAIL - Coordina con MS-Email para guardar offline
   */
  async saveEmailContent(
    authHeader: string,
    emailId: string,
  ): Promise<{
    success: boolean;
    source: string;
    data: {
      emailId: string;
      savedAt: string;
      contentSize: number;
      attachmentsCount: number;
      hasFullContent: boolean;
      wasAlreadySaved: boolean;
    };
  }> {
    try {
      this.logger.log(
        `Coordinando guardado de contenido completo para email ${emailId}`,
      );

      // 1️⃣ VALIDAR JWT (reutilizar método existente)
      const userId = this.extractUserIdFromJWT(authHeader);

      if (!userId) {
        throw new UnauthorizedException('Token JWT inválido');
      }

      // 2️⃣ LLAMAR AL MICROSERVICIO MS-EMAIL
      const response = await fetch(
        `${this.msEmailUrl}/emails/${emailId}/save-full-content`,
        {
          method: 'POST',
          headers: {
            Authorization: authHeader,
          },
        },
      );

      // 3️⃣ MANEJO DE ERRORES
      if (!response.ok) {
        const errorData = await response.text();
        this.logger.error(`MS-Email error: ${response.status} - ${errorData}`);

        if (response.status === 404) {
          throw new HttpException(
            'Email no encontrado o no pertenece al usuario',
            HttpStatus.NOT_FOUND,
          );
        } else if (response.status === 401) {
          throw new HttpException(
            'Token expirado o inválido',
            HttpStatus.UNAUTHORIZED,
          );
        } else {
          throw new HttpException(
            'Error guardando contenido del email',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // 4️⃣ PROCESAR RESPUESTA EXITOSA
      const result = (await response.json()) as {
        success: boolean;
        message: string;
        emailId: string;
        savedAt: string;
        contentSize: number;
        attachmentsCount: number;
        hasFullContent: boolean;
        wasAlreadySaved: boolean;
      };

      this.logger.log(
        `Contenido completo guardado exitosamente via MS-Email: ${result.contentSize} bytes`,
      );

      // 5️⃣ RETORNAR RESPUESTA ESTRUCTURADA (patrón orchestrator)
      return {
        success: true,
        source: 'orchestrator',
        data: {
          emailId: result.emailId,
          savedAt: result.savedAt,
          contentSize: result.contentSize,
          attachmentsCount: result.attachmentsCount,
          hasFullContent: result.hasFullContent,
          wasAlreadySaved: result.wasAlreadySaved,
        },
      };
    } catch (error) {
      this.logger.error(`Error coordinando guardado de contenido:`, error);
      throw error;
    }
  }
  /**
   * Obtener token válido del ms-auth usando cuentaGmailId
   */
  private async getValidTokenForGmailAccount(
    cuentaGmailId: string,
  ): Promise<string> {
    try {
      this.logger.debug(`Solicitando token para cuenta Gmail ${cuentaGmailId}`);

      const response: AxiosResponse<TokenResponse> = await axios.get(
        `${this.msAuthUrl}/tokens/gmail/${cuentaGmailId}`,
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
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * RESPONDER A UN EMAIL - Coordina con MS-Email para enviar respuesta
   */
  async replyToEmail(
    emailId: string,
    replyData: ReplyEmailRequest,
    authHeader: string,
  ): Promise<ReplyEmailResponse> {
    try {
      this.logger.log(`Coordinando respuesta al email ${emailId}`);

      const emailServiceUrl = `${this.msEmailUrl}/emails/${emailId}/reply`;

      const response = await fetch(emailServiceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(replyData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        this.logger.error(`MS-Email error: ${response.status} - ${errorData}`);

        if (response.status === 404) {
          throw new HttpException(
            'Email no encontrado en ninguna cuenta del usuario',
            HttpStatus.NOT_FOUND,
          );
        } else if (response.status === 401) {
          throw new HttpException(
            'Token expirado o inválido',
            HttpStatus.UNAUTHORIZED,
          );
        } else {
          throw new HttpException(
            'Error enviando respuesta al email',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const result = (await response.json()) as ReplyEmailResponse;

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
  async invalidateEmailCaches(userId: string): Promise<void> {
    try {
      const cacheKeys = [
        `emails_inbox_${userId}`,
        `emails_stats_${userId}`,
        `emails_search_${userId}`,
        'emails_all_accounts',
      ];

      await Promise.allSettled(
        cacheKeys.map((key) => this.cacheService.delete(key)),
      );

      this.logger.debug(`Cache invalidado para usuario ${userId}`);
    } catch (error) {
      this.logger.warn('Error invalidando cache:', error);
    }
  }

  /**
   * Extraer User ID del JWT token - MÉTODO PÚBLICO
   */
  public extractUserIdFromJWT(authHeader: string): string | null {
    try {
      const token = authHeader.replace('Bearer ', '');

      const jwtSecret = this.configService.get<string>('JWT_SECRET');

      if (!jwtSecret) {
        this.logger.error('JWT_SECRET no configurado');
        return null;
      }

      // Usar la interface para tipado
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

      if (!decoded.sub || typeof decoded.sub !== 'string') {
        this.logger.warn('Token JWT válido pero sin userId válido');
        return null;
      }

      return decoded.sub;
    } catch (error) {
      this.logger.error('JWT inválido:', error.message);
      return null;
    }
  }

  /**
   * Sincronizar emails manualmente
   */
  async syncEmails(
    cuentaGmailId: string,
    maxEmails: number = 100,
  ): Promise<SyncResponse> {
    try {
      this.logger.log(
        `Iniciando sync manual para cuenta Gmail ${cuentaGmailId}`,
      );

      const accessToken =
        await this.getValidTokenForGmailAccount(cuentaGmailId);

      const response: AxiosResponse<{
        success: boolean;
        message: string;
        stats: any;
      }> = await axios.post(`${this.msEmailUrl}/emails/sync`, null, {
        params: { cuentaGmailId, maxEmails },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 120000,
      });

      await this.clearGmailAccountCache(cuentaGmailId);

      this.logger.log(
        `Sync manual completado para cuenta Gmail ${cuentaGmailId}`,
      );

      return {
        success: true,
        source: 'orchestrator',
        data: response.data,
      };
    } catch (error) {
      const apiError = error as AxiosError<ErrorResponse>;
      this.logger.error(`Error en sync manual:`, apiError.message);
      throw new HttpException(
        `Error sincronizando emails: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Sincronización incremental
   */
  async syncIncremental(
    cuentaGmailId: string,
    maxEmails: number = 30,
  ): Promise<SyncResponse> {
    try {
      this.logger.log(
        `Iniciando sync incremental para cuenta Gmail ${cuentaGmailId}`,
      );

      const accessToken =
        await this.getValidTokenForGmailAccount(cuentaGmailId);

      const response: AxiosResponse<{
        success: boolean;
        message: string;
        stats: any;
      }> = await axios.post(
        `${this.msEmailUrl}/emails/sync/incremental`,
        null,
        {
          params: { cuentaGmailId, maxEmails },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      await this.clearGmailAccountCache(cuentaGmailId);

      this.logger.log(
        `Sync incremental completado para cuenta Gmail ${cuentaGmailId}`,
      );

      return {
        success: true,
        source: 'orchestrator',
        data: response.data,
      };
    } catch (error) {
      const apiError = error as AxiosError<ErrorResponse>;
      this.logger.error(`Error en sync incremental:`, apiError.message);
      throw new HttpException(
        `Error en sincronización incremental: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
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
        this.cacheService.deletePattern(`detail:${cuentaGmailId}`),
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
      this.logger.log(
        `Obteniendo inbox para cuenta Gmail ${cuentaGmailId} - Página ${page}`,
      );

      const cacheKey = this.cacheService.generateKey('inbox', cuentaGmailId, {
        page,
        limit,
      });
      const cachedResult =
        await this.cacheService.get<EmailListResponse>(cacheKey);

      if (cachedResult) {
        this.logger.log(
          `CACHE HIT - Inbox desde cache para cuenta Gmail ${cuentaGmailId}`,
        );
        return {
          success: true,
          source: 'orchestrator-cache',
          data: cachedResult,
        };
      }

      this.logger.log(
        `CACHE MISS - Obteniendo inbox desde API para cuenta Gmail ${cuentaGmailId}`,
      );

      const accessToken =
        await this.getValidTokenForGmailAccount(cuentaGmailId);

      const response: AxiosResponse<EmailListResponse> = await axios.get(
        `${this.msEmailUrl}/emails/inbox`,
        {
          params: { cuentaGmailId, page, limit },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      await this.cacheService.set(
        cacheKey,
        response.data,
        this.CACHE_TTL.EMAILS,
      );

      this.logger.log(
        `Inbox obtenido y guardado en cache para cuenta Gmail ${cuentaGmailId}`,
      );

      return {
        success: true,
        source: 'orchestrator-api',
        data: response.data,
      };
    } catch (error) {
      const apiError = error as AxiosError<ErrorResponse>;
      this.logger.error(`Error obteniendo inbox:`, apiError.message);
      throw new HttpException(
        `Error obteniendo inbox: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
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
    limit: number = 10,
  ) {
    try {
      this.logger.log(
        `Buscando emails para cuenta Gmail ${cuentaGmailId}: "${searchTerm}"`,
      );

      const cacheKey = this.cacheService.generateKey('search', cuentaGmailId, {
        searchTerm: searchTerm.toLowerCase().trim(),
        page,
        limit,
      });

      const cachedResult =
        await this.cacheService.get<EmailListResponse>(cacheKey);

      if (cachedResult) {
        this.logger.log(
          `CACHE HIT - Búsqueda desde cache para cuenta Gmail ${cuentaGmailId}`,
        );
        return {
          success: true,
          source: 'orchestrator-cache',
          searchTerm,
          data: cachedResult,
        };
      }

      this.logger.log(
        `CACHE MISS - Buscando desde API para cuenta Gmail ${cuentaGmailId}`,
      );

      const accessToken =
        await this.getValidTokenForGmailAccount(cuentaGmailId);

      const response: AxiosResponse<EmailListResponse> = await axios.get(
        `${this.msEmailUrl}/emails/search`,
        {
          params: { cuentaGmailId, q: searchTerm, page, limit },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      await this.cacheService.set(
        cacheKey,
        response.data,
        this.CACHE_TTL.SEARCH,
      );

      this.logger.log(`Búsqueda completada y guardada en cache`);

      return {
        success: true,
        source: 'orchestrator-api',
        searchTerm,
        data: response.data,
      };
    } catch (error) {
      const apiError = error as AxiosError<ErrorResponse>;
      this.logger.error(`Error buscando emails:`, apiError.message);
      throw new HttpException(
        `Error buscando emails: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
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
    limit: number = 10,
  ) {
    try {
      this.logger.log(
        `BÚSQUEDA GLOBAL para usuario ${userId}: "${searchTerm}"`,
      );

      // ✅ VALIDACIÓN CORREGIDA - Sin casting
      if (!userId || userId.trim() === '') {
        throw new BadRequestException(
          `userId debe ser un valor válido: ${userId}`,
        );
      }

      const cacheKey = this.cacheService.generateKey('global-search', userId, {
        searchTerm: searchTerm.toLowerCase().trim(),
        page,
        limit,
      });

      const cachedResult = await this.cacheService.get<
        EmailListResponse & {
          accountsSearched?: string[];
        }
      >(cacheKey);

      if (cachedResult) {
        this.logger.log(
          `CACHE HIT - Búsqueda global desde cache para usuario ${userId}`,
        );
        return {
          success: true,
          source: 'orchestrator-cache',
          searchTerm,
          accountsSearched: cachedResult.accountsSearched || [],
          data: cachedResult,
        };
      }

      this.logger.log(
        `CACHE MISS - Búsqueda global desde API para usuario ${userId}`,
      );

      const response: AxiosResponse<
        EmailListResponse & {
          accountsSearched?: string[];
        }
      > = await axios.get(`${this.msEmailUrl}/emails/search-all-accounts`, {
        params: { userId, q: searchTerm, page, limit },
        headers: {
          'X-User-ID': userId,
        },
      });

      await this.cacheService.set(
        cacheKey,
        response.data,
        this.CACHE_TTL.SEARCH,
      );

      this.logger.log(`Búsqueda global completada y guardada en cache`);
      this.logger.log(
        `Resultados: ${response.data.total} emails de ${response.data.accountsSearched?.length || 0} cuentas`,
      );

      return {
        success: true,
        source: 'orchestrator-api',
        searchTerm,
        accountsSearched: response.data.accountsSearched || [],
        data: response.data,
      };
    } catch (error) {
      const apiError = error as AxiosError<ErrorResponse>;
      this.logger.error(`Error en búsqueda global:`, apiError.message);

      if (apiError.response?.status === 404) {
        throw new HttpException(
          `Usuario ${userId} no tiene cuentas Gmail conectadas`,
          HttpStatus.NOT_FOUND,
        );
      }

      if (apiError.response?.status === 401) {
        throw new HttpException(
          `Error de autenticación para usuario ${userId}`,
          HttpStatus.UNAUTHORIZED,
        );
      }

      throw new HttpException(
        `Error en búsqueda global: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Inbox unificado de TODAS las cuentas Gmail del usuario - CON CACHE
   */
  async getInboxAllAccounts(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    try {
      this.logger.log(
        `INBOX UNIFICADO para usuario ${userId} - Página ${page}`,
      );

      // ✅ VALIDACIÓN CORREGIDA - Sin casting
      if (!userId || userId.trim() === '') {
        throw new BadRequestException(
          `userId debe ser un valor válido: ${userId}`,
        );
      }

      const cacheKey = this.cacheService.generateKey('inbox-unified', userId, {
        page,
        limit,
      });

      const cachedResult = await this.cacheService.get<
        EmailListResponse & {
          accountsLoaded?: string[];
        }
      >(cacheKey);

      if (cachedResult) {
        this.logger.log(
          `CACHE HIT - Inbox unificado desde cache para usuario ${userId}`,
        );
        return {
          success: true,
          source: 'orchestrator-cache',
          accountsLoaded: cachedResult.accountsLoaded || [],
          data: cachedResult,
        };
      }

      this.logger.log(
        `CACHE MISS - Inbox unificado desde API para usuario ${userId}`,
      );

      const response: AxiosResponse<
        EmailListResponse & {
          accountsLoaded?: string[];
        }
      > = await axios.get(`${this.msEmailUrl}/emails/inbox-all-accounts`, {
        params: { userId, page, limit },
        headers: {
          'X-User-ID': userId,
        },
      });

      await this.cacheService.set(
        cacheKey,
        response.data,
        this.CACHE_TTL.EMAILS,
      );

      this.logger.log(`Inbox unificado completado y guardado en cache`);
      this.logger.log(
        `Resultados: ${response.data.total} emails de ${response.data.accountsLoaded?.length || 0} cuentas`,
      );

      return {
        success: true,
        source: 'orchestrator-api',
        accountsLoaded: response.data.accountsLoaded || [],
        data: response.data,
      };
    } catch (error) {
      const apiError = error as AxiosError<ErrorResponse>;
      this.logger.error(`Error en inbox unificado:`, apiError.message);

      if (apiError.response?.status === 404) {
        throw new HttpException(
          `Usuario ${userId} no tiene cuentas Gmail conectadas`,
          HttpStatus.NOT_FOUND,
        );
      }

      if (apiError.response?.status === 401) {
        throw new HttpException(
          `Error de autenticación para usuario ${userId}`,
          HttpStatus.UNAUTHORIZED,
        );
      }

      throw new HttpException(
        `Error en inbox unificado: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtener estadísticas de emails - CON CACHE
   */
  async getEmailStats(cuentaGmailId: string) {
    try {
      this.logger.log(
        `Obteniendo estadísticas para cuenta Gmail ${cuentaGmailId}`,
      );

      const cacheKey = this.cacheService.generateKey('stats', cuentaGmailId);
      const cachedResult = await this.cacheService.get<EmailStats>(cacheKey);

      if (cachedResult) {
        this.logger.log(
          `CACHE HIT - Stats desde cache para cuenta Gmail ${cuentaGmailId}`,
        );
        return {
          success: true,
          source: 'orchestrator-cache',
          data: cachedResult,
        };
      }

      this.logger.log(`CACHE MISS - Obteniendo stats desde API`);

      const accessToken =
        await this.getValidTokenForGmailAccount(cuentaGmailId);

      const response: AxiosResponse<EmailStats> = await axios.get(
        `${this.msEmailUrl}/emails/stats`,
        {
          params: { cuentaGmailId },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      await this.cacheService.set(
        cacheKey,
        response.data,
        this.CACHE_TTL.STATS,
      );

      this.logger.log(`Stats obtenidas y guardadas en cache`);

      return {
        success: true,
        source: 'orchestrator-api',
        data: response.data,
      };
    } catch (error) {
      const apiError = error as AxiosError<ErrorResponse>;
      this.logger.error(`Error obteniendo estadísticas:`, apiError.message);
      throw new HttpException(
        `Error obteniendo estadísticas: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtener email específico - CON CACHE
   */
  async getEmailByIdWithJWT(authHeader: string, emailId: string) {
    try {
      this.logger.log(
        `Obteniendo email ${emailId} con JWT token via orchestrator`,
      );

      const userId = this.extractUserIdFromJWT(authHeader);

      if (!userId) {
        throw new UnauthorizedException('Token JWT inválido');
      }

      const cacheKey = this.cacheService.generateKey(
        'email-detail',
        userId.toString(),
        { emailId },
      );
      const cachedResult = await this.cacheService.get<EmailDetail>(cacheKey);

      if (cachedResult) {
        this.logger.log(`CACHE HIT - Email detail desde cache`);
        return {
          success: true,
          source: 'orchestrator-cache',
          data: cachedResult,
        };
      }

      this.logger.log(`CACHE MISS - Obteniendo email desde MS-Email`);

      const response: AxiosResponse<EmailDetail> = await axios.get(
        `${this.msEmailUrl}/emails/${emailId}`,
        {
          headers: {
            Authorization: authHeader,
          },
        },
      );

      await this.cacheService.set(
        cacheKey,
        response.data,
        this.CACHE_TTL.DETAIL,
      );

      this.logger.log(`Email obtenido y guardado en cache`);

      return {
        success: true,
        source: 'orchestrator-api',
        data: response.data,
      };
    } catch (error) {
      const apiError = error as AxiosError<ErrorResponse>;
      this.logger.error(`Error obteniendo email con JWT:`, apiError.message);

      if (apiError.response?.status === 404) {
        throw new HttpException(
          `Email ${emailId} no encontrado`,
          HttpStatus.NOT_FOUND,
        );
      }

      if (apiError.response?.status === 401) {
        throw new HttpException(
          'Token JWT inválido o expirado',
          HttpStatus.UNAUTHORIZED,
        );
      }

      throw new HttpException(
        `Error obteniendo email: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==============================
  // MÉTODOS DEL SISTEMA SEMÁFORO
  // ==============================

  /**
   * DASHBOARD DEL SEMÁFORO - Estadísticas por cuenta Gmail
   */
  async getTrafficLightDashboard(
    authHeader: string,
  ): Promise<OrchestratorTrafficLightDashboard> {
    try {
      this.logger.log(`Obteniendo dashboard del semaforo`);

      const userId = this.extractUserIdFromJWT(authHeader);

      if (!userId) {
        throw new UnauthorizedException('Token JWT inválido');
      }

      const response: AxiosResponse<TrafficLightDashboardResponse> =
        await axios.get(`${this.msEmailUrl}/emails/traffic-light/dashboard`, {
          headers: {
            Authorization: authHeader,
          },
        });

      if (!response.data.success) {
        throw new HttpException(
          response.data.error || 'Error obteniendo dashboard del semaforo',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      this.logger.log(`Dashboard del semaforo obtenido exitosamente`);

      return {
        success: true,
        source: 'orchestrator',
        data: {
          dashboard: response.data.dashboard,
          ultima_actualizacion: response.data.ultima_actualizacion,
        },
      };
    } catch (error) {
      const apiError = error as AxiosError<{ error?: string }>;
      this.logger.error(
        `Error obteniendo dashboard del semaforo:`,
        apiError.message,
      );

      if (apiError.response?.status === 401) {
        throw new HttpException(
          'Token JWT inválido o expirado',
          HttpStatus.UNAUTHORIZED,
        );
      }

      throw new HttpException(
        `Error obteniendo dashboard del semaforo: ${apiError.response?.data?.error || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * OBTENER EMAILS POR COLOR DEL SEMÁFORO
   */
  async getEmailsByTrafficLight(
    authHeader: string,
    status: TrafficLightStatus,
    cuentaId?: string,
    limit: number = 10,
  ): Promise<OrchestratorEmailsByTrafficLight> {
    try {
      this.logger.log(`Obteniendo emails con estado ${status}`);

      const userId = this.extractUserIdFromJWT(authHeader);

      if (!userId) {
        throw new UnauthorizedException('Token JWT inválido');
      }

      // Construir parámetros de query
      const params: { limit?: number; cuentaId?: string } = { limit };
      if (cuentaId) {
        params.cuentaId = cuentaId;
      }

      const response: AxiosResponse<EmailsByTrafficLightResponse> =
        await axios.get(`${this.msEmailUrl}/emails/traffic-light/${status}`, {
          params,
          headers: {
            Authorization: authHeader,
          },
        });

      if (!response.data.success) {
        throw new HttpException(
          response.data.error ||
            'Error obteniendo emails por estado del semaforo',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      this.logger.log(
        `Obtenidos ${response.data.count} emails con estado ${status}`,
      );

      return {
        success: true,
        source: 'orchestrator',
        status: status,
        data: {
          count: response.data.count,
          emails: response.data.emails,
        },
      };
    } catch (error) {
      const apiError = error as AxiosError<{ error?: string }>;
      this.logger.error(
        `Error obteniendo emails por estado del semaforo:`,
        apiError.message,
      );

      if (apiError.response?.status === 401) {
        throw new HttpException(
          'Token JWT inválido o expirado',
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (apiError.response?.status === 400) {
        throw new HttpException(
          'Estado del semaforo inválido',
          HttpStatus.BAD_REQUEST,
        );
      }

      throw new HttpException(
        `Error obteniendo emails por estado: ${apiError.response?.data?.error || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * ACTUALIZAR SEMÁFOROS MANUALMENTE
   */
  async updateTrafficLights(
    authHeader: string,
  ): Promise<OrchestratorUpdateTrafficLights> {
    try {
      this.logger.log(`Actualizando semaforos de todos los emails`);

      const userId = this.extractUserIdFromJWT(authHeader);

      if (!userId) {
        throw new UnauthorizedException('Token JWT inválido');
      }

      const response: AxiosResponse<UpdateTrafficLightsResponse> =
        await axios.post(
          `${this.msEmailUrl}/emails/traffic-light/update`,
          {}, // Body vacío
          {
            headers: {
              Authorization: authHeader,
            },
            timeout: 30000, // 30 segundos timeout para esta operación
          },
        );

      if (!response.data.success) {
        throw new HttpException(
          response.data.error || 'Error actualizando semaforos',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      this.logger.log(
        `Semáforos actualizados exitosamente: ${response.data.estadisticas?.actualizados} emails`,
      );

      return {
        success: true,
        source: 'orchestrator',
        data: {
          message:
            response.data.message || 'Semáforos actualizados correctamente',
          estadisticas: response.data.estadisticas!,
        },
      };
    } catch (error) {
      const apiError = error as AxiosError<{ error?: string }>;
      this.logger.error(`Error actualizando semaforos:`, apiError.message);

      if (apiError.response?.status === 401) {
        throw new HttpException(
          'Token JWT inválido o expirado',
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (apiError.code === 'ECONNABORTED') {
        throw new HttpException(
          'Timeout actualizando semaforos - la operación tomó demasiado tiempo',
          HttpStatus.REQUEST_TIMEOUT,
        );
      }

      throw new HttpException(
        `Error actualizando semaforos: ${apiError.response?.data?.error || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  // ==============================
  // FIN MÉTODOS DEL SISTEMA SEMÁFORO
  // ==============================

  // 3️⃣ MÉTODO sendEmail CORREGIDO (reemplazar el existente)
  /**
   * ENVIAR EMAIL NUEVO - Coordina con MS-Email para envío
   */

  async sendEmail(
    authHeader: string,
    sendEmailData: SendEmailDto,
  ): Promise<OrchestratorSendEmailResponse> {
    let userId: string;

    try {
      // 1️⃣ VALIDACIONES INICIALES
      userId = this.validateJWTForSend(authHeader);
      this.validateSendEmailData(sendEmailData);

      // 2️⃣ LOGGING DE REQUEST
      this.logSendEmailRequest(sendEmailData, userId);

      // 3️⃣ LLAMADA AL MICROSERVICIO MS-EMAIL
      const response = await fetch(`${this.msEmailUrl}/emails/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(sendEmailData),
        // Timeout más largo para emails con attachments grandes
        signal: AbortSignal.timeout(60000), // 60 segundos
      });

      // 4️⃣ MANEJO DE ERRORES DE MS-EMAIL
      if (!response.ok) {
        const errorData = await response.text();
        const { message, code } = this.parseEmailServiceError(
          errorData,
          response.status,
        );

        this.logger.error(`MS-Email error [${code}]: ${message}`);

        // Mapear códigos HTTP a excepciones específicas
        const statusMap: Record<number, number> = {
          400: HttpStatus.BAD_REQUEST,
          401: HttpStatus.UNAUTHORIZED,
          403: HttpStatus.FORBIDDEN,
          429: HttpStatus.TOO_MANY_REQUESTS,
          503: HttpStatus.SERVICE_UNAVAILABLE,
        };

        throw new HttpException(
          message,
          statusMap[response.status] || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // 5️⃣ PROCESAR RESPUESTA EXITOSA
      const result = (await response.json()) as SendEmailResponse;

      // 6️⃣ LOGGING DE ÉXITO
      this.logSendEmailSuccess(result, userId);

      // 7️⃣ INVALIDAR CACHES (usar método existente)
      await this.invalidateEmailCaches(userId);

      return {
        success: true,
        source: 'orchestrator',
        data: result,
      };
    } catch (error) {
      this.logger.error(`Error coordinando envío de email:`, error);

      // Re-throw HttpExceptions específicas
      if (error instanceof HttpException) {
        throw error;
      }

      // Manejo tipado de errores
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new HttpException(
          'Error de conexión con el servicio de email',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new HttpException(
          'Timeout enviando email - el email era demasiado grande o el servicio está ocupado',
          HttpStatus.REQUEST_TIMEOUT,
        );
      }

      // Error genérico
      throw new HttpException(
        'Error interno enviando email',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 4️⃣ MÉTODOS HELPER PRIVADOS (agregar al final de la clase)

  /**
   * VALIDAR DATOS DE ENVÍO - Validaciones adicionales del orchestrator
   */
  private validateSendEmailData(sendEmailData: SendEmailDto): void {
    // Validar que no tenga destinatarios duplicados
    const allRecipients = [
      ...sendEmailData.to,
      ...(sendEmailData.cc || []),
      ...(sendEmailData.bcc || []),
    ];

    const uniqueRecipients = new Set(
      allRecipients.map((email) => email.toLowerCase()),
    );
    if (uniqueRecipients.size !== allRecipients.length) {
      throw new BadRequestException(
        'Hay destinatarios duplicados en TO, CC o BCC',
      );
    }

    // Validar límite total de destinatarios
    const totalRecipients = allRecipients.length;
    if (totalRecipients > 100) {
      throw new BadRequestException(
        `Demasiados destinatarios: ${totalRecipients}. Límite: 100`,
      );
    }

    // Validar que el remitente no esté en los destinatarios
    const fromEmail = sendEmailData.from.toLowerCase();
    if (allRecipients.some((email) => email.toLowerCase() === fromEmail)) {
      throw new BadRequestException('No puedes enviarte un email a ti mismo');
    }

    // Validar tamaño estimado de attachments
    if (sendEmailData.attachments?.length) {
      const totalAttachmentSize = sendEmailData.attachments.reduce(
        (total, attachment) => {
          // Estimar tamaño base64 decodificado
          return total + (attachment.content.length * 3) / 4;
        },
        0,
      );

      const MAX_EMAIL_SIZE = 25 * 1024 * 1024; // 25MB límite de Gmail
      if (totalAttachmentSize > MAX_EMAIL_SIZE) {
        const sizeMB = Math.round(totalAttachmentSize / 1024 / 1024);
        throw new BadRequestException(
          `Attachments demasiado grandes: ${sizeMB}MB. Límite: 25MB total`,
        );
      }
    }
  }

  /**
   * PARSEAR ERRORES ESPECÍFICOS DE MS-EMAIL CON TIPADO SEGURO
   */
  private parseEmailServiceError(
    errorData: string,
    statusCode: number,
  ): ParsedEmailError {
    try {
      const errorObj = JSON.parse(errorData) as {
        error?: string;
        message?: string;
      };

      // Mapear códigos de error específicos de ms-email
      if (errorObj.error === 'INVALID_RECIPIENTS') {
        return {
          message: 'Uno o más destinatarios tienen formato de email inválido',
          code: 'INVALID_RECIPIENTS',
        };
      }

      if (errorObj.error === 'INVALID_ACCOUNT') {
        return {
          message:
            'La cuenta Gmail especificada no pertenece al usuario o no está autorizada',
          code: 'ACCOUNT_NOT_AUTHORIZED',
        };
      }

      if (errorObj.error === 'QUOTA_EXCEEDED') {
        return {
          message: 'Límite diario de envío de Gmail excedido. Intenta mañana.',
          code: 'QUOTA_EXCEEDED',
        };
      }

      if (errorObj.error === 'EMAIL_TOO_LARGE') {
        return {
          message: 'El email es demasiado grande (máximo 25MB)',
          code: 'EMAIL_TOO_LARGE',
        };
      }

      // Error genérico con mensaje del service
      return {
        message: errorObj.message || 'Error enviando email',
        code: errorObj.error || 'SEND_FAILED',
      };
    } catch {
      // Si no se puede parsear, usar mensajes por código de estado
      switch (statusCode) {
        case 400:
          return { message: 'Datos del email inválidos', code: 'INVALID_DATA' };
        case 401:
          return {
            message: 'Token JWT inválido o expirado',
            code: 'TOKEN_EXPIRED',
          };
        case 403:
          return {
            message: 'Cuenta Gmail no autorizada',
            code: 'ACCOUNT_NOT_AUTHORIZED',
          };
        case 429:
          return {
            message: 'Límite de envío excedido',
            code: 'QUOTA_EXCEEDED',
          };
        case 503:
          return {
            message: 'Servicio temporalmente no disponible',
            code: 'SERVICE_UNAVAILABLE',
          };
        default:
          return {
            message: 'Error interno enviando email',
            code: 'SEND_FAILED',
          };
      }
    }
  }

  /**
   * LOGGING DETALLADO PARA DEBUGGING
   */
  private logSendEmailRequest(
    sendEmailData: SendEmailDto,
    userId: string,
  ): void {
    const logData = {
      userId,
      from: sendEmailData.from,
      toCount: sendEmailData.to.length,
      ccCount: sendEmailData.cc?.length || 0,
      bccCount: sendEmailData.bcc?.length || 0,
      subject: sendEmailData.subject.substring(0, 50) + '...',
      priority: sendEmailData.priority || 'normal',
      hasHtml: !!sendEmailData.bodyHtml,
      attachmentCount: sendEmailData.attachments?.length || 0,
      hasReadReceipt: !!sendEmailData.requestReadReceipt,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(
      `📤 SEND EMAIL REQUEST: ${JSON.stringify(logData, null, 2)}`,
    );
  }

  /**
   * LOGGING DETALLADO PARA RESPUESTA EXITOSA
   */
  private logSendEmailSuccess(result: SendEmailResponse, userId: string): void {
    const logData = {
      userId,
      messageId: result.messageId,
      threadId: result.threadId,
      from: result.fromEmail,
      toCount: result.toEmails.length,
      hasAttachments: result.hasAttachments,
      sizeEstimate: result.sizeEstimate
        ? `${Math.round(result.sizeEstimate / 1024)}KB`
        : 'unknown',
      sentAt: result.sentAt,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(
      `✅ SEND EMAIL SUCCESS: ${JSON.stringify(logData, null, 2)}`,
    );
  }

  /**
   * VALIDAR TOKEN JWT ESPECÍFICAMENTE PARA SEND
   */
  private validateJWTForSend(authHeader: string): string {
    if (!authHeader) {
      throw new UnauthorizedException(
        'Authorization header requerido para enviar emails',
      );
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token JWT debe usar formato Bearer');
    }

    const userId = this.extractUserIdFromJWT(authHeader);

    if (!userId) {
      throw new UnauthorizedException('Token JWT inválido o expirado');
    }

    return userId;
  }

  /**
   * ELIMINAR EMAIL - Coordina con MS-Email para eliminar email
   */
  async deleteEmail(
    emailId: string,
    authHeader: string,
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
          Authorization: authHeader,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        this.logger.error(`MS-Email error: ${response.status} - ${errorData}`);

        if (response.status === 404) {
          throw new HttpException(
            'Email no encontrado en ninguna cuenta del usuario',
            HttpStatus.NOT_FOUND,
          );
        } else if (response.status === 401) {
          throw new HttpException(
            'Token expirado o inválido',
            HttpStatus.UNAUTHORIZED,
          );
        } else {
          throw new HttpException(
            'Error eliminando email',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // ✅ FIX: Tipar explícitamente la respuesta
      const result = (await response.json()) as {
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
