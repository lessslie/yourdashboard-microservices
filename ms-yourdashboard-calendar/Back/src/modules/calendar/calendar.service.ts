import { google } from 'googleapis';
import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import axios from 'axios';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsRepository } from './repository/events.repository';

const GOOGLE_API_BASE_URL = 'https://www.googleapis.com/calendar/v3';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(private readonly eventsRepository: EventsRepository) {}

  private getAuthClient(token: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    return auth;
  }

  async listEvents(token: string, timeMin: string, timeMax?: string) {
    try {
      const res = await axios.get(
        `${GOOGLE_API_BASE_URL}/calendars/primary/events`,
        {
          params: {
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: 'startTime',
          },
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return res.data;
    } catch (error) {
      this.logger.error(
        'Error listando eventos:',
        error.response?.data || error.message,
      );
      throw new HttpException(
        'Error al listar los eventos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async insertEvent(token: string, body: any) {
    try {
      const res = await axios.post(
        `${GOOGLE_API_BASE_URL}/calendars/primary/events?sendUpdates=all`,
        body,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      // De forma asíncrona y sin esperar, guardamos en la BD
      this.eventsRepository.create(res.data);

      return res.data;
    } catch (error) {
      this.logger.error(
        'Error creando evento:',
        error.response?.data || error.message,
      );
      throw new HttpException(
        'Error al crear el evento',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async patchEvent(token: string, eventId: string, body: any) {
    try {
      const res = await axios.patch(
        `${GOOGLE_API_BASE_URL}/calendars/primary/events/${eventId}?sendUpdates=all`,
        body,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      this.eventsRepository.update(eventId, res.data);

      return res.data;
    } catch (error) {
      this.logger.error(
        `Error actualizando evento ${eventId}:`,
        error.response?.data || error.message,
      );
      throw new HttpException(
        'Error al actualizar el evento',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteEvent(token: string, eventId: string) {
    try {
      await axios.delete(
        `${GOOGLE_API_BASE_URL}/calendars/primary/events/${eventId}?sendUpdates=all`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      this.eventsRepository.delete(eventId);

      return { message: 'Evento eliminado correctamente' };
    } catch (error) {
      this.logger.error(
        `Error eliminando evento ${eventId}:`,
        error.response?.data || error.message,
      );
      throw new HttpException(
        'Error al eliminar el evento',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async searchEvents(token: string, timeMin: string, searchTerm: string) {
    try {
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: token });

      const calendar = google.calendar({ version: 'v3', auth });

      const res = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        q: searchTerm,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = res.data.items || [];
      return events;
    } catch (error: any) {
      throw new HttpException(`Error searching events: ${error.message}`, 500);
    }
  }

  async createPrivateEvent(dto: CreateEventDto, token: string) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: token });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    try {
      const res = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: dto.summary,
          description: dto.description,
          start: { dateTime: dto.startDateTime },
          end: { dateTime: dto.endDateTime },
          visibility: 'private',
          attendees: dto.attendees?.map((email) => ({ email })) || [],
        },
      });

      return res.data;
    } catch (err: any) {
      console.error(
        '❌ Error al crear evento privado:',
        err.response?.data || err.message,
      );
      throw new HttpException('No se pudo crear el evento', 500);
    }
  }

  async shareCalendar(
    token: string,
    calendarId: string,
    userEmail: string,
    role: 'reader' | 'writer' | 'owner',
  ) {
    try {
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: token });

      const calendar = google.calendar({ version: 'v3', auth });

      const res = await calendar.acl.insert({
        calendarId,
        requestBody: {
          role,
          scope: {
            type: 'user',
            value: userEmail,
          },
        },
      });

      return res.data;
    } catch (error: any) {
      throw new HttpException(`Error sharing calendar: ${error.message}`, 500);
    }
  }
}
