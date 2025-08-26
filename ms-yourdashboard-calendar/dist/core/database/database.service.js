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
var DatabaseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const pg_1 = require("pg");
let DatabaseService = DatabaseService_1 = class DatabaseService {
    configService;
    logger = new common_1.Logger(DatabaseService_1.name);
    pool;
    constructor(configService) {
        this.configService = configService;
        this.pool = new pg_1.Pool({
            host: this.configService.get('DB_HOST') || 'localhost',
            port: this.configService.get('DB_PORT') || 5432,
            database: this.configService.get('DB_NAME') || 'ms_yourdashboard_auth',
            user: this.configService.get('DB_USER') || 'postgres',
            password: this.configService.get('DB_PASSWORD'),
        });
        this.logger.log('🔌 DatabaseService inicializado para MS-Calendar');
    }
    async onModuleDestroy() {
        await this.pool.end();
        this.logger.log('🔌 Pool de conexiones cerrado');
    }
    async getActiveGmailAccounts(activeDays = 7, limit = 100) {
        try {
            const query = `
        SELECT 
          cga.id,
          cga.email_gmail,
          cga.access_token,
          cga.usuario_principal_id
        FROM cuentas_gmail_asociadas cga
        INNER JOIN usuarios_principales u ON cga.usuario_principal_id = u.id
        WHERE 
          cga.esta_activa = true
          AND cga.access_token IS NOT NULL
        ORDER BY cga.ultima_sincronizacion ASC NULLS FIRST
        LIMIT $1
      `;
            const result = await this.pool.query(query, [limit]);
            this.logger.log(`✅ Encontradas ${result.rows.length} cuentas Gmail activas para calendar`);
            return result.rows;
        }
        catch (error) {
            this.logger.error('Error obteniendo cuentas activas:', error);
            throw error;
        }
    }
    async query(text, params) {
        const client = await this.pool.connect();
        try {
            const start = Date.now();
            const result = await client.query(text, params);
            const duration = Date.now() - start;
            this.logger.debug(`🔍 Query ejecutado en ${duration}ms: ${text.substring(0, 50)}...`);
            return {
                rows: result.rows,
                rowCount: result.rowCount || 0
            };
        }
        catch (error) {
            this.logger.error(`❌ Error en query: ${text}`, error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async syncEventsMetadata(events) {
        if (events.length === 0) {
            return { events_nuevos: 0, events_actualizados: 0, total_procesados: 0, tiempo_ms: 0 };
        }
        const startTime = Date.now();
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            let eventsNuevos = 0;
            let eventsActualizados = 0;
            for (const event of events) {
                const query = `
          INSERT INTO events_sincronizados (
            cuenta_gmail_id, google_event_id, summary, 
            location, description, start_time, end_time,
            attendees, fecha_sincronizado
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          ON CONFLICT (cuenta_gmail_id, google_event_id) 
          DO UPDATE SET
            summary = EXCLUDED.summary,
            location = EXCLUDED.location,
            description = EXCLUDED.description,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            attendees = EXCLUDED.attendees,
            fecha_sincronizado = NOW()
          RETURNING (xmax = 0) AS inserted
        `;
                const result = await client.query(query, [
                    event.cuenta_gmail_id,
                    event.google_event_id,
                    event.summary || null,
                    event.location || null,
                    event.description || null,
                    event.start_time || null,
                    event.end_time || null,
                    event.attendees || null
                ]);
                if (result.rows[0]?.inserted) {
                    eventsNuevos++;
                }
                else {
                    eventsActualizados++;
                }
            }
            await client.query('COMMIT');
            const tiempoMs = Date.now() - startTime;
            this.logger.log(`✅ Sync completado: ${eventsNuevos} nuevos, ${eventsActualizados} actualizados (${tiempoMs}ms)`);
            return {
                events_nuevos: eventsNuevos,
                events_actualizados: eventsActualizados,
                total_procesados: events.length,
                tiempo_ms: tiempoMs
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            this.logger.error('❌ Error sincronizando eventos:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async getEventsPaginated(cuentaGmailId, page = 1, limit = 10, futureOnly = false) {
        const offset = (page - 1) * limit;
        const filtroFecha = futureOnly ? 'AND start_time >= NOW()' : '';
        const queryEvents = `
      SELECT 
        id, google_event_id, summary, location, description,
        start_time, end_time, attendees, fecha_sincronizado
      FROM events_sincronizados 
      WHERE cuenta_gmail_id = $1 ${filtroFecha}
      ORDER BY start_time DESC NULLS LAST
      LIMIT $2 OFFSET $3
    `;
        const queryTotal = `
      SELECT COUNT(*) as total FROM events_sincronizados 
      WHERE cuenta_gmail_id = $1 ${filtroFecha}
    `;
        const [eventsResult, totalResult] = await Promise.all([
            this.query(queryEvents, [cuentaGmailId, limit, offset]),
            this.query(queryTotal, [cuentaGmailId])
        ]);
        return {
            events: eventsResult.rows,
            total: parseInt(totalResult.rows[0].total)
        };
    }
    async searchEventsInDB(cuentaGmailId, filters, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const conditions = ['cuenta_gmail_id = $1'];
        const params = [cuentaGmailId];
        let paramIndex = 2;
        if (filters.search_text) {
            conditions.push(`(
        LOWER(summary) LIKE $${paramIndex} OR 
        LOWER(location) LIKE $${paramIndex} OR 
        LOWER(description) LIKE $${paramIndex}
      )`);
            params.push(`%${filters.search_text.toLowerCase()}%`);
            paramIndex++;
        }
        if (filters.start_date) {
            conditions.push(`start_time >= $${paramIndex}`);
            params.push(filters.start_date);
            paramIndex++;
        }
        if (filters.end_date) {
            conditions.push(`end_time <= $${paramIndex}`);
            params.push(filters.end_date);
            paramIndex++;
        }
        const whereClause = conditions.join(' AND ');
        const queryEvents = `
      SELECT 
        id, google_event_id, summary, location, description,
        start_time, end_time, attendees, fecha_sincronizado
      FROM events_sincronizados 
      WHERE ${whereClause}
      ORDER BY start_time ASC NULLS LAST
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        const queryTotal = `
      SELECT COUNT(*) as total FROM events_sincronizados 
      WHERE ${whereClause}
    `;
        const eventsParams = [...params, limit, offset];
        const totalParams = [...params];
        const [eventsResult, totalResult] = await Promise.all([
            this.query(queryEvents, eventsParams),
            this.query(queryTotal, totalParams)
        ]);
        return {
            events: eventsResult.rows,
            total: parseInt(totalResult.rows[0].total)
        };
    }
    async obtenerCuentasGmailUsuario(usuarioId) {
        try {
            this.logger.log(`📅 Obteniendo cuentas Gmail para usuario ${usuarioId}`);
            const query = `
        SELECT 
          cga.id,
          cga.email_gmail,
          cga.nombre_cuenta,
          cga.alias_personalizado,
          cga.fecha_conexion,
          cga.ultima_sincronizacion,
          cga.esta_activa,
          COALESCE(event_counts.count, 0) as events_count
        FROM cuentas_gmail_asociadas cga
        LEFT JOIN (
          SELECT cuenta_gmail_id, COUNT(*) as count 
          FROM events_sincronizados 
          GROUP BY cuenta_gmail_id
        ) event_counts ON cga.id = event_counts.cuenta_gmail_id
        WHERE cga.usuario_principal_id = $1 
        AND cga.esta_activa = TRUE
        ORDER BY cga.fecha_conexion DESC
      `;
            const result = await this.query(query, [usuarioId]);
            const cuentas = result.rows.map(cuenta => ({
                ...cuenta,
                events_count: parseInt(cuenta.events_count, 10) || 0
            }));
            this.logger.log(`✅ ${cuentas.length} cuentas Gmail encontradas para usuario ${usuarioId}`);
            return cuentas;
        }
        catch (error) {
            this.logger.error(`❌ Error obteniendo cuentas Gmail:`, error);
            throw error;
        }
    }
    async getEventStatsFromDB(cuentaGmailId) {
        const query = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN start_time >= NOW() THEN 1 END) as upcoming_events,
        COUNT(CASE WHEN start_time < NOW() THEN 1 END) as past_events,
        MIN(CASE WHEN start_time >= NOW() THEN start_time END) as next_event_date
      FROM events_sincronizados 
      WHERE cuenta_gmail_id = $1
    `;
        const result = await this.query(query, [cuentaGmailId]);
        const stats = result.rows[0];
        return {
            total_events: parseInt(stats?.total_events || '0'),
            upcoming_events: parseInt(stats?.upcoming_events || '0'),
            past_events: parseInt(stats?.past_events || '0'),
            next_event_date: stats?.next_event_date
        };
    }
    async getLastSyncedEvent(cuentaGmailId) {
        const query = `
      SELECT * FROM events_sincronizados 
      WHERE cuenta_gmail_id = $1 
      ORDER BY fecha_sincronizado DESC 
      LIMIT 1
    `;
        const result = await this.query(query, [cuentaGmailId]);
        return result.rows[0] || null;
    }
    async healthCheck() {
        try {
            const start = Date.now();
            await this.query('SELECT 1 as health');
            const queryTimeMs = Date.now() - start;
            return { connected: true, query_time_ms: queryTimeMs };
        }
        catch (error) {
            this.logger.error('❌ Database health check failed:', error);
            return { connected: false, query_time_ms: 0 };
        }
    }
    async getGmailAccountById(cuentaGmailId) {
        try {
            this.logger.log(`🔍 Obteniendo cuenta Gmail ID: ${cuentaGmailId}`);
            const query = `
        SELECT 
          id, email_gmail, access_token, refresh_token, 
          token_expira_en, usuario_principal_id
        FROM cuentas_gmail_asociadas 
        WHERE id = $1 AND esta_activa = TRUE
      `;
            const result = await this.query(query, [cuentaGmailId]);
            if (result.rows.length === 0) {
                this.logger.warn(`⚠️ Cuenta Gmail ${cuentaGmailId} no encontrada o inactiva`);
                return null;
            }
            return result.rows[0];
        }
        catch (error) {
            this.logger.error(`❌ Error obteniendo cuenta Gmail ${cuentaGmailId}:`, error);
            throw error;
        }
    }
    async refreshGoogleToken(cuentaGmailId) {
        try {
            this.logger.log(`🔄 Intentando renovar token para cuenta ${cuentaGmailId}`);
            const account = await this.getGmailAccountById(cuentaGmailId);
            if (!account) {
                throw new Error(`Cuenta Gmail ${cuentaGmailId} no encontrada`);
            }
            if (!account.refresh_token) {
                throw new Error(`Refresh token no disponible para cuenta ${cuentaGmailId}`);
            }
            const { google } = require('googleapis');
            const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
            oauth2Client.setCredentials({
                refresh_token: account.refresh_token
            });
            const { credentials } = await oauth2Client.refreshAccessToken();
            const newAccessToken = credentials.access_token;
            if (!newAccessToken) {
                throw new Error('No se pudo obtener nuevo access token');
            }
            const newExpiresAt = new Date(Date.now() + 3600000);
            const updateQuery = `
        UPDATE cuentas_gmail_asociadas 
        SET 
          access_token = $1, 
          token_expira_en = $2,
          ultima_sincronizacion = NOW()
        WHERE id = $3
      `;
            await this.query(updateQuery, [newAccessToken, newExpiresAt, cuentaGmailId]);
            this.logger.log(`✅ Token renovado exitosamente para cuenta ${cuentaGmailId}`);
            return newAccessToken;
        }
        catch (error) {
            this.logger.error(`❌ Error renovando token para cuenta ${cuentaGmailId}:`, error);
            return null;
        }
    }
    async getValidAccessToken(cuentaGmailId) {
        try {
            this.logger.log(`🔐 Obteniendo token válido para cuenta ${cuentaGmailId}`);
            const account = await this.getGmailAccountById(cuentaGmailId);
            if (!account) {
                throw new Error(`Cuenta Gmail ${cuentaGmailId} no encontrada`);
            }
            if (!account.access_token) {
                throw new Error(`Access token no disponible para cuenta ${cuentaGmailId}`);
            }
            const now = new Date();
            const expiresAt = account.token_expira_en;
            const timeToExpire = expiresAt ? expiresAt.getTime() - now.getTime() : 0;
            const fiveMinutesInMs = 5 * 60 * 1000;
            if (timeToExpire < fiveMinutesInMs) {
                this.logger.warn(`⏰ Token expirando en ${Math.round(timeToExpire / 1000)}s, renovando...`);
                const newToken = await this.refreshGoogleToken(cuentaGmailId);
                if (!newToken) {
                    throw new Error(`No se pudo renovar el token para cuenta ${cuentaGmailId}`);
                }
                return newToken;
            }
            this.logger.log(`✅ Token actual válido para cuenta ${cuentaGmailId}`);
            return account.access_token;
        }
        catch (error) {
            this.logger.error(`❌ Error obteniendo token válido:`, error);
            throw new Error(`Token inválido y no se pudo renovar: ${error.message}`);
        }
    }
    async getGmailAccountByUserId(userId) {
        try {
            const query = `
        SELECT id, access_token as google_token, refresh_token
        FROM cuentas_gmail_asociadas 
        WHERE usuario_principal_id = $1 AND esta_activa = TRUE
        ORDER BY fecha_conexion DESC
        LIMIT 1
      `;
            const result = await this.query(query, [userId]);
            if (result.rows.length === 0) {
                this.logger.warn(`⚠️ No se encontró cuenta Gmail activa para usuario ${userId}`);
                return null;
            }
            return result.rows[0];
        }
        catch (error) {
            this.logger.error(`❌ Error obteniendo cuenta por user ID:`, error);
            return null;
        }
    }
    async query_old(text, params) {
        try {
            const result = await this.pool.query(text, params);
            return result.rows;
        }
        catch (error) {
            this.logger.error(`❌ Error en la consulta SQL: ${text}`, error);
            throw new Error('Error ejecutando la consulta SQL');
        }
    }
};
exports.DatabaseService = DatabaseService;
exports.DatabaseService = DatabaseService = DatabaseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], DatabaseService);
//# sourceMappingURL=database.service.js.map