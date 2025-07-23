import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './google.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserOwnershipGuard } from './guards/user-ownership.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService, 
    GoogleStrategy, 
    ConfigService,
    JwtAuthGuard,
    UserOwnershipGuard,
    GoogleOAuthGuard
  ],
  exports: [AuthService, JwtAuthGuard, UserOwnershipGuard]
})
export class AuthModule {}