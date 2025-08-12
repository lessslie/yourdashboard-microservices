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
// Asegúrate de crear este DTO

// Se define una interfaz para la solicitud que incluye el token
// que nuestro AuthGuard adjunta.
interface RequestWithToken extends Request {
  token: string;
}

/**
 * @description Controlador para gestionar todas las operaciones del calendario de Google.
 * Todas las rutas están protegidas y requieren un token de autenticación Bearer.
 */
@UseGuards(AuthGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  /**
   * @description Lista los eventos de un calendario en un rango de fechas.
   * @route GET /calendar/events
   * @param {string} timeMin - Fecha/hora de inicio (formato ISO 8601).
   * @param {string} [timeMax] - Fecha/hora de fin (formato ISO 8601).
   */
  @Get('events')
  async listEvents(
    @Req() req: RequestWithToken,
    @Query('timeMin') timeMin: string,
    @Query('timeMax') timeMax?: string,
  ) {
    return this.calendarService.listEvents(req.token, timeMin, timeMax);
  }

  /**
   * @description Busca eventos en el calendario que coincidan con un término de búsqueda.
   * @route GET /calendar/events/search
   * @param {string} timeMin - Fecha/hora de inicio para la búsqueda.
   * @param {string} searchTerm - Término a buscar en los eventos.
   */
  @Get('events/search')
  async searchEvents(
    @Req() req: RequestWithToken,
    @Query('timeMin') timeMin: string,
    @Query('searchTerm') searchTerm: string,
  ) {
    return this.calendarService.searchEvents(req.token, timeMin, searchTerm);
  }

  /**
   * @description Crea un nuevo evento público en el calendario.
   * @route POST /calendar/events
   */
  @Post('events')
  async createEvent(@Req() req: RequestWithToken, @Body() eventBody: any) {
    return this.calendarService.insertEvent(req.token, eventBody);
  }

  /**
   * @description Crea un nuevo evento privado en el calendario.
   * @route POST /calendar/events/private
   */
  @Post('events/private')
  async createPrivateEvent(
    @Req() req: RequestWithToken,
    @Body() dto: CreateEventDto,
  ) {
    return this.calendarService.createPrivateEvent(dto, req.token);
  }

  /**
   * @description Actualiza un evento existente en el calendario.
   * @route PATCH /calendar/events/:eventId
   */
  @Patch('events/:eventId')
  async updateEvent(
    @Req() req: RequestWithToken,
    @Param('eventId') eventId: string,
    @Body() eventBody: any,
  ) {
    return this.calendarService.patchEvent(req.token, eventId, eventBody);
  }

  /**
   * @description Elimina un evento del calendario.
   * @route DELETE /calendar/events/:eventId
   */
  @Delete('events/:eventId')
  @HttpCode(HttpStatus.NO_CONTENT) // Devuelve un 204 para eliminaciones exitosas
  async deleteEvent(
    @Req() req: RequestWithToken,
    @Param('eventId') eventId: string,
  ) {
    return this.calendarService.deleteEvent(req.token, eventId);
  }

  /**
   * @description Comparte un calendario con otro usuario, asignándole un rol.
   * @route POST /calendar/share
   */
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
