import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { TokensService } from './tokens.service';
import { 
  ValidTokenResponse, 
  TokenStats, 
  UsersListResponse 
} from '../auth/interfaces/auth.interfaces';

@Controller('tokens')
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  /**
   * 🔑 GET /tokens/:userId
   * Obtener access token válido para un usuario
   * Este endpoint será usado por otros microservicios
   */
  @Get(':userId')
  async getToken(@Param('userId') userId: string): Promise<ValidTokenResponse> {
    if (!userId) {
      throw new NotFoundException('User ID is required');
    }
    
    return this.tokensService.getValidToken(userId);
  }

  /**
   * 📊 GET /tokens/stats
   * Estadísticas de tokens
   */
  @Get('stats')
  async getStats(): Promise<TokenStats> {
    return this.tokensService.getTokensStats();
  }

  /**
   * 👥 GET /tokens/users/list
   * Listar usuarios con sus tokens
   */
  @Get('users/list')
  async getUsersList(): Promise<UsersListResponse> {
    return this.tokensService.getUsersList();
  }
}