import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './google.strategy';
import { ConfigService } from '@nestjs/config';
import { AuthTraditionalService } from './auth-traditional.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, ConfigService, AuthTraditionalService  ],
  exports: [AuthService, AuthTraditionalService]
})
export class AuthModule {}