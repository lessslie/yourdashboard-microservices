// ms-yourdashboard-auth/src/auth/google.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { GoogleOAuthUser, GoogleProfile } from './interfaces/auth.interfaces';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    const clientId = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');

    console.log('🔵 MS-AUTH - GOOGLE_CLIENT_ID:', clientId ? `${clientId.substring(0, 10)}...` : 'NO ENCONTRADO');
    console.log('🔵 MS-AUTH - GOOGLE_CLIENT_SECRET:', clientSecret ? `${clientSecret.substring(0, 10)}...` : 'NO ENCONTRADO');

    super({
      clientID: clientId || '',
      clientSecret: clientSecret || '',
      callbackURL: 'http://localhost:3001/auth/google/callback',
      scope: [
        'email',
        'profile',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/calendar' // Aseguramos que tenemos acceso a Google Calendar
      ],
      // 🎯 PERMITIR PASAR EL STATE
      passReqToCallback: false, // No necesitamos req en este caso
    });
  }

  /**
   * 🔐 Validar usuario de Google OAuth
   * Este método es llamado automáticamente por Passport
   */
  validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): void {
    try {
      console.log('🔐 Validando usuario de Google:', profile.emails?.[0]?.value);
      console.log('🔍 Profile ID:', profile.id);
      console.log('🔍 Access Token recibido:', accessToken ? 'SÍ' : 'NO');
      console.log('🔍 Refresh Token recibido:', refreshToken ? 'SÍ' : 'NO');

      const { id, name, emails } = profile;

      // ✅ VALIDACIONES CON OPTIONAL CHAINING
      if (!id) {
        console.error('❌ Google Profile sin ID');
        return done(new Error('Google Profile sin ID válido'), undefined);
      }

      if (!name?.givenName || !name?.familyName) {
        console.error('❌ Google Profile sin nombre completo');
        return done(new Error('Google Profile sin nombre completo'), undefined);
      }

      if (!emails?.length) {
        console.error('❌ Google Profile sin email');
        return done(new Error('Google Profile sin email válido'), undefined);
      }

      if (!emails[0]?.verified) {
        console.warn('⚠️ Email de Google no verificado');
      }

      // ✅ VALIDAR QUE TENEMOS ACCESS TOKEN
      if (!accessToken) {
        console.error('❌ No se recibió access token de Google');
        return done(new Error('Access token no recibido de Google'), undefined);
      }

      // ✅ CREAR USUARIO USANDO INTERFACE CORRECTA
      const googleUser: GoogleOAuthUser = {
        googleId: id,
        email: emails[0].value,
        name: `${name.givenName} ${name.familyName}`.trim(),
        accessToken,
        refreshToken: refreshToken || '' // Asegurar que no sea null
      };

      // ✅ VALIDACIONES ADICIONALES
      if (!googleUser.email.includes('@')) {
        console.error('❌ Email inválido de Google');
        return done(new Error('Email inválido de Google'), undefined);
      }

      console.log('✅ Usuario Google validado exitosamente:', googleUser.email);
      console.log('🎯 Google ID:', googleUser.googleId);
      console.log('🎯 Tokens recibidos correctamente');
      
      done(null, googleUser);

    } catch (error) {
      console.error('❌ Error validando usuario de Google:', error);
      done(error as Error, undefined);
    }
  }
}