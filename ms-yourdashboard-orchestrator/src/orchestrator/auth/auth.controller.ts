// src/orchestrator/auth/auth.controller.ts
import { Controller, Get, Res, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { 
  ApiTags, 
  ApiOperation, 
  ApiOkResponse, 
  ApiExcludeEndpoint,
  ApiInternalServerErrorResponse
} from '@nestjs/swagger';
import { AuthOrchestratorService } from './auth.service';
import { AuthStartResponseDto, AuthErrorResponseDto } from './dto';

@Controller('auth')
@ApiTags('Authentication')
export class AuthOrchestratorController {
  constructor(private readonly authService: AuthOrchestratorService) {}

  /**
   * 🔐 GET /auth/start - Iniciar proceso de autenticación
   */
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

  /**
   * 🔐 GET /auth/google - Redirigir a Google OAuth
   */
  @Get('google')
  @ApiOperation({ 
    summary: 'Iniciar Google OAuth',
    description: 'Redirige al usuario a Google OAuth a través del MS-Auth. Este es el endpoint que debe usar el frontend.'
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
  redirectToGoogleAuth(@Res() res: Response): void {
    console.log(`🔵 ORCHESTRATOR-AUTH - Endpoint /auth/google llamado`);
    
    const authUrl = this.authService.getGoogleAuthUrl();
    
    console.log(`🔵 ORCHESTRATOR-AUTH - Redirigiendo a: ${authUrl}`);
    res.redirect(authUrl);
  }

  /**
   * 🔐 GET /auth/google/callback - Callback de Google OAuth
   */
  @Get('google/callback')
  @ApiOperation({ 
    summary: 'Callback de Google OAuth',
    description: 'Maneja el callback de Google OAuth y redirige al MS-Auth para procesamiento. Endpoint interno usado por Google.'
  })
  @ApiOkResponse({
    description: 'Callback procesado y redirigido exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'string', 
          example: 'Callback procesado correctamente' 
        }
      }
    }
  })
  @ApiInternalServerErrorResponse({ 
    description: 'Error procesando callback',
    type: AuthErrorResponseDto 
  })
  @ApiExcludeEndpoint() // No mostrar en Swagger ya que es callback interno
  handleGoogleCallback(@Req() req: Request, @Res() res: Response): void {
    console.log(`🔵 ORCHESTRATOR-AUTH - Endpoint /auth/google/callback llamado`);
    
    this.authService.handleGoogleCallback(req, res);
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