import { Controller, Get, Post, UseGuards, Req, Res, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthTraditionalService } from './auth-traditional.service';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private authTraditionalService: AuthTraditionalService
  ) {}

  // ================================
  // ENDPOINTS TRADICIONALES (nuevos)
  // ================================

  /**
   * 📝 POST /auth/register
   * Registrar usuario con email/password
   */
  @Post('register')
  async register(@Body() registerData: {
    email: string;
    password: string;
    name: string;
  }) {
    // Validaciones básicas
    if (!registerData.email || !registerData.password || !registerData.name) {
      throw new UnauthorizedException('Email, password y nombre son requeridos');
    }

    if (registerData.password.length < 6) {
      throw new UnauthorizedException('La contraseña debe tener al menos 6 caracteres');
    }

    return this.authTraditionalService.register(registerData);
  }

  /**
   * 🔑 POST /auth/login
   * Login con email/password
   */
  @Post('login')
  async login(@Body() loginData: {
    email: string;
    password: string;
  }) {
    if (!loginData.email || !loginData.password) {
      throw new UnauthorizedException('Email y password son requeridos');
    }

    return this.authTraditionalService.login(loginData);
  }

  /**
   * 👤 GET /auth/me
   * Obtener información del usuario autenticado
   */
 /**
 * 👤 GET /auth/me
 * Obtener información del usuario autenticado CON FOTO
 */
@Get('me')
async getProfile(@Headers('authorization') authHeader: string) {
  try {
    if (!authHeader) {
      throw new UnauthorizedException('Token de autorización requerido');
    }

    const jwtToken = authHeader.replace('Bearer ', '');
    
    // ✅ USAR MÉTODO EXISTENTE (sin foto)
    const profileData = await this.authTraditionalService.getProfile(jwtToken);
    
    if (!profileData.success) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    // ✅ DEVOLVER PERFIL SIMPLE (sin foto)
    return {
      success: true,
      user: {
        ...profileData.user,
        profilePicture: null  // Por ahora sin foto
      },
      connections: profileData.connections || []
    };

  } catch (error) {
    console.error('❌ Error obteniendo perfil:', error);
    throw new UnauthorizedException('Error obteniendo perfil de usuario');
  }
}
  /**
   * 🚪 POST /auth/logout
   * Cerrar sesión
   */
  @Post('logout')
  async logout(@Headers('authorization') authHeader: string) {
    if (!authHeader) {
      throw new UnauthorizedException('Token de autorización requerido');
    }

    const token = authHeader.replace('Bearer ', '');
    return this.authTraditionalService.logout(token);
  }

  // ================================
  // ENDPOINTS OAUTH (ya existían)
  // ================================

  /**
   * 🔐 GET /auth/google
   * Iniciar proceso de OAuth con Google
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    console.log('🔵 MS-AUTH - Iniciando OAuth con Google...');
    // Redirige automáticamente a Google
  }

  /**
   * 🔐 GET /auth/google/callback
   * Callback de Google OAuth
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: any, @Res() res: Response) {
    try {
      console.log('🔵 MS-AUTH - Callback recibido de Google');
      
      const result = await this.authService.handleGoogleCallback(req.user);
      
      // Devolver JSON con información del usuario
      res.status(200).json({
        success: true,
        message: 'Autorización OAuth exitosa',
        userId: result.user.id,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          googleId: result.user.google_id
        },
        authType: 'oauth'
      });
      
    } catch (error) {
      console.error('❌ MS-AUTH - Error en callback de OAuth:', error);
      
      res.status(500).json({
        success: false,
        error: 'Error al procesar autorización de Google',
        message: error.message
      });
    }
  }

  // ================================
  // ENDPOINTS DE INFORMACIÓN
  // ================================

  /**
   * 📊 GET /auth/health
   * Health check del microservicio
   */
  @Get('health')
  getHealth() {
    return {
      service: 'ms-yourdashboard-auth',
      status: 'OK',
      timestamp: new Date().toISOString(),
      port: process.env.PORT || 3001,
      features: {
        traditional_auth: true,
        oauth_google: true,
        jwt_sessions: true,
        multi_provider_support: true
      }
    };
  }

  /**
   * 📋 GET /auth/info
   * Información del servicio de autenticación
   */
  @Get('info')
  getInfo() {
    return {
      service: 'ms-yourdashboard-auth',
      description: 'Microservicio de autenticación completo',
      endpoints: {
        traditional: {
          register: 'POST /auth/register',
          login: 'POST /auth/login',
          profile: 'GET /auth/me',
          logout: 'POST /auth/logout'
        },
        oauth: {
          google: 'GET /auth/google',
          callback: 'GET /auth/google/callback'
        },
        tokens: {
          get_token: 'GET /tokens/:userId'
        }
      },
      supported_providers: ['email', 'google'],
      upcoming_providers: ['whatsapp', 'calendar']
    };
  }
}