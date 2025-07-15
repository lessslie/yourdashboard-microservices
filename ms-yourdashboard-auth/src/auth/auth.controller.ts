import { 
  Controller, 
  Get, 
  Post, 
  UseGuards, 
  Req, 
  Res, 
  Body, 
  Headers, 
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { AuthTraditionalService } from './auth-traditional.service';
import { RegisterData, LoginCredentials } from './interfaces/auth.interfaces';

interface AuthenticatedRequest extends Request {
  user: {
    googleId: string;
    email: string;
    name: string;
    accessToken: string;
    refreshToken: string;
  };
}

interface ProfileResponse {
  success: boolean;
  user: {
    id: number;
    email: string;
    name: string;
    isEmailVerified: boolean;
    createdAt: Date;
    profilePicture: string | null;
  };
  connections: any[];
}

interface HealthResponse {
  service: string;
  status: string;
  timestamp: string;
  port: string | number;
  features: {
    traditional_auth: boolean;
    oauth_google: boolean;
    jwt_sessions: boolean;
    multi_provider_support: boolean;
  };
}

interface InfoResponse {
  service: string;
  description: string;
  endpoints: {
    traditional: {
      register: string;
      login: string;
      profile: string;
      logout: string;
    };
    oauth: {
      google: string;
      callback: string;
    };
    tokens: {
      get_token: string;
    };
  };
  supported_providers: string[];
  upcoming_providers: string[];
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authTraditionalService: AuthTraditionalService
  ) {}

  // ================================
  // ENDPOINTS TRADICIONALES
  // ================================

  /**
   * 📝 POST /auth/register
   * Registrar usuario con email/password
   */
  @Post('register')
  async register(@Body() registerData: RegisterData) {
    // Validaciones básicas
    if (!registerData.email || !registerData.password || !registerData.name) {
      throw new BadRequestException('Email, password y nombre son requeridos');
    }

    if (registerData.password.length < 6) {
      throw new BadRequestException('La contraseña debe tener al menos 6 caracteres');
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerData.email)) {
      throw new BadRequestException('Formato de email inválido');
    }

    return this.authTraditionalService.register(registerData);
  }

  /**
   * 🔑 POST /auth/login
   * Login con email/password
   */
  @Post('login')
  async login(@Body() loginData: LoginCredentials) {
    if (!loginData.email || !loginData.password) {
      throw new BadRequestException('Email y password son requeridos');
    }

    return this.authTraditionalService.login(loginData);
  }

  /**
   * 👤 GET /auth/me
   * Obtener información del usuario autenticado
   */
  @Get('me')
  async getProfile(@Headers('authorization') authHeader: string): Promise<ProfileResponse> {
    try {
      if (!authHeader) {
        throw new UnauthorizedException('Token de autorización requerido');
      }

      const jwtToken = authHeader.replace('Bearer ', '');
      
      if (!jwtToken) {
        throw new UnauthorizedException('Token JWT inválido');
      }
      
      const profileData = await this.authTraditionalService.getProfile(jwtToken);
      
      if (!profileData.success) {
        throw new UnauthorizedException('Token inválido o expirado');
      }

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
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
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
    
    if (!token) {
      throw new UnauthorizedException('Token JWT inválido');
    }

    return this.authTraditionalService.logout(token);
  }

  // ================================
  // ENDPOINTS OAUTH
  // ================================

  /**
   * 🔐 GET /auth/google
   * Iniciar proceso de OAuth con Google
   */
@Get('google')
@UseGuards(AuthGuard('google'))
googleAuth(): void {
  console.log('🔵 MS-AUTH - Redirigiendo a Google OAuth...');
  // Passport/Guard maneja la redirección automáticamente
  // Esta función termina inmediatamente después del log
}

/**
 * 🔐 GET /auth/google/callback
 * Callback de Google OAuth
 */
@Get('google/callback')
@UseGuards(AuthGuard('google'))
async googleAuthRedirect(
  @Req() req: AuthenticatedRequest,
  @Res() res: Response
): Promise<void> {
  try {
    console.log('🔵 MS-AUTH - Callback recibido de Google');
    
    const result = await this.authService.handleGoogleCallback(req.user);
    
    console.log('✅ MS-AUTH - Callback procesado');
    //Redirigir al dashboard 
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}?auth=success&userId=${result.user.id}`;

    console.log(`✅ MS-AUTH - Redirigiendo a: ${redirectUrl}`);
    
    res.redirect(redirectUrl);
    
  } catch (error) {
    console.error('❌ MS-AUTH - Error en callback de OAuth:', error);
    
    // ✅ CAMBIO: Redirigir a página de error en lugar de JSON
    const errorUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}?auth=error&message=${encodeURIComponent(error instanceof Error ? error.message : 'Error desconocido')}`;
    
    res.redirect(errorUrl);
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
  getHealth(): HealthResponse {
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
  getInfo(): InfoResponse {
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