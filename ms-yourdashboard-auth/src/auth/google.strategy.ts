import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
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

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails } = profile;
    
    const user = {
      googleId: id,
      email: emails[0].value,
      name: `${name.givenName} ${name.familyName}`,
      accessToken,
      refreshToken,
    };
    
    console.log('✅ Usuario autenticado:', user.email);
    done(null, user);
  } 
}