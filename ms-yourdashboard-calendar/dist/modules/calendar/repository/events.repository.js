"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EventsRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsRepository = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../../core/database/database.service");
let EventsRepository = EventsRepository_1 = class EventsRepository {
    db;
    logger = new common_1.Logger(EventsRepository_1.name);
    constructor(db) {
        this.db = db;
    }
    async create(event) {
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
            event.attendees ? event.attendees.map((a) => a.email) : [],
        ];
        try {
            const result = await this.db.query(query, params);
            this.logger.log(`Evento ${event.id} guardado en la base de datos.`);
            return result[0];
        }
        catch (dbError) {
            this.logger.error(`Error guardando evento ${event.id} en DB:`, dbError.stack);
        }
    }
    async update(eventId, event) {
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
            event.attendees ? event.attendees.map((a) => a.email) : [],
            eventId,
        ];
        try {
            await this.db.query(query, params);
            this.logger.log(`Evento ${eventId} actualizado en la base de datos.`);
        }
        catch (dbError) {
            this.logger.error(`Error actualizando evento ${eventId} en DB:`, dbError.stack);
        }
    }
    async delete(eventId) {
        const query = `DELETE FROM events WHERE google_event_id = $1;`;
        try {
            await this.db.query(query, [eventId]);
            this.logger.log(`Evento ${eventId} eliminado de la base de datos.`);
        }
        catch (dbError) {
            this.logger.error(`Error eliminando evento ${eventId} de DB:`, dbError.stack);
        }
    }
};
exports.EventsRepository = EventsRepository;
exports.EventsRepository = EventsRepository = EventsRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], EventsRepository);
//# sourceMappingURL=events.repository.js.map