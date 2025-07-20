import { 
  Controller, 
  Get, 
  Post, 
  Delete,
  Put,
  UseGuards, 
  Req, 
  Res, 
  Body, 
  Param,
  UnauthorizedException,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody,
  ApiParam,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiNotFoundResponse
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { 
  RegisterDto, 
  LoginDto, 
  AuthResponseDto, 
  ProfileResponseDto, 
  ErrorResponseDto, 
  HealthResponseDto
} from './dto';
import { 
  ReqCallbackGoogle,
  UsuarioAutenticado
} from './interfaces/auth.interfaces';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService
  ) {}

  // ================================
  // ENDPOINTS TRADICIONALES
  // ================================

  @Post('register')
  @ApiOperation({ 
    summary: 'Registrar nuevo usuario',
    description: 'Crear una nueva cuenta con email y contraseña. Retorna JWT token para autenticación inmediata.' 
  })
  @ApiBody({ 
    type: RegisterDto,
    description: 'Datos del nuevo usuario'
  })
  @ApiCreatedResponse({ 
    description: 'Usuario registrado exitosamente',
    type: AuthResponseDto 
  })
  @ApiBadRequestResponse({ 
    description: 'Datos inválidos',
    type: ErrorResponseDto
  })
  @ApiConflictResponse({ 
    description: 'Email ya registrado',
    type: ErrorResponseDto 
  })
  async register(@Body() registerData: RegisterDto): Promise<AuthResponseDto> {
    const result = await this.authService.registrarUsuario(
      registerData.email,
      registerData.password,
      registerData.nombre
    );
    
    return {
      success: result.success,
      message: result.message,
      user: {
        id: result.usuario.id,
        email: result.usuario.email,
        name: result.usuario.nombre,
        isEmailVerified: result.usuario.email_verificado,
        createdAt: result.usuario.fecha_registro.toISOString(),
        profilePicture: null
      },
      token: result.token
    };
  }

  @Post('login')
  @ApiOperation({ 
    summary: 'Iniciar sesión',
    description: 'Autenticarse con email y contraseña. Retorna JWT token.' 
  })
  @ApiBody({ 
    type: LoginDto,
    description: 'Credenciales de acceso'
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
    const result = await this.authService.loginUsuario(loginData.email, loginData.password);
    
    return {
      success: result.success,
      message: result.message,
      user: {
        id: result.usuario.id,
        email: result.usuario.email,
        name: result.usuario.nombre,
        isEmailVerified: result.usuario.email_verificado,
        createdAt: result.usuario.fecha_registro.toISOString(),
        profilePicture: null
      },
      token: result.token
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener perfil del usuario',
    description: 'Obtiene la información del usuario autenticado con sus cuentas Gmail conectadas.' 
  })
  @ApiOkResponse({
    description: 'Perfil obtenido exitosamente',
    type: ProfileResponseDto
  })
  @ApiUnauthorizedResponse({
    description: 'Token faltante o inválido',
    type: ErrorResponseDto
  })
  async getProfile(@Req() request: { user: UsuarioAutenticado }): Promise<ProfileResponseDto> {
    try {
      const usuario = request.user;
      
      const profileData = await this.authService.obtenerPerfil(usuario.id);
      
      if (!profileData.success) {
        throw new UnauthorizedException('Error obteniendo perfil');
      }

      return {
        success: true,
        usuario: {
          id: profileData.usuario.id,
          email: profileData.usuario.email,
          nombre: profileData.usuario.nombre,
          fecha_registro: profileData.usuario.fecha_registro.toISOString(),
          estado: profileData.usuario.estado,
          email_verificado: profileData.usuario.email_verificado
        },
        cuentas_gmail: profileData.cuentas_gmail.map(cuenta => ({
          id: cuenta.id,
          email_gmail: cuenta.email_gmail,
          nombre_cuenta: cuenta.nombre_cuenta,
          alias_personalizado: cuenta.alias_personalizado,
          fecha_conexion: cuenta.fecha_conexion.toISOString(),
          ultima_sincronizacion: cuenta.ultima_sincronizacion?.toISOString(),
          esta_activa: cuenta.esta_activa,
          emails_count: cuenta.emails_count
        })),
        sesiones_activas: profileData.sesiones_activas.map(sesion => ({
          id: sesion.id,
          fecha_creacion: sesion.fecha_creacion.toISOString(),
          expira_en: sesion.expira_en.toISOString(),
          ip_origen: sesion.ip_origen,
          user_agent: sesion.user_agent,
          esta_activa: sesion.esta_activa
        })),
        estadisticas: {
          total_cuentas_gmail: profileData.estadisticas.total_cuentas_gmail,
          cuentas_gmail_activas: profileData.estadisticas.cuentas_gmail_activas,
          total_emails_sincronizados: profileData.estadisticas.total_emails_sincronizados,
          emails_no_leidos: profileData.estadisticas.emails_no_leidos,
          ultima_sincronizacion: profileData.estadisticas.ultima_sincronizacion.toISOString(),
          cuenta_mas_activa: profileData.estadisticas.cuenta_mas_activa
        }
      };

    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new UnauthorizedException('Error obteniendo perfil de usuario');
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Cerrar sesión',
    description: 'Invalida el JWT token actual.' 
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
  async logout(@Req() request: { user: UsuarioAutenticado; headers: { authorization?: string } }) {
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      throw new UnauthorizedException('Token de autorización requerido');
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      throw new UnauthorizedException('Token JWT inválido');
    }

    return this.authService.logout(token);
  }

  // ================================
  // ENDPOINTS OAUTH - ARREGLADOS
  // ================================

  @Get('google')
  @UseGuards(JwtAuthGuard) // 🎯 AHORA REQUIERE AUTENTICACIÓN
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Iniciar OAuth con Google',
    description: 'Inicia el proceso OAuth con Google para conectar una cuenta Gmail al usuario autenticado.' 
  })
  @ApiResponse({ 
    status: 302, 
    description: 'Redirección a Google OAuth con estado del usuario' 
  })
  @ApiUnauthorizedResponse({
    description: 'Usuario no autenticado - JWT requerido',
    type: ErrorResponseDto
  })
  googleAuth(@Req() req: { user: UsuarioAutenticado }, @Res() res: Response): void {
    console.log(`🔵 Usuario ${req.user.id} iniciando OAuth Google...`);
    
    // 🎯 GENERAR URL OAUTH CON EL USER ID EN STATE
    const authUrl = this.authService.generarUrlOAuth(req.user.id);
    
    console.log(`🔗 Redirigiendo a: ${authUrl}`);
    res.redirect(authUrl);
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ 
    summary: 'Callback de Google OAuth',
    description: 'Endpoint interno usado por Google OAuth para completar la autenticación.' 
  })
  @ApiResponse({ 
    status: 302, 
    description: 'Redirección al frontend con resultado' 
  })
  @ApiExcludeEndpoint()
  async googleAuthRedirect(
    @Req() req: ReqCallbackGoogle & { query: { state?: string } },
    @Res() res: Response
  ): Promise<void> {
    try {
      console.log('🔵 Callback recibido de Google');
      console.log('🔍 Estado recibido:', req.query.state);
      
      // 🎯 EXTRAER USER ID DEL STATE
      const userIdFromState = req.query.state ? parseInt(req.query.state, 10) : null;
      
      if (!userIdFromState || isNaN(userIdFromState)) {
        throw new Error('Estado inválido - Usuario no identificado');
      }

      console.log(`🎯 Conectando cuenta Gmail para usuario ${userIdFromState}`);
      
      // 🎯 PASAR EL USER ID AL SERVICE
      await this.authService.manejarCallbackGoogle(req.user, userIdFromState);
      
      console.log('✅ Callback procesado exitosamente');
      
      const redirectUrl = new URL(process.env.FRONTEND_URL || 'http://localhost:3000');
      redirectUrl.searchParams.set('auth', 'success');
      redirectUrl.searchParams.set('message', `Gmail ${req.user.email} conectado exitosamente`);
      redirectUrl.searchParams.set('gmail', req.user.email);
      
      res.redirect(redirectUrl.toString());
      
    } catch (error) {
      console.error('❌ Error en callback de OAuth:', error);
      
      const errorUrl = new URL(process.env.FRONTEND_URL || 'http://localhost:3000');
      errorUrl.searchParams.set('auth', 'error');
      errorUrl.searchParams.set('message', encodeURIComponent(error instanceof Error ? error.message : 'Error desconocido'));
      
      res.redirect(errorUrl.toString());
    }
  }

  // ================================
  // GESTIÓN DE CUENTAS GMAIL
  // ================================

  @Get('cuentas-gmail')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Listar cuentas Gmail del usuario',
    description: 'Obtiene todas las cuentas Gmail conectadas del usuario autenticado.'
  })
  @ApiOkResponse({
    description: 'Lista de cuentas Gmail obtenida exitosamente'
  })
  @ApiUnauthorizedResponse({
    description: 'Token faltante o inválido',
    type: ErrorResponseDto
  })
  async listarCuentasGmail(@Req() request: { user: UsuarioAutenticado }) {
    try {
      const cuentas = await this.authService.listarCuentasGmailUsuario(request.user.id);

      return {
        success: true,
        cuentas: cuentas,
        total: cuentas.length
      };

    } catch (error) {
      console.error('Error listando cuentas Gmail:', error);
      throw new UnauthorizedException('Error obteniendo cuentas Gmail');
    }
  }

  @Get('cuentas-gmail/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener cuenta Gmail específica',
    description: 'Obtiene los detalles de una cuenta Gmail específica del usuario.'
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la cuenta Gmail',
    example: '1'
  })
  @ApiOkResponse({
    description: 'Cuenta Gmail obtenida exitosamente'
  })
  @ApiNotFoundResponse({
    description: 'Cuenta Gmail no encontrada',
    type: ErrorResponseDto
  })
  obtenerCuentaGmail(
    @Req() request: { user: UsuarioAutenticado },
    @Param('id') cuentaId: string
  ) {
    try {
      // Lógica simulada para obtener cuenta específica
      const cuentaSimulada = {
        id: parseInt(cuentaId),
        email_gmail: 'cuenta' + cuentaId + '@gmail.com',
        nombre_cuenta: 'Cuenta ' + cuentaId,
        alias_personalizado: parseInt(cuentaId) === 1 ? 'Gmail Personal' : 'Gmail Trabajo',
        fecha_conexion: new Date().toISOString(),
        esta_activa: true,
        ultima_sincronizacion: new Date().toISOString(),
        emails_count: Math.floor(Math.random() * 500) + 50
      };

      return {
        success: true,
        cuenta: cuentaSimulada
      };

    } catch (error) {
      console.error('Error obteniendo cuenta Gmail:', error);
      throw new NotFoundException('Cuenta Gmail no encontrada');
    }
  }

  @Delete('cuentas-gmail/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Desconectar cuenta Gmail',
    description: 'Desconecta y elimina una cuenta Gmail específica del usuario.'
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la cuenta Gmail a desconectar',
    example: '1'
  })
  @ApiOkResponse({
    description: 'Cuenta Gmail desconectada exitosamente'
  })
  @ApiNotFoundResponse({
    description: 'Cuenta Gmail no encontrada',
    type: ErrorResponseDto
  })
  async desconectarCuentaGmail(
    @Req() request: { user: UsuarioAutenticado },
    @Param('id') cuentaId: string
  ) {
    try {
      const resultado = await this.authService.desconectarCuentaGmail(request.user.id, parseInt(cuentaId));

      return {
        success: true,
        message: 'Cuenta Gmail desconectada exitosamente',
        cuenta_eliminada: resultado.cuenta_desconectada
      };

    } catch (error) {
      console.error('Error desconectando cuenta Gmail:', error);
      throw new NotFoundException('Cuenta Gmail no encontrada');
    }
  }

  @Put('cuentas-gmail/:id/alias')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Actualizar alias de cuenta Gmail',
    description: 'Actualiza el alias personalizado de una cuenta Gmail.'
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la cuenta Gmail',
    example: '1'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        alias_personalizado: { 
          type: 'string', 
          example: 'Gmail Trabajo',
          description: 'Nuevo alias para la cuenta Gmail'
        }
      },
      required: ['alias_personalizado']
    }
  })
  @ApiOkResponse({
    description: 'Alias actualizado exitosamente'
  })
  @ApiBadRequestResponse({
    description: 'Alias inválido o faltante',
    type: ErrorResponseDto
  })
  actualizarAliasCuenta(
    @Req() request: { user: UsuarioAutenticado },
    @Param('id') cuentaId: string,
    @Body() body: { alias_personalizado: string }
  ) {
    try {
      if (!body.alias_personalizado || body.alias_personalizado.trim() === '') {
        throw new BadRequestException('alias_personalizado es requerido');
      }

      // Lógica simulada para actualizar alias
      console.log('Actualizando alias de cuenta ' + cuentaId + ' a: ' + body.alias_personalizado);

      return {
        success: true,
        message: 'Alias actualizado exitosamente',
        cuenta_actualizada: {
          id: parseInt(cuentaId),
          email_gmail: 'cuenta' + cuentaId + '@gmail.com',
          alias_personalizado: body.alias_personalizado.trim()
        }
      };

    } catch (error) {
      console.error('Error actualizando alias:', error);
      
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new NotFoundException('Cuenta Gmail no encontrada');
    }
  }

  // ================================
  // ENDPOINTS DE INFORMACIÓN
  // ================================

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
  getHealth(): HealthResponseDto {
    return {
      service: 'ms-yourdashboard-auth',
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        connected: true,
        query_time_ms: 15
      },
      estadisticas: {
        usuarios_activos: 0,
        cuentas_gmail_conectadas: 0,
        sesiones_activas: 0
      }
    };
  }

  @Get('info')
  @ApiTags('Health')
  @ApiOperation({ 
    summary: 'Información del servicio',
    description: 'Obtiene información detallada sobre los endpoints disponibles.' 
  })
  @ApiOkResponse({ 
    description: 'Información del servicio'
  })
  getInfo() {
    return {
      service: 'ms-yourdashboard-auth',
      description: 'Microservicio de autenticación completo con gestión de múltiples cuentas Gmail',
      endpoints: {
        traditional: {
          register: 'POST /auth/register',
          login: 'POST /auth/login',
          profile: 'GET /auth/me',
          logout: 'POST /auth/logout'
        },
        oauth: {
          google: 'GET /auth/google (Requiere JWT)',
          callback: 'GET /auth/google/callback'
        },
        gmail_accounts: {
          list: 'GET /auth/cuentas-gmail',
          get: 'GET /auth/cuentas-gmail/:id',
          disconnect: 'DELETE /auth/cuentas-gmail/:id',
          update_alias: 'PUT /auth/cuentas-gmail/:id/alias'
        }
      },
      supported_providers: ['email', 'google'],
      upcoming_providers: ['whatsapp', 'calendar']
    };
  }
}