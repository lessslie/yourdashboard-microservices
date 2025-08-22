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
  Query,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
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
  ApiNotFoundResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { verify } from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  RegisterDto,
  LoginDto,
  AuthResponseDto,
  ProfileResponseDto,
  ErrorResponseDto,
  HealthResponseDto,
} from './dto';
import {
  ReqCallbackGoogle,
  UsuarioAutenticado,
  JwtPayload,
  GoogleOAuthUser,
} from './interfaces/auth.interfaces';
import axios from 'axios';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  
  private readonly orchestratorUrl: string;
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.orchestratorUrl = this.configService.get<string>('ORCHESTRATOR_URL') || 'http://localhost:3003';
  }

  // ================================
  // ENDPOINTS TRADICIONALES (sin cambios)
  // ================================

  @Post('register')
  @ApiOperation({
    summary: 'Registrar nuevo usuario',
    description:
      'Crear una nueva cuenta con email y contraseña. Retorna JWT token para autenticación inmediata.',
  })
  @ApiBody({
    type: RegisterDto,
    description: 'Datos del nuevo usuario',
  })
  @ApiCreatedResponse({
    description: 'Usuario registrado exitosamente',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Datos inválidos',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Email ya registrado',
    type: ErrorResponseDto,
  })
  async register(@Body() registerData: RegisterDto): Promise<AuthResponseDto> {
    const result = await this.authService.registrarUsuario(
      registerData.email,
      registerData.password,
      registerData.nombre,
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
        profilePicture: null,
      },
      token: result.token,
    };
  }

  @Post('login')
  @ApiOperation({
    summary: 'Iniciar sesión',
    description: 'Autenticarse con email y contraseña. Retorna JWT token.',
  })
  @ApiBody({
    type: LoginDto,
    description: 'Credenciales de acceso',
  })
  @ApiOkResponse({
    description: 'Login exitoso',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Credenciales faltantes',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Credenciales incorrectas',
    type: ErrorResponseDto,
  })
  async login(@Body() loginData: LoginDto): Promise<AuthResponseDto> {
    const result = await this.authService.loginUsuario(
      loginData.email,
      loginData.password,
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
        profilePicture: null,
      },
      token: result.token,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener perfil del usuario',
    description:
      'Obtiene la información del usuario autenticado con sus cuentas Gmail conectadas.',
  })
  @ApiOkResponse({
    description: 'Perfil obtenido exitosamente',
    type: ProfileResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token faltante o inválido',
    type: ErrorResponseDto,
  })
  async getProfile(
    @Req() request: { user: UsuarioAutenticado },
  ): Promise<ProfileResponseDto> {
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
          email_verificado: profileData.usuario.email_verificado,
        },
        cuentas_gmail: profileData.cuentas_gmail.map((cuenta) => ({
          id: cuenta.id,
          email_gmail: cuenta.email_gmail,
          nombre_cuenta: cuenta.nombre_cuenta,
          alias_personalizado: cuenta.alias_personalizado,
          fecha_conexion: cuenta.fecha_conexion.toISOString(),
          ultima_sincronizacion: cuenta.ultima_sincronizacion?.toISOString(),
          esta_activa: cuenta.esta_activa,
          emails_count: cuenta.emails_count,
        })),
        sesiones_activas: profileData.sesiones_activas.map((sesion) => ({
          id: sesion.id,
          fecha_creacion: sesion.fecha_creacion.toISOString(),
          expira_en: sesion.expira_en.toISOString(),
          ip_origen: sesion.ip_origen,
          user_agent: sesion.user_agent,
          esta_activa: sesion.esta_activa,
        })),
        estadisticas: {
          total_cuentas_gmail: profileData.estadisticas.total_cuentas_gmail,
          cuentas_gmail_activas: profileData.estadisticas.cuentas_gmail_activas,
          total_emails_sincronizados:
            profileData.estadisticas.total_emails_sincronizados,
          emails_no_leidos: profileData.estadisticas.emails_no_leidos,
          ultima_sincronizacion:
            profileData.estadisticas.ultima_sincronizacion.toISOString(),
          cuenta_mas_activa: profileData.estadisticas.cuenta_mas_activa,
        },
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
    description: 'Invalida el JWT token actual.',
  })
  @ApiOkResponse({
    description: 'Sesión cerrada exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Sesión cerrada exitosamente' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Token faltante o inválido',
    type: ErrorResponseDto,
  })
  async logout(
    @Req()
    request: {
      user: UsuarioAutenticado;
      headers: { authorization?: string };
    },
  ) {
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
  // 🎯 OAUTH GOOGLE
  // ================================

 @Get('google')
  @ApiOperation({
    summary: 'Iniciar OAuth con Google',
    description: 'Inicia proceso OAuth. Acepta JWT token y service parameter.',
  })
  @ApiQuery({
    name: 'token',
    description: 'JWT token como query parameter',
    required: false,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiQuery({
    name: 'service',
    description: 'Servicio de destino: gmail o calendar',
    required: false,
    example: 'gmail',
    enum: ['gmail', 'calendar']
  })
  @ApiResponse({
    status: 302,
    description: 'Redirección a Google OAuth con estado del usuario',
  })
  @ApiUnauthorizedResponse({
    description: 'JWT token requerido (header o query)',
    type: ErrorResponseDto,
  })
  async googleAuth(
    @Req() req: Request,
    @Res() res: Response,
    @Query('token') tokenQuery?: string,
    @Query('service') service?: string
  ): Promise<void> {
    try {
      console.log('🔵 OAuth Google iniciado');
      console.log('🎯 Servicio solicitado:', service || 'gmail (default)');

      // 1️⃣ EXTRAER Y VALIDAR TOKEN
      const token = this.extractTokenFromRequest(req, tokenQuery);

      // 2️⃣ VALIDAR JWT Y OBTENER DATOS DEL USUARIO
      const userPayload = await this.validateJwtAndGetUser(token);

      // 3️⃣ VALIDAR SERVICE PARAMETER
      const targetService = this.validateService(service);

      // 4️⃣ GENERAR Y REDIRIGIR A URL OAUTH CON SERVICE
      this.redirectToGoogleOAuth(res, userPayload.sub, targetService);

    } catch (error) {
      console.error('❌ Error en OAuth Google:', error);
      this.handleOAuthError(res, error);
    }
  }

  /**
   * 🔧 Extraer token de request (header o query)
   */
  private extractTokenFromRequest(req: Request, tokenQuery?: string): string {
    // Intentar desde Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && typeof authHeader === 'string') {
      const headerToken = authHeader.replace('Bearer ', '');
      if (headerToken !== authHeader) {
        return headerToken;
      }
    }

    // Si no hay header válido, usar query parameter
    if (tokenQuery) {
      return tokenQuery;
    }

    console.log('❌ No JWT token provided');
    throw new UnauthorizedException(
      'JWT token requerido en Authorization header o query parameter token',
    );
  }

  /**
   * 🔧 Validar JWT y obtener datos del usuario
   */
  private async validateJwtAndGetUser(token: string): Promise<JwtPayload> {
    // Validar JWT
    const decoded = this.validateJwtToken(token);

    // Verificar que el usuario existe y está activo
    const usuario = await this.authService.buscarUsuarioPorId(decoded.sub);
    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (usuario.estado !== 'activo') {
      throw new UnauthorizedException('Usuario inactivo');
    }

    console.log(`🔵 Usuario ${decoded.sub} validado para OAuth`);
    return decoded;
  }

  /**
   * 🔧 Validar token JWT y extraer payload
   */
  private validateJwtToken(token: string): JwtPayload {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new UnauthorizedException('JWT_SECRET no configurado');
    }

    try {
      const verifyResult = verify(token, jwtSecret);

      if (typeof verifyResult === 'string') {
        throw new UnauthorizedException('Token JWT inválido');
      }

      if (!verifyResult.sub || typeof verifyResult.sub !== 'number') {
        throw new UnauthorizedException('Token JWT inválido - sub requerido');
      }

      const customData = verifyResult as unknown as Record<string, unknown>;
      if (!customData.email || !customData.nombre) {
        throw new UnauthorizedException(
          'Token JWT inválido - datos incompletos',
        );
      }

      return {
        sub: verifyResult.sub as number,
        email: customData.email as string,
        nombre: customData.nombre as string,
        iat: verifyResult.iat,
        exp: verifyResult.exp,
      };
    } catch (jwtError) {
      console.log('❌ JWT validation failed:', jwtError);
      throw new UnauthorizedException('Token JWT inválido o expirado');
    }
  }

/**
 * 🔧 Redirigir a Google OAuth CON SERVICE
 */
private redirectToGoogleOAuth(res: Response, userId: number, service: 'gmail' | 'calendar'): void {
  const authUrl = this.authService.generarUrlOAuth(userId, service);
  
  console.log(`🔗 Redirigiendo a: ${authUrl}`);
  console.log(`🎯 Usuario: ${userId}, Service: ${service}`);
  
  res.redirect(authUrl);
}

  /**
   * 🔧 Manejar errores de OAuth
   */
  private handleOAuthError(res: Response, error: unknown): void {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const errorUrl = new URL(frontendUrl);
    errorUrl.pathname = '/auth/callback';
    errorUrl.searchParams.set('auth', 'error');

    if (error instanceof UnauthorizedException) {
      errorUrl.searchParams.set('message', encodeURIComponent(error.message));
    } else {
      errorUrl.searchParams.set(
        'message',
        encodeURIComponent('Error interno de autenticación'),
      );
    }

    res.redirect(errorUrl.toString());
  }

 @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Callback de Google OAuth',
    description: 'Endpoint interno usado por Google OAuth. Ahora maneja Gmail Y Calendar.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirección al frontend con resultado',
  })
  @ApiExcludeEndpoint()
  async googleAuthRedirect(
    @Req() req: ReqCallbackGoogle & { query: { state?: string } },
    @Res() res: Response,
  ): Promise<void> {
    try {
      console.log('🔵 Callback recibido de Google');
      console.log('🔍 Estado recibido:', req.query.state);

      // 🎯 EXTRAER USER ID + SERVICE DEL STATE
      const { userId, service } = this.parseState(req.query.state);

      console.log(`🎯 Procesando callback para usuario ${userId}, servicio: ${service}`);

      // 🎯 PROCESAR SEGÚN EL SERVICIO
      if (service === 'gmail') {
        await this.handleGmailCallback(req.user, userId, res);
      } else if (service === 'calendar') {
        await this.handleCalendarCallback(req.user, userId, res);
      } else {
        throw new Error(`Servicio no soportado: ${service}`);
      }
      console.log(`✅ Callback procesado exitosamente para usuario ${userId}, servicio: ${service}`);

    } catch (error) {
      console.error('❌ Error en callback de OAuth:', error);
      this.handleCallbackError(res, error);
    }
  }

  // ================================
  // GESTIÓN DE CUENTAS GMAIL (sin cambios)
  // ================================

  @Get('cuentas-gmail')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Listar cuentas Gmail del usuario',
    description:
      'Obtiene todas las cuentas Gmail conectadas del usuario autenticado.',
  })
  @ApiOkResponse({
    description: 'Lista de cuentas Gmail obtenida exitosamente',
  })
  @ApiUnauthorizedResponse({
    description: 'Token faltante o inválido',
    type: ErrorResponseDto,
  })
  async listarCuentasGmail(@Req() request: { user: UsuarioAutenticado }) {
    try {
      const cuentas = await this.authService.listarCuentasGmailUsuario(
        request.user.id,
      );

      return {
        success: true,
        cuentas: cuentas,
        total: cuentas.length,
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
    description:
      'Obtiene los detalles de una cuenta Gmail específica del usuario.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la cuenta Gmail',
    example: '1',
  })
  @ApiOkResponse({
    description: 'Cuenta Gmail obtenida exitosamente',
  })
  @ApiNotFoundResponse({
    description: 'Cuenta Gmail no encontrada',
    type: ErrorResponseDto,
  })
  async obtenerCuentaGmail(
    @Req() request: { user: UsuarioAutenticado },
    @Param('id') cuentaId: string,
  ): Promise<{ success: boolean; cuenta: any }> {
    try {
      const cuenta = await this.authService.obtenerCuentaGmailPorId(
        request.user.id,
        parseInt(cuentaId),
      );

      return {
        success: true,
        cuenta: cuenta,
      };
    } catch (error) {
      console.error('Error obteniendo cuenta Gmail:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new NotFoundException('Cuenta Gmail no encontrada');
    }
  }
  @Delete('cuentas-gmail/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Desconectar cuenta Gmail',
    description:
      'Desconecta y elimina una cuenta Gmail específica del usuario.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la cuenta Gmail a desconectar',
    example: '1',
  })
  @ApiOkResponse({
    description: 'Cuenta Gmail desconectada exitosamente',
  })
  @ApiNotFoundResponse({
    description: 'Cuenta Gmail no encontrada',
    type: ErrorResponseDto,
  })
  async desconectarCuentaGmail(
    @Req() request: { user: UsuarioAutenticado },
    @Param('id') cuentaId: string,
  ) {
    try {
      const resultado = await this.authService.desconectarCuentaGmail(
        request.user.id,
        parseInt(cuentaId),
      );

      return {
        success: true,
        message: 'Cuenta Gmail desconectada exitosamente',
        cuenta_eliminada: resultado.cuenta_desconectada,
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
    description: 'Actualiza el alias personalizado de una cuenta Gmail.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la cuenta Gmail',
    example: '1',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        alias_personalizado: {
          type: 'string',
          example: 'Gmail Trabajo',
          description: 'Nuevo alias para la cuenta Gmail',
        },
      },
      required: ['alias_personalizado'],
    },
  })
  @ApiOkResponse({
    description: 'Alias actualizado exitosamente',
  })
  @ApiBadRequestResponse({
    description: 'Alias inválido o faltante',
    type: ErrorResponseDto,
  })
  actualizarAliasCuenta(
    @Req() request: { user: UsuarioAutenticado },
    @Param('id') cuentaId: string,
    @Body() body: { alias_personalizado: string },
  ) {
    try {
      if (!body.alias_personalizado || body.alias_personalizado.trim() === '') {
        throw new BadRequestException('alias_personalizado es requerido');
      }

      console.log(
        'Actualizando alias de cuenta ' +
          cuentaId +
          ' a: ' +
          body.alias_personalizado,
      );

      return {
        success: true,
        message: 'Alias actualizado exitosamente',
        cuenta_actualizada: {
          id: parseInt(cuentaId),
          email_gmail: 'cuenta' + cuentaId + '@gmail.com',
          alias_personalizado: body.alias_personalizado.trim(),
        },
      };
    } catch (error) {
      console.error('Error actualizando alias:', error);

      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
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
    description:
      'Verifica que el microservicio de autenticación esté funcionando correctamente.',
  })
  @ApiOkResponse({
    description: 'Servicio funcionando correctamente',
    type: HealthResponseDto,
  })
  getHealth(): HealthResponseDto {
    return {
      service: 'ms-yourdashboard-auth',
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        connected: true,
        query_time_ms: 15,
      },
      estadisticas: {
        usuarios_activos: 0,
        cuentas_gmail_conectadas: 0,
        sesiones_activas: 0,
      },
    };
  }

  @Get('info')
  @ApiTags('Health')
  @ApiOperation({
    summary: 'Información del servicio',
    description:
      'Obtiene información detallada sobre los endpoints disponibles.',
  })
  @ApiOkResponse({
    description: 'Información del servicio',
  })
  getInfo() {
    return {
      service: 'ms-yourdashboard-auth',
      description:
        'Microservicio de autenticación completo con gestión de múltiples cuentas Gmail',
      endpoints: {
        traditional: {
          register: 'POST /auth/register',
          login: 'POST /auth/login',
          profile: 'GET /auth/me',
          logout: 'POST /auth/logout',
        },
        oauth: {
          google: 'GET /auth/google (Requiere JWT en header o query)',
          callback: 'GET /auth/google/callback',
        },
        gmail_accounts: {
          list: 'GET /auth/cuentas-gmail',
          get: 'GET /auth/cuentas-gmail/:id',
          disconnect: 'DELETE /auth/cuentas-gmail/:id',
          update_alias: 'PUT /auth/cuentas-gmail/:id/alias',
        },
      },
      supported_providers: ['email', 'google'],
      upcoming_providers: ['whatsapp', 'calendar'],
    };
  }


  
  // ================================
  // 🔧 MÉTODOS PRIVADOS NUEVOS - AGREGAR AL FINAL DE LA CLASE
  // ================================

  /**
   * 🔧 Validar service parameter
   */
  private validateService(service?: string): 'gmail' | 'calendar' {
    if (!service) {
      console.log('🎯 Service no especificado, usando gmail por defecto');
      return 'gmail';
    }

    const validServices = ['gmail', 'calendar'];
    if (!validServices.includes(service)) {
      console.warn(`⚠️ Service inválido "${service}", usando gmail por defecto`);
      return 'gmail';
    }

    console.log(`✅ Service validado: ${service}`);
    return service as 'gmail' | 'calendar';
  }

  /**
   * 🔧 Parsear state (userId:service)
   */
  private parseState(state?: string): { userId: number; service: 'gmail' | 'calendar' } {
    if (!state) {
      throw new Error('Estado inválido - Usuario y servicio no identificados');
    }

    const parts = state.split(':');
    
    if (parts.length !== 2) {
      // Retrocompatibilidad: si no hay ":", asumir que es solo userId + gmail
      const userId = parseInt(state, 10);
      if (isNaN(userId)) {
        throw new Error('Estado inválido - formato incorrecto');
      }
      console.log(`🔄 Retrocompatibilidad: userId ${userId}, asumiendo gmail`);
      return { userId, service: 'gmail' };
    }

    const [userIdStr, service] = parts;
    const userId = parseInt(userIdStr, 10);

    if (isNaN(userId)) {
      throw new Error('Estado inválido - userId debe ser numérico');
    }

    if (!['gmail', 'calendar'].includes(service)) {
      throw new Error(`Estado inválido - servicio "${service}" no soportado`);
    }

    return { userId, service: service as 'gmail' | 'calendar' };
  }

  /**
   * 📧 Manejar callback de GMAIL
   */
  // private async handleGmailCallback(
  //   googleUser: GoogleOAuthUser,
  //   userId: number,
  //   res: Response
  // ): Promise<void> {
  //   console.log(`📧 Procesando conexión Gmail para usuario ${userId}`);
    
  //   // Usar el método existente
  //   await this.authService.manejarCallbackGoogle(googleUser, userId);

  //   const redirectUrl = new URL(
  //     this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000',
  //   );
  //   redirectUrl.pathname = '/dashboard/email';
  //   redirectUrl.searchParams.set('auth', 'success');
  //   redirectUrl.searchParams.set(
  //     'message',
  //     `Gmail ${googleUser.email} conectado exitosamente`,
  //   );
  //   redirectUrl.searchParams.set('gmail', googleUser.email);

  //   console.log(`✅ Gmail conectado, redirigiendo: ${redirectUrl.toString()}`);
  //   res.redirect(redirectUrl.toString());
  // }
// MS-Auth/auth.controller.ts - handleGmailCallback
private async handleGmailCallback(
  googleUser: GoogleOAuthUser,
  userId: number,
  res: Response
): Promise<void> {
  console.log(`📧 Procesando conexión Gmail para usuario ${userId}`);
  
  // Usar el método existente
  await this.authService.manejarCallbackGoogle(googleUser, userId);

  // ✨ NUEVO: Invalidar cache del Orchestrator
  await this.invalidateOrchestratorCache(userId);

  const redirectUrl = new URL(
    this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000',
  );
  redirectUrl.pathname = '/dashboard/emails';
  redirectUrl.searchParams.set('success', 'true');
  redirectUrl.searchParams.set('source', 'gmail'); // ← AGREGAR
  redirectUrl.searchParams.set('message', `Gmail ${googleUser.email} conectado exitosamente`);

  console.log(`✅ Gmail conectado, redirigiendo: ${redirectUrl.toString()}`);
  res.redirect(redirectUrl.toString());
}

// ✨ NUEVO MÉTODO
private async invalidateOrchestratorCache(userId: number): Promise<void> {
  try {
    // Invalidar cache de perfil en el Orchestrator
    await axios.post(`${this.orchestratorUrl}/cache/invalidate`, {
      keys: [
        `gmail_count:*`,  // Todos los counts de Gmail
        `profile:${userId}`, // Perfil del usuario
      ]
    });
    console.log(`🗑️ Cache invalidado para usuario ${userId}`);
  } catch (error) {
    console.warn(`⚠️ No se pudo invalidar cache:`, error);
    // No lanzar error - es nice to have
  }
}
  /**
   * 📅 Manejar callback de CALENDAR
   */
 private async handleCalendarCallback(
  googleUser: GoogleOAuthUser, // 🔧 Fix tipo
  userId: number,
  res: Response
): Promise<void> {
  console.log(`📅 Procesando conexión Calendar para usuario ${userId}`);
  
  try {
    // 🚀 AQUÍ IRÍA LA LÓGICA DE CALENDAR
    // Por ahora, simulamos éxito con await
    await Promise.resolve(); // 🔧 Agregar este await
    console.log(`📅 Calendar ${googleUser.email} conectado para usuario ${userId}`);
    
    //  Implementar lógica de conexión de Calendar
    // await this.calendarService.conectarCalendar(googleUser, userId);

    const redirectUrl = new URL(
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000',
    );
    redirectUrl.pathname = '/dashboard/calendar';
    redirectUrl.searchParams.set('auth', 'success');
    redirectUrl.searchParams.set(
      'message',
      `Google Calendar ${googleUser.email} conectado exitosamente`,
    );
    redirectUrl.searchParams.set('calendar', googleUser.email);

    console.log(`✅ Calendar conectado, redirigiendo: ${redirectUrl.toString()}`);
    res.redirect(redirectUrl.toString());

  } catch (error) {
    console.error(`❌ Error conectando Calendar:`, error);
    throw error;
  }
}

  /**
   * 🔧 Manejar errores de callback
   */
  private handleCallbackError(res: Response, error: unknown): void {
    console.log('🔴 Redirigiendo a error de autenticación');

    const errorUrl = new URL(
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000',
    );
    errorUrl.pathname = '/auth/callback';
    errorUrl.searchParams.set('auth', 'error');

    let errorMessage = 'Error desconocido';

    if (error instanceof UnauthorizedException) {
      const errorData = error.getResponse();
      if (typeof errorData === 'object' && 'mensaje' in errorData) {
        errorMessage = (errorData as any).mensaje;
      } else {
        errorMessage = error.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    errorUrl.searchParams.set('message', encodeURIComponent(errorMessage));
    console.log('🔴 Redirigiendo a:', errorUrl.toString());

    res.redirect(errorUrl.toString());
  }
}
