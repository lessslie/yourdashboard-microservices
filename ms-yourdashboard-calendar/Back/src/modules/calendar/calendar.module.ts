import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { EventsRepository } from './repository/events.repository';

@Module({
  controllers: [CalendarController],
  providers: [CalendarService, EventsRepository],
})
export class CalendarModule {}
