import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { TokensService } from './tokens.service';
import { 
  ValidTokenResponse, 
  TokenStats, 
  UsersListResponse 
} from '../auth/interfaces/auth.interfaces';
import { 
  ApiTags, 
  ApiOperation,
  ApiParam,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse
} from '@nestjs/swagger';

@Controller('tokens')
@ApiTags('Tokens')
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  /**
   * 🔑 GET /tokens/:userId
   * Obtener access token válido para un usuario PRINCIPAL
   * LEGACY: Usa la primera cuenta Gmail activa del usuario
   */
  @Get(':userId')
  @ApiOperation({
    summary: 'Obtener token por Usuario Principal (LEGACY)',
    description: 'Obtiene token de la primera cuenta Gmail activa del usuario principal. Recomendado: usar /tokens/gmail/:cuentaGmailId'
  })
  @ApiParam({
    name: 'userId',
    description: 'ID del usuario principal',
    example: '3'
  })
  @ApiOkResponse({
    description: 'Token obtenido exitosamente'
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado o sin cuentas Gmail'
  })
  async getToken(@Param('userId') userId: string): Promise<ValidTokenResponse> {
    if (!userId) {
      throw new NotFoundException('User ID is required');
    }
    
    return this.tokensService.getValidToken(userId);
  }

  /**
   * 🔑 🎯 GET /tokens/gmail/:cuentaGmailId
   * NUEVO: Obtener access token para cuenta Gmail específica
   */
  @Get('gmail/:cuentaGmailId')
  @ApiOperation({
    summary: 'Obtener token por Cuenta Gmail (RECOMENDADO)',
    description: 'Obtiene token para una cuenta Gmail específica. Este es el endpoint recomendado.'
  })
  @ApiParam({
    name: 'cuentaGmailId',
    description: 'ID de la cuenta Gmail específica',
    example: '4'
  })
  @ApiOkResponse({
    description: 'Token de cuenta Gmail obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        accessToken: { type: 'string', example: 'ya29.a0AS3H6N...' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '3', description: 'ID del usuario principal propietario' },
            email: { type: 'string', example: 'agata.morales92@gmail.com' },
            name: { type: 'string', example: 'Les Lie' },
            cuentaGmailId: { type: 'string', example: '4', description: 'ID de la cuenta Gmail específica' }
          }
        },
        renewed: { type: 'boolean', example: false }
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'Cuenta Gmail no encontrada o inactiva'
  })
  @ApiBadRequestResponse({
    description: 'ID de cuenta Gmail inválido'
  })
  async getTokenByGmailAccount(@Param('cuentaGmailId') cuentaGmailId: string): Promise<ValidTokenResponse> {
    if (!cuentaGmailId) {
      throw new NotFoundException('Cuenta Gmail ID is required');
    }
    
    return this.tokensService.getValidTokenByGmailAccount(cuentaGmailId);
  }

  /**
   * 📊 GET /tokens/stats
   * Estadísticas de tokens
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Estadísticas de tokens',
    description: 'Obtiene estadísticas generales de tokens y cuentas Gmail'
  })
  async getStats(): Promise<TokenStats> {
    return this.tokensService.getTokensStats();
  }

  /**
   * 👥 GET /tokens/users/list
   * Listar usuarios con sus tokens
   */
  @Get('users/list')
  @ApiOperation({
    summary: 'Listar usuarios con tokens',
    description: 'Lista todos los usuarios principales y sus cuentas Gmail asociadas'
  })
  async getUsersList(): Promise<UsersListResponse> {
    return this.tokensService.getUsersList();
  }
}