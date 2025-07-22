import { 
  Controller, 
  Get, 
  Post, 
  Delete,
  Put,
  Body,
  Param,
  Headers,
  Req,
  Res,
  Query,
  UnauthorizedException,
  BadRequestException,

} from '@nestjs/common';
import { Response, Request } from 'express';
import { 
  ApiTags, 
  ApiOperation, 
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiExcludeEndpoint,
  ApiInternalServerErrorResponse
} from '@nestjs/swagger';
import { AuthOrchestratorService } from './auth.service';
import { 
  AuthStartResponseDto, 
  AuthErrorResponseDto,
} from './dto';
import { LoginDto, RegisterDto } from './dto/auth-dto';
import { AuthResponseDto, CuentaGmailResponseDto, CuentasGmailResponseDto, ProfileResponseDto } from './dto/auth-response.dto';

@Controller('auth')
@ApiTags('Authentication')
export class AuthOrchestratorController {
  constructor(private readonly authService: AuthOrchestratorService) {}

  // ================================
  // 🎯 ENDPOINTS TRADICIONALES
  // ================================

  /**
   * 📝 POST /auth/register - Registrar nuevo usuario
   */
  @Post('register')
  @ApiOperation({ 
    summary: 'Registrar nuevo usuario',
    description: 'Crear una nueva cuenta con email y contraseña. Coordina con MS-Auth.' 
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
    type: AuthErrorResponseDto
  })
  @ApiConflictResponse({ 
    description: 'Email ya registrado',
    type: AuthErrorResponseDto 
  })
  async register(@Body() registerData: RegisterDto): Promise<AuthResponseDto> {
    console.log(`🔵 ORCHESTRATOR-AUTH - Registro solicitado para: ${registerData.email}`);
    return this.authService.register(registerData);
  }

  /**
   * 🔑 POST /auth/login - Iniciar sesión
   */
  @Post('login')
  @ApiOperation({ 
    summary: 'Iniciar sesión',
    description: 'Autenticarse con email y contraseña. Coordina con MS-Auth.' 
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
    type: AuthErrorResponseDto 
  })
  @ApiUnauthorizedResponse({ 
    description: 'Credenciales incorrectas',
    type: AuthErrorResponseDto 
  })
  async login(@Body() loginData: LoginDto): Promise<AuthResponseDto> {
    console.log(`🔵 ORCHESTRATOR-AUTH - Login solicitado para: ${loginData.email}`);
    return this.authService.login(loginData);
  }

  /**
   * 👤 GET /auth/me - Obtener perfil del usuario
   */
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener perfil del usuario',
    description: 'Obtiene la información del usuario autenticado con sus cuentas Gmail. Requiere JWT token.'
  })
  @ApiOkResponse({
    description: 'Perfil obtenido exitosamente',
    type: ProfileResponseDto
  })
  @ApiUnauthorizedResponse({
    description: 'Token faltante o inválido',
    type: AuthErrorResponseDto
  })
  async getProfile(@Headers('authorization') authHeader: string): Promise<ProfileResponseDto> {
    if (!authHeader) {
      throw new UnauthorizedException('Token de autorización requerido');
    }
    
    console.log(`🔵 ORCHESTRATOR-AUTH - Perfil solicitado`);
    return this.authService.getProfile(authHeader);
  }

  /**
   * 🚪 POST /auth/logout - Cerrar sesión
   */
  @Post('logout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Cerrar sesión',
    description: 'Invalida el JWT token actual. Coordina con MS-Auth.' 
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
    type: AuthErrorResponseDto 
  })
  async logout(@Headers('authorization') authHeader: string) {
    if (!authHeader) {
      throw new UnauthorizedException('Token de autorización requerido');
    }
    
    console.log(`🔵 ORCHESTRATOR-AUTH - Logout solicitado`);
    return this.authService.logout(authHeader);
  }

  // ================================
  // 🎯 OAUTH GOOGLE
  // ================================

  @Get('start')
  @ApiOperation({ 
    summary: 'Iniciar proceso de autenticación',
    description: 'Obtiene las URLs disponibles para iniciar OAuth con Google. Coordina con MS-Auth.'
  })
  @ApiOkResponse({ 
    description: 'URLs de autenticación obtenidas exitosamente',
    type: AuthStartResponseDto
  })
  @ApiInternalServerErrorResponse({ 
    description: 'Error interno del orquestador',
    type: AuthErrorResponseDto 
  })
  startAuth(): AuthStartResponseDto {
    console.log(`🔵 ORCHESTRATOR-AUTH - Endpoint /auth/start llamado`);
    return this.authService.startAuthentication();
  }

  @Get('google')
  @ApiOperation({ 
    summary: 'Iniciar Google OAuth',
    description: 'Redirige al usuario a Google OAuth pasando el JWT token. Frontend debe incluir token en query param.'
  })
  @ApiQuery({
    name: 'token',
    description: 'JWT token del usuario autenticado',
    required: true,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @ApiOkResponse({ 
    description: 'Redirección exitosa a Google OAuth',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'string', 
          example: 'Redirigiendo a Google OAuth...' 
        }
      }
    }
  })
  @ApiInternalServerErrorResponse({ 
    description: 'Error en redirección',
    type: AuthErrorResponseDto 
  })
  redirectToGoogleAuth(
    @Query('token') token: string,
    @Res() res: Response
  ): void {
    if (!token) {
      throw new BadRequestException('Token JWT requerido como query parameter');
    }
    
    console.log(`🔵 ORCHESTRATOR-AUTH - Google OAuth solicitado`);
    
    const authUrl = this.authService.getGoogleAuthUrlWithToken(token);
    
    console.log(`🔵 ORCHESTRATOR-AUTH - Redirigiendo a: ${authUrl}`);
    res.redirect(authUrl);
  }

  @Get('google/callback')
  @ApiOperation({ 
    summary: 'Callback de Google OAuth',
    description: 'Maneja el callback de Google OAuth y redirige al MS-Auth para procesamiento.'
  })
  @ApiExcludeEndpoint()
  handleGoogleCallback(@Req() req: Request, @Res() res: Response): void {
    console.log(`🔵 ORCHESTRATOR-AUTH - Endpoint /auth/google/callback llamado`);
    this.authService.handleGoogleCallback(req, res);
  }

  // ================================
  // 📧 GESTIÓN DE CUENTAS GMAIL
  // ================================

  /**
   * 📧 GET /auth/cuentas-gmail - Listar cuentas Gmail
   */
  @Get('cuentas-gmail')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Listar cuentas Gmail del usuario',
    description: 'Obtiene todas las cuentas Gmail conectadas del usuario autenticado. Coordina con MS-Auth.'
  })
  @ApiOkResponse({
    description: 'Lista de cuentas Gmail obtenida exitosamente',
    type: CuentasGmailResponseDto
  })
  @ApiUnauthorizedResponse({
    description: 'Token faltante o inválido',
    type: AuthErrorResponseDto
  })
  async listarCuentasGmail(@Headers('authorization') authHeader: string): Promise<CuentasGmailResponseDto> {
    if (!authHeader) {
      throw new UnauthorizedException('Token de autorización requerido');
    }
    
    console.log(`🔵 ORCHESTRATOR-AUTH - Listado de cuentas Gmail solicitado`);
    return this.authService.getCuentasGmail(authHeader);
  }

  /**
   * 📧 GET /auth/cuentas-gmail/:id - Obtener cuenta Gmail específica
   */
  @Get('cuentas-gmail/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener cuenta Gmail específica',
    description: 'Obtiene los detalles de una cuenta Gmail específica del usuario. Coordina con MS-Auth.'
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la cuenta Gmail',
    example: '4'
  })
  @ApiOkResponse({
    description: 'Cuenta Gmail obtenida exitosamente',
    type: CuentaGmailResponseDto
  })
  @ApiNotFoundResponse({
    description: 'Cuenta Gmail no encontrada',
    type: AuthErrorResponseDto
  })
  async obtenerCuentaGmail(
    @Headers('authorization') authHeader: string,
    @Param('id') cuentaId: string
  ): Promise<CuentaGmailResponseDto> {
    if (!authHeader) {
      throw new UnauthorizedException('Token de autorización requerido');
    }
    
    console.log(`🔵 ORCHESTRATOR-AUTH - Cuenta Gmail ${cuentaId} solicitada`);
    return this.authService.getCuentaGmail(authHeader, cuentaId);
  }

  /**
   * 🗑️ DELETE /auth/cuentas-gmail/:id - Desconectar cuenta Gmail
   */
  @Delete('cuentas-gmail/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Desconectar cuenta Gmail',
    description: 'Desconecta y elimina una cuenta Gmail específica del usuario. Coordina con MS-Auth.'
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la cuenta Gmail a desconectar',
    example: '4'
  })
  @ApiOkResponse({
    description: 'Cuenta Gmail desconectada exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Cuenta Gmail desconectada exitosamente' },
        cuenta_eliminada: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 4 },
            email_gmail: { type: 'string', example: 'usuario@gmail.com' }
          }
        }
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'Cuenta Gmail no encontrada',
    type: AuthErrorResponseDto
  })
  async desconectarCuentaGmail(
    @Headers('authorization') authHeader: string,
    @Param('id') cuentaId: string
  ) {
    if (!authHeader) {
      throw new UnauthorizedException('Token de autorización requerido');
    }
    
    console.log(`🔵 ORCHESTRATOR-AUTH - Desconexión de cuenta Gmail ${cuentaId} solicitada`);
    return this.authService.desconectarCuentaGmail(authHeader, cuentaId);
  }

  /**
   * 🏷️ PUT /auth/cuentas-gmail/:id/alias - Actualizar alias
   */
  @Put('cuentas-gmail/:id/alias')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Actualizar alias de cuenta Gmail',
    description: 'Actualiza el alias personalizado de una cuenta Gmail. Coordina con MS-Auth.'
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la cuenta Gmail',
    example: '4'
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
    description: 'Alias actualizado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Alias actualizado exitosamente' },
        cuenta_actualizada: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 4 },
            email_gmail: { type: 'string', example: 'usuario@gmail.com' },
            alias_personalizado: { type: 'string', example: 'Gmail Trabajo' }
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Alias inválido o faltante',
    type: AuthErrorResponseDto
  })
  async actualizarAliasCuenta(
    @Headers('authorization') authHeader: string,
    @Param('id') cuentaId: string,
    @Body() body: { alias_personalizado: string }
  ) {
    if (!authHeader) {
      throw new UnauthorizedException('Token de autorización requerido');
    }
    
    if (!body.alias_personalizado || body.alias_personalizado.trim() === '') {
      throw new BadRequestException('alias_personalizado es requerido');
    }
    
    console.log(`🔵 ORCHESTRATOR-AUTH - Actualización de alias para cuenta ${cuentaId}`);
    return this.authService.actualizarAliasCuenta(authHeader, cuentaId, body);
  }

  /**
   * 📊 GET /auth/health - Health check del módulo auth
   */
  @Get('health')
  @ApiOperation({ 
    summary: 'Estado del módulo de autenticación',
    description: 'Verifica el estado del módulo de autenticación y su conectividad con MS-Auth.'
  })
  @ApiOkResponse({ 
    description: 'Estado del módulo obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        service: { type: 'string', example: 'orchestrator-auth-module' },
        status: { type: 'string', example: 'OK' },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00Z' },
        msAuthConnection: {
          type: 'object',
          properties: {
            url: { type: 'string', example: 'http://localhost:3001' },
            status: { type: 'string', example: 'configured' }
          }
        }
      }
    }
  })
  getAuthHealth() {
    console.log(`🔵 ORCHESTRATOR-AUTH - Health check solicitado`);
    return this.authService.checkAuthHealth();
  }
}