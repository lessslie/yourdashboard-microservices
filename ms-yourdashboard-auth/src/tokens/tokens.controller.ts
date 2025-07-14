import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { TokensService } from './tokens.service';

@Controller('tokens')
export class TokensController {
  constructor(private tokensService: TokensService) {}

  /**
   * 🔑 GET /tokens/:userId
   * Obtener access token válido para un usuario
   * Este endpoint será usado por otros microservicios
   */
  @Get(':userId')
  async getToken(@Param('userId') userId: string) {
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
  async getStats() {
    return this.tokensService.getTokensStats();
  }

  /**
   * 👥 GET /tokens/users/list
   * Listar usuarios con sus tokens
   */
  @Get('users/list')
  async getUsersList() {
    return this.tokensService.getUsersList();
  }
}