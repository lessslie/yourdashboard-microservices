import { Module } from "@nestjs/common";
import { DatabaseModule } from "src/database/database.module";
import { SyncService } from "src/emails/sync.service";
import { SyncCronService } from "./sync-cron.service";

@Module({
  imports: [DatabaseModule],
  controllers: [],
  providers: [SyncService, SyncCronService],
  exports: [SyncService],
})
export class CronModule {}