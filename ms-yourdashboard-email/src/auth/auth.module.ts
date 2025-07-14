import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './google.strategy';
import { EmailsModule } from '../emails/emails.module';
import { ConfigService } from '@nestjs/config';

@Module({
  imports:[EmailsModule],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, ConfigService]
})
export class AuthModule {}
 