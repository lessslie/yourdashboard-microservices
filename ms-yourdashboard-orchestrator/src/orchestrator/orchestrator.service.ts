
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrchestratorService {
  private readonly msAuthUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.msAuthUrl = this.configService.get<string>('MS_AUTH_URL') || 'http://localhost:3001';
  }

  /**
   * 🔄 Iniciar proceso de autenticación (redirige al ms-auth)
   */
  startAuthentication() {
    return {
      success: true,
      message: 'Redirigir al ms-auth para autenticación',
      authUrl: `${this.msAuthUrl}/auth/google`,
      instructions: 'El frontend debe redirigir al usuario a esta URL'
    };
  }
}
