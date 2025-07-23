// src/auth/guards/google-oauth.guard.ts
import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GoogleOAuthUser } from '../interfaces/auth.interfaces';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
private readonly logger = new Logger(GoogleOAuthGuard.name);

constructor() {
    super();
}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      this.logger.log('🔐 Initiating Google OAuth flow...');
      
      // Ejecutar la estrategia de Passport Google
      const result = await super.canActivate(context);
      
      if (result) {
        this.logger.log('✅ Google OAuth guard passed');
      } else {
        this.logger.warn('🚫 Google OAuth guard failed');
      }
      
      return result as boolean;
    } catch (error) {
      this.logger.error('❌ Error in Google OAuth guard:', error);
      throw error;
    }
  }

  // Sobrescribir handleRequest con la signatura correcta que espera Passport
  handleRequest<TUser = GoogleOAuthUser>(
    err: Error | null, 
    user: TUser | false
  ): TUser {
    try {
      // Si hay error en el proceso OAuth
      if (err) {
        this.logger.error('❌ Google OAuth error:', err);
        throw err;
      }

      // Si no se obtuvo usuario válido de Google
      if (!user) {
        this.logger.warn('🚫 No user returned from Google OAuth');
        throw new Error('No se pudo autenticar con Google');
      }

      // Type guard para validar que user tiene la estructura esperada
      const googleUser = user as unknown as Record<string, unknown>;
      
      // Validar propiedades requeridas
      if (!this.isValidGoogleUser(googleUser)) {
        this.logger.warn('🚫 Incomplete user data from Google:', {
          hasGoogleId: !!googleUser.googleId,
          hasEmail: !!googleUser.email,
          hasName: !!googleUser.name,
          hasAccessToken: !!googleUser.accessToken,
          hasRefreshToken: !!googleUser.refreshToken
        });
        throw new Error('Datos incompletos de Google OAuth');
      }

      // Cast seguro después de validación
      const validatedUser = googleUser as GoogleOAuthUser;
      
      this.logger.log(`✅ Google OAuth successful for: ${validatedUser.email}`);
      return validatedUser as TUser;
    } catch (error) {
      this.logger.error('❌ Error handling Google OAuth request:', error);
      throw error;
    }
  }

  // Type guard para validar la estructura del usuario
  private isValidGoogleUser(user: Record<string, unknown>): user is GoogleOAuthUser & Record<string, unknown> {
    return (
      typeof user.googleId === 'string' &&
      typeof user.email === 'string' &&
      typeof user.name === 'string' &&
      typeof user.accessToken === 'string' &&
      typeof user.refreshToken === 'string'
    );
  }
}