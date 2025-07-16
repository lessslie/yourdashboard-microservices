import { 
  Controller, 
  Get, 
  Post, 
  UseGuards, 
  Req, 
  Res, 
  Body, 
  UnauthorizedException
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthTraditionalService } from './auth-traditional.service';
import { 
  RegisterDto, 
  LoginDto, 
  AuthResponseDto, 
  ProfileResponseDto, 
  ErrorResponseDto, 
  HealthResponseDto
} from './dto';
import { 
  AuthenticatedRequest, 
  HealthResponse, 
  InfoResponse 
} from './interfaces/auth.interfaces';

@ApiTags('Authentication')
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
  @ApiOperation({ 
    summary: 'Registrar nuevo usuario',
    description: 'Crear una nueva cuenta con email y contraseña. Retorna JWT token para autenticación inmediata.' 
  })
  @ApiBody({ 
    type: RegisterDto,
    description: 'Datos del nuevo usuario',
    examples: {
      ejemplo1: {
        summary: 'Usuario de ejemplo',
        value: {
          email: 'usuario@test.com',
          password: 'password123',
          name: 'Juan Pérez'
        }
      }
    }
  })
  @ApiCreatedResponse({ 
    description: 'Usuario registrado exitosamente',
    type: AuthResponseDto 
  })
  @ApiBadRequestResponse({ 
    description: 'Datos inválidos (validación falló)',
    type: ErrorResponseDto,
    content: {
      'application/json': {
        examples: {
          'email-invalid': {
            summary: 'Email inválido',
            value: {
              success: false,
              message: 'Debe ser un email válido',
              statusCode: 400,
              timestamp: '2024-01-15T10:30:00Z'
            }
          },
          'password-short': {
            summary: 'Contraseña muy corta',
            value: {
              success: false,
              message: 'Password debe tener al menos 6 caracteres',
              statusCode: 400,
              timestamp: '2024-01-15T10:30:00Z'
            }
          }
        }
      }
    }
  })
  @ApiConflictResponse({ 
    description: 'Email ya registrado',
    type: ErrorResponseDto 
  })
  async register(@Body() registerData: RegisterDto): Promise<AuthResponseDto> {
    return this.authTraditionalService.register(registerData);
  }

  /**
   * 🔑 POST /auth/login
   * Login con email/password
   */
  @Post('login')
  @ApiOperation({ 
    summary: 'Iniciar sesión',
    description: 'Autenticarse con email y contraseña. Retorna JWT token.' 
  })
  @ApiBody({ 
    type: LoginDto,
    description: 'Credenciales de acceso',
    examples: {
      ejemplo1: {
        summary: 'Credenciales de ejemplo',
        value: {
          email: 'usuario@test.com',
          password: 'password123'
        }
      }
    }
  })
  @ApiOkResponse({ 
    description: 'Login exitoso',
    type: AuthResponseDto 
  })
  @ApiBadRequestResponse({ 
    description: 'Credenciales faltantes',
    type: ErrorResponseDto 
  })
  @ApiUnauthorizedResponse({ 
    description: 'Credenciales incorrectas',
    type: ErrorResponseDto 
  })
  async login(@Body() loginData: LoginDto): Promise<AuthResponseDto> {
    return this.authTraditionalService.login(loginData);
  }

  /**
   * 👤 GET /auth/me
   * Obtener información del usuario autenticado
   */
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener perfil del usuario',
    description: 'Obtiene la información del usuario autenticado. Usa el botón "Authorize" 🔒 arriba para autenticarte.' 
  })
  @ApiOkResponse({
    description: 'Perfil obtenido exitosamente',
    type: ProfileResponseDto
  })
  @ApiUnauthorizedResponse({
    description: 'Token faltante o inválido',
    type: ErrorResponseDto
  })
  async getProfile(@Req() request: any): Promise<ProfileResponseDto> {
    try {
      // Obtener el header authorization del request
      const authHeader = request.headers.authorization;
      
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
          createdAt: profileData.user.createdAt?.toISOString(),
          profilePicture: null
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Cerrar sesión',
    description: 'Invalida el JWT token actual. Usa el botón "Authorize" 🔒 arriba para autenticarte.' 
  })
  @ApiOkResponse({ 
    description: 'Sesión cerrada exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Sesión cerrada exitosamente' }
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: 'Token faltante o inválido',
    type: ErrorResponseDto 
  })
  async logout(@Req() request: any) {
    // Obtener el header authorization del request
    const authHeader = request.headers.authorization;
    
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
  @ApiOperation({ 
    summary: 'Iniciar OAuth con Google',
    description: 'Redirige al usuario a Google para autenticación OAuth. No usar desde Swagger.' 
  })
  @ApiResponse({ 
    status: 302, 
    description: 'Redirección a Google OAuth' 
  })
  @ApiExcludeEndpoint() // Ocultar de Swagger ya que es solo redirección
  googleAuth(): void {
    console.log('🔵 MS-AUTH - Redirigiendo a Google OAuth...');
    // Passport/Guard maneja la redirección automáticamente
  }

  /**
   * 🔐 GET /auth/google/callback
   * Callback de Google OAuth CON JWT
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ 
    summary: 'Callback de Google OAuth',
    description: 'Endpoint interno usado por Google OAuth. No llamar directamente.' 
  })
  @ApiResponse({ 
    status: 302, 
    description: 'Redirección al frontend con JWT token' 
  })
  @ApiExcludeEndpoint() // Ocultar de Swagger ya que es callback interno
  async googleAuthRedirect(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ): Promise<void> {
    try {
      console.log('🔵 MS-AUTH - Callback recibido de Google');
      
      const result = await this.authService.handleGoogleCallback(req.user);
      
      console.log('✅ MS-AUTH - Callback procesado exitosamente');
      console.log(`🔑 MS-AUTH - JWT generado para usuario: ${result.user.email}`);
      
      // Incluir JWT en los parámetros
      const redirectUrl = new URL(`${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      redirectUrl.searchParams.set('auth', 'success');
      redirectUrl.searchParams.set('userId', result.accountId.toString());
      redirectUrl.searchParams.set('token', result.jwt);
      redirectUrl.searchParams.set('provider', 'google');

      console.log(`✅ MS-AUTH - Redirigiendo a: ${redirectUrl.toString()}`);
      
      res.redirect(redirectUrl.toString());
      
    } catch (error) {
      console.error('❌ MS-AUTH - Error en callback de OAuth:', error);
      
      const errorUrl = new URL(`${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      errorUrl.searchParams.set('auth', 'error');
      errorUrl.searchParams.set('message', encodeURIComponent(error instanceof Error ? error.message : 'Error desconocido'));
      
      res.redirect(errorUrl.toString());
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
  @ApiTags('Health')
  @ApiOperation({ 
    summary: 'Estado del servicio',
    description: 'Verifica que el microservicio de autenticación esté funcionando correctamente.' 
  })
  @ApiOkResponse({ 
    description: 'Servicio funcionando correctamente',
    type: HealthResponseDto 
  })
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
  @ApiTags('Health')
  @ApiOperation({ 
    summary: 'Información del servicio',
    description: 'Obtiene información detallada sobre los endpoints disponibles.' 
  })
  @ApiOkResponse({ 
    description: 'Información del servicio',
    schema: {
      type: 'object',
      properties: {
        service: { type: 'string', example: 'ms-yourdashboard-auth' },
        description: { type: 'string', example: 'Microservicio de autenticación completo' },
        endpoints: { type: 'object' },
        supported_providers: { type: 'array', items: { type: 'string' } },
        upcoming_providers: { type: 'array', items: { type: 'string' } }
      }
    }
  })
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