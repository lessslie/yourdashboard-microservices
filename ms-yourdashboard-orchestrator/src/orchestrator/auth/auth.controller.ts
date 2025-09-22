import { 
  Controller, 
  Get, 
  Post, 
  Delete,
  Put,
  Body,
  Param,
  Req,
  Res,
  Query,
  UnauthorizedException,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { Request, Response } from 'express';
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
  ApiInternalServerErrorResponse,
  ApiForbiddenResponse
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
  @HttpCode(200)
 @ApiOperation({
  summary: '🔑 Iniciar sesión con perfil completo',
  description: `
    **Autenticación optimizada que incluye:**
    
    - ✅ Token JWT para autenticación
    - 👤 Datos básicos del usuario (compatibilidad)
    - 📧 Lista completa de cuentas Gmail conectadas
    - 📊 Estadísticas de emails y eventos sincronizados
    - 🔐 Sesiones activas del usuario
    
    **Beneficio:** Elimina la necesidad de llamar a /auth/me después del login.
  `,
})
  @ApiBody({ 
    type: LoginDto,
    description: 'Credenciales de acceso'
  })
 @ApiOkResponse({
  description: 'Login exitoso con perfil completo - incluye token JWT, datos básicos del usuario, cuentas Gmail asociadas y estadísticas',
  type: AuthResponseDto,
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
  async getProfile(@Req() req: Request): Promise<ProfileResponseDto> {
    const authHeader = req.headers?.authorization;
    
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
  async logout(@Req() req: Request) {
    const authHeader = req.headers?.authorization;
    
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
    @Res() res: Response,
    @Query('service') service?: string,
  ): void {
    if (!token) {
      throw new BadRequestException('Token JWT requerido como query parameter');
    }
    
    console.log(`🔵 ORCHESTRATOR-AUTH - Google OAuth solicitado`);
  console.log(`🎯 ORCHESTRATOR - Service: ${service || 'gmail (default)'}`);
  console.log(`🔍 ORCHESTRATOR - Llamando getGoogleAuthUrlWithToken con: token=${!!token}, service=${service}`);

    
    const authUrl = this.authService.getGoogleAuthUrlWithToken(token, service);
    
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
    description: 'Obtiene todas las cuentas Gmail conectadas del usuario principal autenticado. Coordina con MS-Auth.'
  })
  @ApiOkResponse({
    description: 'Lista de cuentas Gmail obtenida exitosamente',
    type: CuentasGmailResponseDto
  })
  @ApiUnauthorizedResponse({
    description: 'Token faltante o inválido',
    type: AuthErrorResponseDto,
    
  })
  async listarCuentasGmail(@Req() req: Request): Promise<CuentasGmailResponseDto> {
    const authHeader = req.headers?.authorization;
    
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
    example: 'e5a3d40e-3700-4f7a-b962-e789ed794ce0'
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
    @Req() req: Request,
    @Param('id') cuentaId: string
  ): Promise<CuentaGmailResponseDto> {
    const authHeader = req.headers?.authorization;
    
    if (!authHeader) {
      throw new UnauthorizedException('Token de autorización requerido');
    }
    
    console.log(`🔵 ORCHESTRATOR-AUTH - Cuenta Gmail ${cuentaId} solicitada`);
    return this.authService.getCuentaGmail(authHeader, cuentaId);
  }


  /**
   * 🗑️ DELETE /auth/cuentas-gmail/{id} - Desconectar cuenta Gmail
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
    example: 'c7c1c4b7-04a1-4350-9c39-c1d165de88c8'
  })
  @ApiOkResponse({
    description: 'Cuenta Gmail desconectada exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Cuenta Gmail desconectada exitosamente' }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'Token faltante o inválido',
    type: AuthErrorResponseDto
  })
  @ApiNotFoundResponse({
    description: 'Cuenta Gmail no encontrada',
    type: AuthErrorResponseDto
  })
  async desconectarCuentaGmail(
    @Req() req: Request,
    @Param('id') cuentaId: string
  ) {
    const authHeader = req.headers?.authorization;
    
    if (!authHeader) {
      throw new UnauthorizedException('Token de autorización requerido');
    }
    
    console.log(`🔵 ORCHESTRATOR-AUTH - Desconexión cuenta Gmail ${cuentaId} solicitada`);
    return this.authService.desconectarCuentaGmail(authHeader, cuentaId);
  }

  /**
   * 🗑️ DELETE /auth/users/{id} - Eliminar usuario principal completamente
   */
  @Delete('users/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Eliminar usuario principal completamente',
    description: `
      **⚠️ OPERACIÓN DESTRUCTIVA ⚠️**
      
      Elimina completamente al usuario principal y TODA su data asociada:
      - ✅ Usuario principal
      - ✅ Todas las cuentas Gmail asociadas  
      - ✅ Todos los emails sincronizados
      - ✅ Todos los eventos sincronizados
      - ✅ Todas las sesiones JWT activas
      
      **Esta operación NO se puede deshacer.**
      
      **Seguridad:** Solo el propio usuario puede eliminar su cuenta.
      
      **Coordina con MS-Auth** para realizar la eliminación completa.
    `
  })
  @ApiParam({
    name: 'id',
    description: 'ID del usuario principal a eliminar',
    example: 'e5a3d40e-3700-4f7a-b962-e789ed794ce0'
  })
  @ApiOkResponse({
    description: 'Usuario eliminado completamente con estadísticas detalladas',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        source: { type: 'string', example: 'orchestrator' },
        message: { type: 'string', example: 'Usuario principal eliminado completamente' },
        usuario_eliminado: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'e5a3d40e-3700-4f7a-b962-e789ed794ce0' },
            email: { type: 'string', example: 'usuario@email.com' },
            nombre: { type: 'string', example: 'Usuario Ejemplo' },
            fecha_registro: { type: 'string', example: '2025-01-15T10:30:00Z' }
          }
        },
        data_eliminada: {
          type: 'object',
          properties: {
            cuentas_gmail: { type: 'number', example: 2 },
            emails_sincronizados: { type: 'number', example: 1547 },
            eventos_sincronizados: { type: 'number', example: 89 },
            sesiones_activas: { type: 'number', example: 3 },
            cuentas_gmail_eliminadas: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email_gmail: { type: 'string' }
                }
              },
              example: [
                { id: 'cuenta-uuid-1', email_gmail: 'personal@gmail.com' },
                { id: 'cuenta-uuid-2', email_gmail: 'trabajo@gmail.com' }
              ]
            }
          }
        },
        eliminado_en: { type: 'string', example: '2025-09-22T15:30:00Z' }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'Token faltante o inválido',
    type: AuthErrorResponseDto
  })
  @ApiForbiddenResponse({
    description: 'Solo puedes eliminar tu propia cuenta',
    type: AuthErrorResponseDto
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado',
    type: AuthErrorResponseDto
  })
  @ApiInternalServerErrorResponse({
    description: 'Error interno del servidor',
    type: AuthErrorResponseDto
  })
  async deleteUser(
    @Req() req: Request,
    @Param('id') userId: string
  ) {
    const authHeader = req.headers?.authorization;
    
    if (!authHeader) {
      throw new UnauthorizedException('Token de autorización requerido');
    }
    
    console.log(`🔵 ORCHESTRATOR-AUTH - Eliminación de usuario ${userId} solicitada`);
    return this.authService.deleteUser(authHeader, userId);
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
    example: 'e5a3d40e-3700-4f7a-b962-e789ed794ce0'
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
            id: { type: 'string', example: 'e5a3d40e-3700-4f7a-b962-e789ed794ce0' },
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
    @Req() req: Request,
    @Param('id') cuentaId: string,
    @Body() body: { alias_personalizado: string }
  ) {
    const authHeader = req.headers?.authorization;
    
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