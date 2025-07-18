import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';

interface GoogleProfile extends Profile {
  id: string;
  name: {
    familyName: string;
    givenName: string;
  };
  emails: Array<{
    value: string;
    verified: boolean;
  }>;
}

interface GoogleUser {
  googleId: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string;
}

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
        'https://www.googleapis.com/auth/gmail.readonly'
      ],
    });
  }

  validate(
  accessToken: string,
  refreshToken: string,
  profile: GoogleProfile,
  done: VerifyCallback,
): void {
  try {
    const { id, name, emails } = profile;

    // Validar que tengamos la información necesaria
    if (!id || !name || !emails || emails.length === 0) {
      return done(new Error('Información incompleta del perfil de Google'), undefined);
    }

    const user: GoogleUser = {
      googleId: id,
      email: emails[0].value,
      name: `${name.givenName} ${name.familyName}`,
      accessToken,
      refreshToken,
    };

    console.log('✅ Usuario autenticado:', user.email);
    done(null, user);

  } catch (error) {
    console.error('❌ Error validando usuario de Google:', error);
    done(error, undefined);
  }
}
}