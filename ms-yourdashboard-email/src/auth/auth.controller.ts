import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  
  async googleAuth() {
    // Redirige automáticamente a Google
  }


  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: any, @Res() res: Response) {
    try {
      const result = await this.authService.handleGoogleCallback(req.user);
      
      // ✅ CAMBIO: Devolver JSON en lugar de redirigir
      res.status(200).json({
        success: true,
        message: 'Autorización exitosa',
        userId: result.user.id,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email
        }
      });
      
    } catch (error) {
      console.error('Error en callback de OAuth:', error);
      
      // ✅ CAMBIO: Error como JSON
      res.status(500).json({
        success: false,
        error: 'Error al procesar autorización de Google',
        message: error.message
      });
    }
  }
}
