import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from 'src/core/database/database.service';

@Injectable()
export class EventsRepository {
  private readonly logger = new Logger(EventsRepository.name);

  constructor(private readonly db: DatabaseService) {}

  async create(event: any) {
    const query = `
      INSERT INTO events (google_event_id, summary, location, description, start_time, end_time, attendees)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const params = [
      event.id,
      event.summary || '',
      event.location || '',
      event.description || '',
      event.start.dateTime || event.start.date,
      event.end.dateTime || event.end.date,
      event.attendees ? event.attendees.map((a: any) => a.email) : [],
    ];

    try {
      const result = await this.db.query(query, params);
      this.logger.log(`Evento ${event.id} guardado en la base de datos.`);
      return result[0];
    } catch (dbError) {
      this.logger.error(
        `Error guardando evento ${event.id} en DB:`,
        dbError.stack,
      );
      // No relanzamos el error para no interrumpir el flujo principal si la API de Google ya funcionó
    }
  }

  async update(eventId: string, event: any) {
    const query = `
      UPDATE events
      SET summary = $1, location = $2, description = $3, start_time = $4, end_time = $5, attendees = $6
      WHERE google_event_id = $7;
    `;
    const params = [
      event.summary || '',
      event.location || '',
      event.description || '',
      event.start.dateTime || event.start.date,
      event.end.dateTime || event.end.date,
      event.attendees ? event.attendees.map((a: any) => a.email) : [],
      eventId,
    ];
    try {
      await this.db.query(query, params);
      this.logger.log(`Evento ${eventId} actualizado en la base de datos.`);
    } catch (dbError) {
      this.logger.error(
        `Error actualizando evento ${eventId} en DB:`,
        dbError.stack,
      );
    }
  }

  async delete(eventId: string) {
    const query = `DELETE FROM events WHERE google_event_id = $1;`;
    try {
      await this.db.query(query, [eventId]);
      this.logger.log(`Evento ${eventId} eliminado de la base de datos.`);
    } catch (dbError) {
      this.logger.error(
        `Error eliminando evento ${eventId} de DB:`,
        dbError.stack,
      );
    }
  }
}
