// src/orchestrator/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import { 
  AuthStartResponse, 
  AuthError 
} from './interfaces/auth.interfaces';

@Injectable()
export class AuthOrchestratorService {
  private readonly msAuthUrl: string;
  private readonly frontendUrl: string;
  private readonly orchestratorUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.msAuthUrl = this.configService.get<string>('MS_AUTH_URL') || 'http://localhost:3001';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    this.orchestratorUrl = this.configService.get<string>('ORCHESTRATOR_URL') || 'http://localhost:3003';
  }

  /**
   * 🔄 Iniciar proceso de autenticación
   */
  startAuthentication(): AuthStartResponse {
    console.log(`🔵 ORCHESTRATOR-AUTH - Proporcionando URLs de autenticación`);
    
    return {
      success: true,
      message: 'Usar /auth/google para iniciar OAuth',
      authUrl: `${this.msAuthUrl}/auth/google`,
      orchestratorUrl: `${this.orchestratorUrl}/auth/google`,
      instructions: 'Recomendado: usar /auth/google del orquestador para mantener todo centralizado'
    };
  }

  /**
   * 🔐 Obtener URL de Google OAuth
   */
  getGoogleAuthUrl(): string {
    const authUrl = `${this.msAuthUrl}/auth/google`;
    console.log(`🔵 ORCHESTRATOR-AUTH - URL de Google OAuth: ${authUrl}`);
    return authUrl;
  }

  /**
   * 🔐 Manejar callback de Google OAuth
   */
  handleGoogleCallback(req: Request, res: Response): void {
    try {
      console.log(`🔵 ORCHESTRATOR-AUTH - Procesando callback de Google OAuth`);
      console.log(`🔵 ORCHESTRATOR-AUTH - Query params recibidos:`, req.query);
      
      // Construir URL del MS-Auth callback manteniendo todos los parámetros
      const msAuthCallbackUrl = `${this.msAuthUrl}/auth/google/callback`;
      
      // Manejar req.query correctamente (puede ser string | string[] | undefined)
      const query = req.query;
      const queryParams = new URLSearchParams();
      
      // Procesar cada parámetro del query
      Object.entries(query).forEach(([key, value]) => {
        if (typeof value === 'string') {
          queryParams.append(key, value);
        } else if (Array.isArray(value)) {
          value.forEach(v => {
            if (typeof v === 'string') {
              queryParams.append(key, v);
            }
          });
        }
      });
      
      const fullCallbackUrl = `${msAuthCallbackUrl}?${queryParams.toString()}`;
      console.log(`🔵 ORCHESTRATOR-AUTH - Redirigiendo a MS-Auth: ${fullCallbackUrl}`);
      
      // Redirigir al MS-Auth para que procese el callback
      res.redirect(fullCallbackUrl);
      
    } catch (error) {
      const authError = error as AuthError;
      console.error('❌ ORCHESTRATOR-AUTH - Error en callback:', authError.message);
      
      // Redirigir al frontend con error
      const errorUrl = new URL(this.frontendUrl);
      errorUrl.searchParams.set('auth', 'error');
      errorUrl.searchParams.set('message', encodeURIComponent('Error en autenticación OAuth'));
      
      console.log(`❌ ORCHESTRATOR-AUTH - Redirigiendo con error: ${errorUrl.toString()}`);
      res.redirect(errorUrl.toString());
    }
  }

  /**
   * 📊 Health check del módulo auth
   */
  checkAuthHealth() {
    try {
      // Aquí podrías hacer una verificación real al MS-Auth
      // Por ahora, solo verificamos que tenemos la configuración
      const hasConfig = !!(this.msAuthUrl && this.frontendUrl);
      
      return {
        service: 'orchestrator-auth-module',
        status: hasConfig ? 'OK' : 'ERROR',
        timestamp: new Date().toISOString(),
        msAuthConnection: {
          url: this.msAuthUrl,
          status: hasConfig ? 'configured' : 'not-configured'
        }
      };
    } catch (error) {
      console.error('❌ ORCHESTRATOR-AUTH - Error en health check:', error);
      return {
        service: 'orchestrator-auth-module',
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        msAuthConnection: {
          url: this.msAuthUrl,
          status: 'error'
        }
      };
    }
  }
}