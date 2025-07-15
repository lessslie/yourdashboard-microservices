import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import {
  TokenResponse,
  EmailListResponse,
  EmailStats,
  EmailDetail,
  OrchestratorResponse,
  DashboardSummary,
  AuthStartResponse,
  ApiError
} from './interfaces/orchestrator.interfaces';

@Injectable()
export class OrchestratorService {
  private readonly msAuthUrl: string;
  private readonly msEmailUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.msAuthUrl = this.configService.get<string>('MS_AUTH_URL') || 'http://localhost:3001';
    this.msEmailUrl = this.configService.get<string>('MS_EMAIL_URL') || 'http://localhost:3002';
  }

  /**
   * 🔑 Obtener token válido del ms-auth
   */
  private async getValidToken(userId: string): Promise<string> {
    try {
      console.log(`🔵 ORCHESTRATOR - Solicitando token para usuario ${userId} a ms-auth...`);
      
      const response: AxiosResponse<TokenResponse> = await axios.get(`${this.msAuthUrl}/tokens/${userId}`);
      
      if (!response.data.success) {
        throw new Error('No se pudo obtener token válido');
      }

      console.log(`✅ ORCHESTRATOR - Token obtenido para usuario ${userId}`);
      return response.data.accessToken;

    } catch (error) {
      const apiError = error as ApiError;
      console.error(`❌ ORCHESTRATOR - Error obteniendo token:`, apiError.message);
      throw new HttpException(
        `Error obteniendo token del usuario: ${apiError.message}`,
        HttpStatus.UNAUTHORIZED
      );
    }
  }

  /**
   * 📧 Obtener inbox del usuario
   */
  async getInbox(userId: string, page: number = 1, limit: number = 10): Promise<OrchestratorResponse<EmailListResponse>> {
    try {
      console.log(`🔵 ORCHESTRATOR - Obteniendo inbox para usuario ${userId}`);

      // 1. Obtener token del ms-auth
      const accessToken = await this.getValidToken(userId);

      // 2. Llamar al ms-email con el token
      console.log(`🔵 ORCHESTRATOR - Llamando a ms-email...`);
      
      const response: AxiosResponse<EmailListResponse> = await axios.get(`${this.msEmailUrl}/emails/inbox`, {
        params: { userId, page, limit },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      console.log(`✅ ORCHESTRATOR - Inbox obtenido exitosamente`);
      
      return {
        success: true,
        source: 'orchestrator',
        data: response.data
      };

    } catch (error) {
      const apiError = error as ApiError;
      console.error(`❌ ORCHESTRATOR - Error obteniendo inbox:`, apiError.message);
      throw new HttpException(
        `Error obteniendo inbox: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 🔍 Buscar emails del usuario
   */
  async searchEmails(
    userId: string, 
    searchTerm: string, 
    page: number = 1, 
    limit: number = 10
  ): Promise<OrchestratorResponse<EmailListResponse>> {
    try {
      console.log(`🔵 ORCHESTRATOR - Buscando emails para usuario ${userId}: "${searchTerm}"`);

      // 1. Obtener token del ms-auth
      const accessToken = await this.getValidToken(userId);

      // 2. Llamar al ms-email para búsqueda
      const response: AxiosResponse<EmailListResponse> = await axios.get(`${this.msEmailUrl}/emails/search`, {
        params: { userId, q: searchTerm, page, limit },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      console.log(`✅ ORCHESTRATOR - Búsqueda completada`);
      
      return {
        success: true,
        source: 'orchestrator',
        searchTerm,
        data: response.data
      };

    } catch (error) {
      const apiError = error as ApiError;
      console.error(`❌ ORCHESTRATOR - Error buscando emails:`, apiError.message);
      throw new HttpException(
        `Error buscando emails: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 📊 Obtener estadísticas de emails
   */
  async getEmailStats(userId: string): Promise<OrchestratorResponse<EmailStats>> {
    try {
      console.log(`🔵 ORCHESTRATOR - Obteniendo estadísticas para usuario ${userId}`);

      // 1. Obtener token del ms-auth
      const accessToken = await this.getValidToken(userId);

      // 2. Llamar al ms-email para estadísticas
      const response: AxiosResponse<EmailStats> = await axios.get(`${this.msEmailUrl}/emails/stats`, {
        params: { userId },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      console.log(`✅ ORCHESTRATOR - Estadísticas obtenidas`);
      
      return {
        success: true,
        source: 'orchestrator',
        data: response.data
      };

    } catch (error) {
      const apiError = error as ApiError;
      console.error(`❌ ORCHESTRATOR - Error obteniendo estadísticas:`, apiError.message);
      throw new HttpException(
        `Error obteniendo estadísticas: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 📧 Obtener email específico
   */
  async getEmailById(userId: string, emailId: string): Promise<OrchestratorResponse<EmailDetail>> {
    try {
      console.log(`🔵 ORCHESTRATOR - Obteniendo email ${emailId} para usuario ${userId}`);

      // 1. Obtener token del ms-auth
      const accessToken = await this.getValidToken(userId);

      // 2. Llamar al ms-email para email específico
      const response: AxiosResponse<EmailDetail> = await axios.get(`${this.msEmailUrl}/emails/${emailId}`, {
        params: { userId },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      console.log(`✅ ORCHESTRATOR - Email obtenido`);
      
      return {
        success: true,
        source: 'orchestrator',
        data: response.data
      };

    } catch (error) {
      const apiError = error as ApiError;
      console.error(`❌ ORCHESTRATOR - Error obteniendo email:`, apiError.message);
      throw new HttpException(
        `Error obteniendo email: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 🔄 Iniciar proceso de autenticación (redirige al ms-auth)
   */
  startAuthentication(): AuthStartResponse {
    return {
      success: true,
      message: 'Redirigir al ms-auth para autenticación',
      authUrl: `${this.msAuthUrl}/auth/google`,
      instructions: 'El frontend debe redirigir al usuario a esta URL'
    };
  }

  /**
   * 📊 Dashboard resumen (combinando múltiples fuentes)
   */
  async getDashboardSummary(userId: string): Promise<OrchestratorResponse<DashboardSummary>> {
    try {
      console.log(`🔵 ORCHESTRATOR - Obteniendo resumen de dashboard para usuario ${userId}`);

      // 1. Obtener token
      const accessToken = await this.getValidToken(userId);

      // 2. Llamadas paralelas para optimizar
      const [statsResponse, recentEmailsResponse] = await Promise.all([
        axios.get<EmailStats>(`${this.msEmailUrl}/emails/stats`, {
          params: { userId },
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }),
        axios.get<EmailListResponse>(`${this.msEmailUrl}/emails/inbox`, {
          params: { userId, page: 1, limit: 5 },
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
      ]);

      console.log(`✅ ORCHESTRATOR - Resumen de dashboard obtenido`);

      return {
        success: true,
        source: 'orchestrator',
        data: {
          stats: statsResponse.data,
          recentEmails: recentEmailsResponse.data.emails,
          lastUpdated: new Date().toISOString()
        }
      };

    } catch (error) {
      const apiError = error as ApiError;
      console.error(`❌ ORCHESTRATOR - Error obteniendo resumen:`, apiError.message);
      throw new HttpException(
        `Error obteniendo resumen de dashboard: ${apiError.response?.data?.message || apiError.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}