import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse, AxiosError } from 'axios';
import { CacheService } from '../cache/cache.service';
import { 
  TokenResponse, 
  EmailListResponse, 
  EmailStats, 
  EmailDetail,
} from './interfaces/emails.interfaces';

// 🎯 INTERFACE PARA SYNC RESPONSE
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

// 🎯 INTERFACE PARA ERROR RESPONSE
interface ErrorResponse {
  message: string;
}

@Injectable()
export class EmailsOrchestratorService {
  private readonly logger = new Logger(EmailsOrchestratorService.name);
  private readonly msAuthUrl: string;
  private readonly msEmailUrl: string;
  
  // TTL (Time To Live) para diferentes tipos de cache
  private readonly CACHE_TTL = {
    EMAILS: 300,     // 5 minutos - emails cambian poco
    STATS: 600,      // 10 minutos - stats cambian menos
    SEARCH: 180,     // 3 minutos - búsquedas pueden cambiar
    DETAIL: 900      // 15 minutos - email específico casi no cambia
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService
  ) {
    this.msAuthUrl = this.configService.get<string>('MS_AUTH_URL') || 'http://localhost:3001';
    this.msEmailUrl = this.configService.get<string>('MS_EMAIL_URL') || 'http://localhost:3002';
  }

  /**
   * 🔑 Obtener token válido del ms-auth usando cuentaGmailId (SIN CACHE - siempre fresco)
   * 🎯 ARREGLADO: Usa el endpoint correcto para cuentaGmailId
   */
  private async getValidTokenForGmailAccount(cuentaGmailId: string): Promise<string> {
    try {
      this.logger.debug(`🔑 Solicitando token para cuenta Gmail ${cuentaGmailId}`);
      
      // 🎯 USAR EL ENDPOINT CORRECTO: /tokens/gmail/:cuentaGmailId
      const response: AxiosResponse<TokenResponse> = await axios.get(
        `${this.msAuthUrl}/tokens/gmail/${cuentaGmailId}`
      );
      
      if (!response.data.success) {
        throw new Error('No se pudo obtener token válido');
      }

      this.logger.debug(`✅ Token obtenido para cuenta Gmail ${cuentaGmailId}`);
      return response.data.accessToken;

    } catch (error) {
      const apiError = error as AxiosError<ErrorResponse>;
      this.logger.error(`❌ Error obteniendo token:`, apiError.message);
      throw new HttpException(
        `Error obteniendo token para cuenta Gmail: ${apiError.message}`,
        HttpStatus.UNAUTHORIZED
      );
    }
  }

  /**
   * 🔄 Sincronizar emails manualmente
   */
  async syncEmails(cuentaGmailId: string, maxEmails: number = 100): Promise<SyncResponse> {
    try {
      this.logger.log(`🔄 Iniciando sync manual para cuenta Gmail ${cuentaGmailId}`);

      // 1️⃣ OBTENER TOKEN
      const accessToken = await this.getValidTokenForGmailAccount(cuentaGmailId);
      
      // 2️⃣ LLAMAR MS-EMAIL
      const response: AxiosResponse<{ success: boolean; message: string; stats: any }> = await axios.post(
        `${this.msEmailUrl}/emails/sync`, 
        null, 
        {
          params: { cuentaGmailId, maxEmails },
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      // 3️⃣ LIMPIAR CACHE DESPUÉS DEL SYNC
      await this.clearGmailAccountCache(cuentaGmailId);
      
      this.logger.log(`✅ Sync manual completado para cuenta Gmail ${cuentaGmailId}`);
      
      return {
        success: true,
        source: 'orchestrator',
        data: response.data
      };

    } catch (error) {
      const apiError = error as AxiosError<ErrorResponse>;
      this.logger.error(`❌ Error en sync manual:`, apiError.message);
      throw new HttpException(
        `Error sincronizando emails: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 🔄 Sincronización incremental
   */
  async syncIncremental(cuentaGmailId: string, maxEmails: number = 30): Promise<SyncResponse> {
    try {
      this.logger.log(`🔄 Iniciando sync incremental para cuenta Gmail ${cuentaGmailId}`);

      // 1️⃣ OBTENER TOKEN
      const accessToken = await this.getValidTokenForGmailAccount(cuentaGmailId);
      
      // 2️⃣ LLAMAR MS-EMAIL
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

      // 3️⃣ LIMPIAR CACHE DESPUÉS DEL SYNC
      await this.clearGmailAccountCache(cuentaGmailId);
      
      this.logger.log(`✅ Sync incremental completado para cuenta Gmail ${cuentaGmailId}`);
      
      return {
        success: true,
        source: 'orchestrator',
        data: response.data
      };

    } catch (error) {
      const apiError = error as AxiosError<ErrorResponse>;
      this.logger.error(`❌ Error en sync incremental:`, apiError.message);
      throw new HttpException(
        `Error en sincronización incremental: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 📧 Obtener inbox del usuario - ⚡ CON CACHE
   */
  async getInbox(cuentaGmailId: string, page: number = 1, limit: number = 10) {
    try {
      this.logger.log(`📧 Obteniendo inbox para cuenta Gmail ${cuentaGmailId} - Página ${page}`);

      // 1️⃣ VERIFICAR CACHE PRIMERO
      const cacheKey = this.cacheService.generateKey('inbox', cuentaGmailId, { page, limit });
      const cachedResult = await this.cacheService.get<EmailListResponse>(cacheKey);
      
      if (cachedResult) {
        this.logger.log(`⚡ CACHE HIT - Inbox desde cache para cuenta Gmail ${cuentaGmailId}`);
        return {
          success: true,
          source: 'orchestrator-cache',
          data: cachedResult
        };
      }

      // 2️⃣ SI NO HAY CACHE → LLAMAR API
      this.logger.log(`📡 CACHE MISS - Obteniendo inbox desde API para cuenta Gmail ${cuentaGmailId}`);
      
      const accessToken = await this.getValidTokenForGmailAccount(cuentaGmailId);
      // y aca el orchetator llama al service real de emails: GET http://localhost:3002/emails/inbox?cuentaGmailId=4&page=1&limit=10
      // Llamar al microservicio de emails para obtener la bandeja de entrada
      const response: AxiosResponse<EmailListResponse> = await axios.get(`${this.msEmailUrl}/emails/inbox`, {
        params: { cuentaGmailId, page, limit },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      // 3️⃣ GUARDAR EN CACHE PARA PRÓXIMAS REQUESTS
      await this.cacheService.set(cacheKey, response.data, this.CACHE_TTL.EMAILS);
      
      this.logger.log(`✅ Inbox obtenido y guardado en cache para cuenta Gmail ${cuentaGmailId}`);
      
      return {
        success: true,
        source: 'orchestrator-api',
        data: response.data
      };

    } catch (error) {
      const apiError = error as AxiosError<ErrorResponse>;
      this.logger.error(`❌ Error obteniendo inbox:`, apiError.message);
      throw new HttpException(
        `Error obteniendo inbox: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 🔍 Buscar emails del usuario - ⚡ CON CACHE
   */
  async searchEmails(
    cuentaGmailId: string, 
    searchTerm: string, 
    page: number = 1, 
    limit: number = 10
  ) {
    try {
      this.logger.log(`🔍 Buscando emails para cuenta Gmail ${cuentaGmailId}: "${searchTerm}"`);

      // 1️⃣ VERIFICAR CACHE PRIMERO
      const cacheKey = this.cacheService.generateKey('search', cuentaGmailId, { 
        searchTerm: searchTerm.toLowerCase().trim(),
        page, 
        limit 
      });
      
      const cachedResult = await this.cacheService.get<EmailListResponse>(cacheKey);
      
      if (cachedResult) {
        this.logger.log(`⚡ CACHE HIT - Búsqueda desde cache para cuenta Gmail ${cuentaGmailId}`);
        return {
          success: true,
          source: 'orchestrator-cache',
          searchTerm,
          data: cachedResult
        };
      }

      // 2️⃣ SI NO HAY CACHE → LLAMAR API
      this.logger.log(`📡 CACHE MISS - Buscando desde API para cuenta Gmail ${cuentaGmailId}`);
      
      const accessToken = await this.getValidTokenForGmailAccount(cuentaGmailId);
      
      const response: AxiosResponse<EmailListResponse> = await axios.get(`${this.msEmailUrl}/emails/search`, {
        params: { cuentaGmailId, q: searchTerm, page, limit },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      // 3️⃣ GUARDAR EN CACHE
      await this.cacheService.set(cacheKey, response.data, this.CACHE_TTL.SEARCH);
      
      this.logger.log(`✅ Búsqueda completada y guardada en cache`);
      
      return {
        success: true,
        source: 'orchestrator-api',
        searchTerm,
        data: response.data
      };

    } catch (error) {
      const apiError = error as AxiosError<ErrorResponse>;
      this.logger.error(`❌ Error buscando emails:`, apiError.message);
      throw new HttpException(
        `Error buscando emails: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 📊 Obtener estadísticas de emails - ⚡ CON CACHE
   */
  async getEmailStats(cuentaGmailId: string) {
    try {
      this.logger.log(`📊 Obteniendo estadísticas para cuenta Gmail ${cuentaGmailId}`);

      // 1️⃣ VERIFICAR CACHE
      const cacheKey = this.cacheService.generateKey('stats', cuentaGmailId);
      const cachedResult = await this.cacheService.get<EmailStats>(cacheKey);
      
      if (cachedResult) {
        this.logger.log(`⚡ CACHE HIT - Stats desde cache para cuenta Gmail ${cuentaGmailId}`);
        return {
          success: true,
          source: 'orchestrator-cache',
          data: cachedResult
        };
      }

      // 2️⃣ SI NO HAY CACHE → LLAMAR API
      this.logger.log(`📡 CACHE MISS - Obteniendo stats desde API`);
      
      const accessToken = await this.getValidTokenForGmailAccount(cuentaGmailId);
      
      const response: AxiosResponse<EmailStats> = await axios.get(`${this.msEmailUrl}/emails/stats`, {
        params: { cuentaGmailId },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      // 3️⃣ GUARDAR EN CACHE (TTL más largo para stats)
      await this.cacheService.set(cacheKey, response.data, this.CACHE_TTL.STATS);
      
      this.logger.log(`✅ Stats obtenidas y guardadas en cache`);
      
      return {
        success: true,
        source: 'orchestrator-api',
        data: response.data
      };

    } catch (error) {
      const apiError = error as AxiosError<ErrorResponse>;
      this.logger.error(`❌ Error obteniendo estadísticas:`, apiError.message);
      throw new HttpException(
        `Error obteniendo estadísticas: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 📧 Obtener email específico - ⚡ CON CACHE
   */
  async getEmailById(cuentaGmailId: string, emailId: string) {
    try {
      this.logger.log(`📧 Obteniendo email ${emailId} para cuenta Gmail ${cuentaGmailId}`);

      // 1️⃣ VERIFICAR CACHE
      const cacheKey = this.cacheService.generateKey('detail', cuentaGmailId, { emailId });
      const cachedResult = await this.cacheService.get<EmailDetail>(cacheKey);
      
      if (cachedResult) {
        this.logger.log(`⚡ CACHE HIT - Email detail desde cache`);
        return {
          success: true,
          source: 'orchestrator-cache',
          data: cachedResult
        };
      }

      // 2️⃣ SI NO HAY CACHE → LLAMAR API
      this.logger.log(`📡 CACHE MISS - Obteniendo email desde API`);
      
      const accessToken = await this.getValidTokenForGmailAccount(cuentaGmailId);
      
      const response: AxiosResponse<EmailDetail> = await axios.get(`${this.msEmailUrl}/emails/${emailId}`, {
        params: { cuentaGmailId },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      // 3️⃣ GUARDAR EN CACHE (TTL más largo - emails específicos no cambian)
      await this.cacheService.set(cacheKey, response.data, this.CACHE_TTL.DETAIL);
      
      this.logger.log(`✅ Email obtenido y guardado en cache`);
      
      return {
        success: true,
        source: 'orchestrator-api',
        data: response.data
      };

    } catch (error) {
      const apiError = error as AxiosError<ErrorResponse>;
      this.logger.error(`❌ Error obteniendo email:`, apiError.message);
      throw new HttpException(
        `Error obteniendo email: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 🧹 Limpiar cache de cuenta Gmail (útil después de sync)
   */
  async clearGmailAccountCache(cuentaGmailId: string): Promise<void> {
    try {
      this.logger.log(`🧹 Limpiando cache para cuenta Gmail ${cuentaGmailId}`);
      
      await Promise.all([
        this.cacheService.deletePattern(`inbox:${cuentaGmailId}`),
        this.cacheService.deletePattern(`search:${cuentaGmailId}`),
        this.cacheService.deletePattern(`stats:${cuentaGmailId}`),
        this.cacheService.deletePattern(`detail:${cuentaGmailId}`)
      ]);
      
      this.logger.log(`✅ Cache limpiado para cuenta Gmail ${cuentaGmailId}`);
    } catch (error) {
      this.logger.error(`❌ Error limpiando cache:`, error);
    }
  }
}