// ============================================
// EMAILS SERVICE - CON CACHE REDIS INTEGRADO
// ============================================
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
    private readonly cacheService: CacheService  // ⭐ INYECTAMOS EL CACHE
  ) {
    this.msAuthUrl = this.configService.get<string>('MS_AUTH_URL') || 'http://localhost:3001';
    this.msEmailUrl = this.configService.get<string>('MS_EMAIL_URL') || 'http://localhost:3002';
  }

  /**
   * 🔑 Obtener token válido del ms-auth (SIN CACHE - siempre fresco)
   */
  private async getValidToken(userId: string): Promise<string> {
    try {
      this.logger.debug(`🔑 Solicitando token para usuario ${userId}`);
      
      const response: AxiosResponse<TokenResponse> = await axios.get(`${this.msAuthUrl}/tokens/${userId}`);
      
      if (!response.data.success) {
        throw new Error('No se pudo obtener token válido');
      }

      this.logger.debug(`✅ Token obtenido para usuario ${userId}`);
      return response.data.accessToken;

    } catch (error) {
      const apiError = error as AxiosError<{ message: string }>;
      this.logger.error(`❌ Error obteniendo token:`, apiError.message);
      throw new HttpException(
        `Error obteniendo token del usuario: ${apiError.message}`,
        HttpStatus.UNAUTHORIZED
      );
    }
  }

  /**
   * 📧 Obtener inbox del usuario - ⚡ CON CACHE
   */
  async getInbox(userId: string, page: number = 1, limit: number = 10) {
    try {
      this.logger.log(`📧 Obteniendo inbox para usuario ${userId} - Página ${page}`);

      // 1️⃣ VERIFICAR CACHE PRIMERO
      const cacheKey = this.cacheService.generateKey('inbox', userId, { page, limit });
      const cachedResult = await this.cacheService.get<EmailListResponse>(cacheKey);
      
      if (cachedResult) {
        this.logger.log(`⚡ CACHE HIT - Inbox desde cache para usuario ${userId}`);
        return {
          success: true,
          source: 'orchestrator-cache',  // 🎯 Indicamos que viene del cache
          data: cachedResult
        };
      }

      // 2️⃣ SI NO HAY CACHE → LLAMAR API
      this.logger.log(`📡 CACHE MISS - Obteniendo inbox desde API para usuario ${userId}`);
      
      const accessToken = await this.getValidToken(userId);
      
      const response: AxiosResponse<EmailListResponse> = await axios.get(`${this.msEmailUrl}/emails/inbox`, {
        params: { userId, page, limit },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      // 3️⃣ GUARDAR EN CACHE PARA PRÓXIMAS REQUESTS
      await this.cacheService.set(cacheKey, response.data, this.CACHE_TTL.EMAILS);
      
      this.logger.log(`✅ Inbox obtenido y guardado en cache para usuario ${userId}`);
      
      return {
        success: true,
        source: 'orchestrator-api',  // 🎯 Indicamos que viene de API
        data: response.data
      };

    } catch (error) {
      const apiError = error as AxiosError<{ message: string }>;
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
    userId: string, 
    searchTerm: string, 
    page: number = 1, 
    limit: number = 10
  ) {
    try {
      this.logger.log(`🔍 Buscando emails para usuario ${userId}: "${searchTerm}"`);

      // 1️⃣ VERIFICAR CACHE PRIMERO
      const cacheKey = this.cacheService.generateKey('search', userId, { 
        searchTerm: searchTerm.toLowerCase().trim(), // Normalizar término
        page, 
        limit 
      });
      
      const cachedResult = await this.cacheService.get<EmailListResponse>(cacheKey);
      
      if (cachedResult) {
        this.logger.log(`⚡ CACHE HIT - Búsqueda desde cache para usuario ${userId}`);
        return {
          success: true,
          source: 'orchestrator-cache',
          searchTerm,
          data: cachedResult
        };
      }

      // 2️⃣ SI NO HAY CACHE → LLAMAR API
      this.logger.log(`📡 CACHE MISS - Buscando desde API para usuario ${userId}`);
      
      const accessToken = await this.getValidToken(userId);
      
      const response: AxiosResponse<EmailListResponse> = await axios.get(`${this.msEmailUrl}/emails/search`, {
        params: { userId, q: searchTerm, page, limit },
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
      const apiError = error as AxiosError<{ message: string }>;
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
  async getEmailStats(userId: string) {
    try {
      this.logger.log(`📊 Obteniendo estadísticas para usuario ${userId}`);

      // 1️⃣ VERIFICAR CACHE
      const cacheKey = this.cacheService.generateKey('stats', userId);
      const cachedResult = await this.cacheService.get<EmailStats>(cacheKey);
      
      if (cachedResult) {
        this.logger.log(`⚡ CACHE HIT - Stats desde cache para usuario ${userId}`);
        return {
          success: true,
          source: 'orchestrator-cache',
          data: cachedResult
        };
      }

      // 2️⃣ SI NO HAY CACHE → LLAMAR API
      this.logger.log(`📡 CACHE MISS - Obteniendo stats desde API`);
      
      const accessToken = await this.getValidToken(userId);
      
      const response: AxiosResponse<EmailStats> = await axios.get(`${this.msEmailUrl}/emails/stats`, {
        params: { userId },
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
      const apiError = error as AxiosError<{ message: string }>;
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
  async getEmailById(userId: string, emailId: string) {
    try {
      this.logger.log(`📧 Obteniendo email ${emailId} para usuario ${userId}`);

      // 1️⃣ VERIFICAR CACHE
      const cacheKey = this.cacheService.generateKey('detail', userId, { emailId });
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
      
      const accessToken = await this.getValidToken(userId);
      
      const response: AxiosResponse<EmailDetail> = await axios.get(`${this.msEmailUrl}/emails/${emailId}`, {
        params: { userId },
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
      const apiError = error as AxiosError<{ message: string }>;
      this.logger.error(`❌ Error obteniendo email:`, apiError.message);
      throw new HttpException(
        `Error obteniendo email: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 🧹 Limpiar cache de usuario (útil para invalidar cuando sea necesario)
   */
  async clearUserCache(userId: string): Promise<void> {
    try {
      this.logger.log(`🧹 Limpiando cache para usuario ${userId}`);
      
      // Limpiar todos los patrones relacionados al usuario
      await Promise.all([
        this.cacheService.deletePattern(`inbox:${userId}`),
        this.cacheService.deletePattern(`search:${userId}`),
        this.cacheService.deletePattern(`stats:${userId}`),
        this.cacheService.deletePattern(`detail:${userId}`)
      ]);
      
      this.logger.log(`✅ Cache limpiado para usuario ${userId}`);
    } catch (error) {
      this.logger.error(`❌ Error limpiando cache:`, error);
    }
  }
}