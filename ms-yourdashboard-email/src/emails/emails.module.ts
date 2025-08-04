import { forwardRef, Module } from '@nestjs/common';
import { EmailsController } from './emails.controller';
import { EmailsService } from './emails.service';
import { ConfigModule } from '@nestjs/config';
import { SyncService } from './sync.service';
import { CronModule } from 'src/cron/cron.module';

@Module({
  imports: [ConfigModule,
    forwardRef(() => CronModule)
  ],
  controllers: [EmailsController],
  providers: [EmailsService,SyncService],
  exports: [EmailsService, SyncService],
})
export class EmailsModule {}
