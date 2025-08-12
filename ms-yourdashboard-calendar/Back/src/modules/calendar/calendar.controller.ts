import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Patch,
  Param,
  Delete,
  Get,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { Request } from 'express';
import { ShareCalendarDto } from './dto/share-calendar.dto';

interface RequestWithToken extends Request {
  token: string;
}

@UseGuards(AuthGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('events')
  async listEvents(
    @Req() req: RequestWithToken,
    @Query('timeMin') timeMin: string,
    @Query('timeMax') timeMax?: string,
  ) {
    return this.calendarService.listEvents(req.token, timeMin, timeMax);
  }

  @Get('events/search')
  async searchEvents(
    @Req() req: RequestWithToken,
    @Query('timeMin') timeMin: string,
    @Query('searchTerm') searchTerm: string,
  ) {
    return this.calendarService.searchEvents(req.token, timeMin, searchTerm);
  }

  @Post('events')
  async createEvent(@Req() req: RequestWithToken, @Body() eventBody: any) {
    return this.calendarService.insertEvent(req.token, eventBody);
  }

  @Post('events/private')
  async createPrivateEvent(
    @Req() req: RequestWithToken,
    @Body() dto: CreateEventDto,
  ) {
    return this.calendarService.createPrivateEvent(dto, req.token);
  }

  @Patch('events/:eventId')
  async updateEvent(
    @Req() req: RequestWithToken,
    @Param('eventId') eventId: string,
    @Body() eventBody: any,
  ) {
    return this.calendarService.patchEvent(req.token, eventId, eventBody);
  }

  @Delete('events/:eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEvent(
    @Req() req: RequestWithToken,
    @Param('eventId') eventId: string,
  ) {
    return this.calendarService.deleteEvent(req.token, eventId);
  }

  @Post('share')
  async shareCalendar(
    @Req() req: RequestWithToken,
    @Body() body: ShareCalendarDto,
  ) {
    return this.calendarService.shareCalendar(
      req.token,
      body.calendarId,
      body.userEmail,
      body.role,
    );
  }
}
