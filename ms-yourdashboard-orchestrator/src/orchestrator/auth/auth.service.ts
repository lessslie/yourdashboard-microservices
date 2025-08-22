// src/orchestrator/auth/auth.service.ts
import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import axios, { AxiosError, AxiosResponse } from 'axios';
import {
  AuthStartResponse,
  AuthError,
  RegisterDto,
  LoginDto,
  AuthResponseDto,
  ProfileResponseDto,
  CuentasGmailResponseDto,
  CuentaGmailResponseDto,
  CuentaGmailDto,
} from './interfaces/auth.interfaces';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class AuthOrchestratorService {
  private readonly logger = new Logger(AuthOrchestratorService.name);
  private readonly msAuthUrl: string;
  private readonly frontendUrl: string;
  private readonly orchestratorUrl: string;
  private readonly msEmailUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    this.msAuthUrl =
      this.configService.get<string>('MS_AUTH_URL') || 'http://localhost:3001';
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    this.orchestratorUrl =
      this.configService.get<string>('ORCHESTRATOR_URL') ||
      'http://localhost:3003';
    this.msEmailUrl =
      this.configService.get<string>('MS_EMAIL_URL') || 'http://localhost:3002';
  }

  /**
   * 📝 Registrar nuevo usuario
   */
  async register(registerData: RegisterDto): Promise<AuthResponseDto> {
    try {
      this.logger.log(`📝 Registrando usuario: ${registerData.email}`);

      const response: AxiosResponse<AuthResponseDto> = await axios.post(
        `${this.msAuthUrl}/auth/register`,
        registerData,
      );

      this.logger.log(
        `✅ Usuario registrado exitosamente: ${registerData.email}`,
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(`❌ Error en registro:`, axiosError.message);

      if (axiosError.response?.status === 409) {
        throw new HttpException('Email ya registrado', HttpStatus.CONFLICT);
      }

      throw new HttpException(
        axiosError.response?.data || 'Error al registrar usuario',
        axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 🔑 Login de usuario
   */
  async login(loginData: LoginDto): Promise<AuthResponseDto> {
    try {
      this.logger.log(`🔑 Login para: ${loginData.email}`);

      const response: AxiosResponse<AuthResponseDto> = await axios.post(
        `${this.msAuthUrl}/auth/login`,
        loginData,
      );

      this.logger.log(`✅ Login exitoso: ${loginData.email}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(`❌ Error en login:`, axiosError.message);

      if (axiosError.response?.status === 401) {
        throw new HttpException(
          'Credenciales inválidas',
          HttpStatus.UNAUTHORIZED,
        );
      }

      throw new HttpException(
        axiosError.response?.data || 'Error al iniciar sesión',
        axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 👤 Obtener perfil del usuario
   */
  async getProfile(authHeader: string): Promise<ProfileResponseDto> {
    try {
      this.logger.log(`👤 Obteniendo perfil de usuario`);

      const response: AxiosResponse<ProfileResponseDto> = await axios.get(
        `${this.msAuthUrl}/auth/me`,
        {
          headers: {
            Authorization: authHeader,
          },
        },
      );

      this.logger.log(`✅ Perfil obtenido exitosamente`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(`❌ Error obteniendo perfil:`, axiosError.message);

      if (axiosError.response?.status === 401) {
        throw new HttpException(
          'Token inválido o expirado',
          HttpStatus.UNAUTHORIZED,
        );
      }

      throw new HttpException(
        'Error al obtener perfil',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 🚪 Cerrar sesión
   */
  async logout(authHeader: string) {
    try {
      this.logger.log(`🚪 Cerrando sesión`);

      const response: AxiosResponse<{ seccess: boolean; message: string }> =
        await axios.post(
          `${this.msAuthUrl}/auth/logout`,
          {},
          {
            headers: {
              Authorization: authHeader,
            },
          },
        );

      this.logger.log(`✅ Sesión cerrada exitosamente`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(`❌ Error en logout:`, axiosError.message);

      throw new HttpException(
        'Error al cerrar sesión',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
      instructions:
        'Recomendado: usar /auth/google del orquestador para mantener todo centralizado',
    };
  }

  /**
   * 🔐 Obtener URL de Google OAuth con token
   */
  getGoogleAuthUrlWithToken(token: string): string {
    const authUrl = `${this.msAuthUrl}/auth/google?token=${encodeURIComponent(token)}`;
    console.log(`🔵 ORCHESTRATOR-AUTH - URL de Google OAuth con token`);
    return authUrl;
  }

  /**
   * 🔐 Obtener URL de Google OAuth (sin token)
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
      //aca llama a la url de ms-auth con el query params de req que viene de google
      const msAuthCallbackUrl = `${this.msAuthUrl}/auth/google/callback`;

      const query = req.query;
      const queryParams = new URLSearchParams();

      Object.entries(query).forEach(([key, value]) => {
        if (typeof value === 'string') {
          queryParams.append(key, value);
        } else if (Array.isArray(value)) {
          value.forEach((v) => {
            if (typeof v === 'string') {
              queryParams.append(key, v);
            }
          });
        }
      });

      const fullCallbackUrl = `${msAuthCallbackUrl}?${queryParams.toString()}`;
      console.log(
        `🔵 ORCHESTRATOR-AUTH - Redirigiendo a MS-Auth: ${fullCallbackUrl}`,
      );

      res.redirect(fullCallbackUrl);
    } catch (error) {
      const authError = error as AuthError;
      console.error(
        '❌ ORCHESTRATOR-AUTH - Error en callback:',
        authError.message,
      );
      console.log(`🔵 ORCHESTRATOR-AUTH - Redirigiendo a frontend con error`);
      // const errorUrl = new URL(this.frontendUrl);

      // errorUrl.searchParams.set('auth', 'error');
      // errorUrl.searchParams.set('message', encodeURIComponent('Error en autenticación OAuth'));

      const errorUrl = new URL(
        this.configService.get<string>('FRONTEND_URL') ||
          'http://localhost:3000',
      );
      errorUrl.pathname = '/auth/callback'; // 🎯 CAMBIO AQUÍ
      errorUrl.searchParams.set('auth', 'error');
      errorUrl.searchParams.set(
        'message',
        encodeURIComponent(authError.message),
      );

      console.log(
        `❌ ORCHESTRATOR-AUTH - Redirigiendo con error: ${errorUrl.toString()}`,
      );
      res.redirect(errorUrl.toString());
    }
  }

  /**
   * 📧 Listar cuentas Gmail del usuario
   */
  async getCuentasGmail(authHeader: string): Promise<CuentasGmailResponseDto> {
    try {
      this.logger.log(`📧 Obteniendo cuentas Gmail del usuario`);

      // 1. Obtener cuentas desde MS-Auth (como siempre)
      const response: AxiosResponse<CuentasGmailResponseDto> = await axios.get(
        `${this.msAuthUrl}/auth/cuentas-gmail`,
        {
          headers: {
            Authorization: authHeader,
          },
        },
      );

      // 2. 🎯 ENRIQUECER CON COUNTS REALES (con cache)
      const cuentasConStats = await Promise.all(
        response.data.cuentas.map(async (cuenta: CuentaGmailDto) => {
          try {
            // Intentar obtener del cache primero
            const cacheKey = `gmail_count:${cuenta.id}`;
            let emailCount = await this.cacheService.get<number>(cacheKey);

            if (emailCount === null) {
              // No hay cache, obtener stats reales
              this.logger.log(
                `📊 Obteniendo count real para cuenta ${cuenta.id} (${cuenta.email_gmail})`,
              );

              // Obtener token para esta cuenta específica
              const tokenResponse: AxiosResponse<{
                success: boolean;
                accessToken: string;
                user: {
                  id: string;
                  email: string;
                  name: string;
                  cuentaGmailId: string;
                };
                renewed: boolean;
              }> = await axios.get(
                `${this.msAuthUrl}/tokens/gmail/${cuenta.id}`,
              );

              if (!tokenResponse.data.success) {
                throw new Error('No se pudo obtener token');
              }

              // Obtener stats desde MS-Email
              const statsResponse: AxiosResponse<{
                totalEmails: number;
                unreadEmails: number;
                readEmails: number;
              }> = await axios.get(`${this.msEmailUrl}/emails/stats`, {
                params: { cuentaGmailId: cuenta.id },
                headers: {
                  Authorization: `Bearer ${tokenResponse.data.accessToken}`,
                },
              });

              emailCount = statsResponse.data.totalEmails;

              this.logger.log(
                `✅ Count real obtenido: ${emailCount} emails para ${cuenta.email_gmail}`,
              );

              // Guardar en cache por 10 minutos
              await this.cacheService.set(cacheKey, emailCount, 600);
            } else {
              this.logger.log(
                `⚡ Count desde cache: ${emailCount} emails para ${cuenta.email_gmail}`,
              );
            }

            return {
              ...cuenta,
              emails_count: emailCount,
            };
          } catch (error) {
            this.logger.warn(
              `⚠️ No se pudo obtener count para cuenta ${cuenta.id}: ${error}`,
            );
            return cuenta; // Mantener el count original (0)
          }
        }),
      );

      this.logger.log(`✅ Cuentas Gmail obtenidas con counts reales`);

      return {
        success: true,
        cuentas: cuentasConStats,
        total: response.data.total,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `❌ Error obteniendo cuentas Gmail:`,
        axiosError.message,
      );

      if (axiosError.response?.status === 401) {
        throw new HttpException(
          'Token inválido o expirado',
          HttpStatus.UNAUTHORIZED,
        );
      }

      throw new HttpException(
        'Error al obtener cuentas Gmail',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 📧 Obtener cuenta Gmail específica
   */
  async getCuentaGmail(
    authHeader: string,
    cuentaId: string,
  ): Promise<CuentaGmailResponseDto> {
    try {
      this.logger.log(`📧 Obteniendo cuenta Gmail ${cuentaId}`);

      // 1. Obtener cuenta desde MS-Auth
      const response: AxiosResponse<CuentaGmailResponseDto> = await axios.get(
        `${this.msAuthUrl}/auth/cuentas-gmail/${cuentaId}`,
        {
          headers: {
            Authorization: authHeader,
          },
        },
      );

      // 2. 🎯 ENRIQUECER CON COUNT REAL (con cache)
      try {
        // Intentar obtener del cache primero
        const cacheKey = `gmail_count:${cuentaId}`;
        let emailCount = await this.cacheService.get<number>(cacheKey);

        if (emailCount === null) {
          // No hay cache, obtener stats reales
          this.logger.log(`📊 Obteniendo count real para cuenta ${cuentaId}`);

          // Obtener token para esta cuenta específica
          const tokenResponse: AxiosResponse<{
            success: boolean;
            accessToken: string;
            user: {
              id: string;
              email: string;
              name: string;
              cuentaGmailId: string;
            };
            renewed: boolean;
          }> = await axios.get(`${this.msAuthUrl}/tokens/gmail/${cuentaId}`);

          if (tokenResponse.data.success) {
            // Obtener stats desde MS-Email
            const statsResponse: AxiosResponse<{
              totalEmails: number;
              unreadEmails: number;
              readEmails: number;
            }> = await axios.get(`${this.msEmailUrl}/emails/stats`, {
              params: { cuentaGmailId: cuentaId },
              headers: {
                Authorization: `Bearer ${tokenResponse.data.accessToken}`,
              },
            });

            emailCount = statsResponse.data.totalEmails;

            this.logger.log(`✅ Count real obtenido: ${emailCount} emails`);

            // Guardar en cache por 10 minutos
            await this.cacheService.set(cacheKey, emailCount, 600);
          }
        } else {
          this.logger.log(`⚡ Count desde cache: ${emailCount} emails`);
        }

        // Actualizar el count en la respuesta
        if (emailCount !== null && response.data.cuenta) {
          response.data.cuenta.emails_count = emailCount;
        }
      } catch (error) {
        this.logger.error(`❌ Error en enriquecimiento:`, error);
        // Continuar sin el count real
      }

      this.logger.log(`✅ Cuenta Gmail obtenida exitosamente`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `❌ Error obteniendo cuenta Gmail:`,
        axiosError.message,
      );

      if (axiosError.response?.status === 404) {
        throw new HttpException(
          'Cuenta Gmail no encontrada',
          HttpStatus.NOT_FOUND,
        );
      }

      if (axiosError.response?.status === 401) {
        throw new HttpException(
          'Token inválido o expirado',
          HttpStatus.UNAUTHORIZED,
        );
      }

      throw new HttpException(
        'Error al obtener cuenta Gmail',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 🗑️ Desconectar cuenta Gmail
   */
  async desconectarCuentaGmail(authHeader: string, cuentaId: string) {
    try {
      this.logger.log(`🗑️ Desconectando cuenta Gmail ${cuentaId}`);

      const response: AxiosResponse<{
        seccess: boolean;
        message: string;
        cuenta_eliminada: any;
      }> = await axios.delete(
        `${this.msAuthUrl}/auth/cuentas-gmail/${cuentaId}`,
        {
          headers: {
            Authorization: authHeader,
          },
        },
      );

      this.logger.log(`✅ Cuenta Gmail desconectada exitosamente`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `❌ Error desconectando cuenta Gmail:`,
        axiosError.message,
      );

      if (axiosError.response?.status === 404) {
        throw new HttpException(
          'Cuenta Gmail no encontrada',
          HttpStatus.NOT_FOUND,
        );
      }

      throw new HttpException(
        'Error al desconectar cuenta Gmail',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 🏷️ Actualizar alias de cuenta Gmail
   */
  async actualizarAliasCuenta(
    authHeader: string,
    cuentaId: string,
    body: { alias_personalizado: string },
  ) {
    try {
      this.logger.log(`🏷️ Actualizando alias de cuenta Gmail ${cuentaId}`);

      const response: AxiosResponse<{
        seccess: boolean;
        message: string;
        alias_personalizado: string;
      }> = await axios.put(
        `${this.msAuthUrl}/auth/cuentas-gmail/${cuentaId}/alias`,
        body,
        {
          headers: {
            Authorization: authHeader,
          },
        },
      );

      this.logger.log(`✅ Alias actualizado exitosamente`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(`❌ Error actualizando alias:`, axiosError.message);

      if (axiosError.response?.status === 404) {
        throw new HttpException(
          'Cuenta Gmail no encontrada',
          HttpStatus.NOT_FOUND,
        );
      }

      throw new HttpException(
        'Error al actualizar alias',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 📊 Health check del módulo auth
   */
  checkAuthHealth() {
    try {
      const hasConfig = !!(this.msAuthUrl && this.frontendUrl);

      return {
        service: 'orchestrator-auth-module',
        status: hasConfig ? 'OK' : 'ERROR',
        timestamp: new Date().toISOString(),
        msAuthConnection: {
          url: this.msAuthUrl,
          status: hasConfig ? 'configured' : 'not-configured',
        },
      };
    } catch (error) {
      console.error('❌ ORCHESTRATOR-AUTH - Error en health check:', error);
      return {
        service: 'orchestrator-auth-module',
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        msAuthConnection: {
          url: this.msAuthUrl,
          status: 'error',
        },
      };
    }
  }
}
