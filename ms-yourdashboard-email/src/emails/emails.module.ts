import { Module } from '@nestjs/common';
import { EmailsController } from './emails.controller';
import { EmailsService } from './emails.service';
import { ConfigModule } from '@nestjs/config';
import { SyncService } from './sync.service';

@Module({
  imports: [ConfigModule],
  controllers: [EmailsController],
  providers: [EmailsService,SyncService],
  exports: [EmailsService, SyncService],
})
export class EmailsModule {}
