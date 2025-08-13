import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// 📅 Interfaces para metadata de eventos de calendar
export interface EventMetadataDB {
  id?: number;
  cuenta_gmail_id: number;
  google_event_id: string;
  summary?: string;
  location?: string;
  description?: string;
  start_time?: Date;
  end_time?: Date;
  attendees?: string[];
  created_at?: Date;
  updated_at?: Date;
}

export interface EventSearchFilters {
  cuenta_gmail_id?: number;
  search_text?: string;
  start_date?: Date;
  end_date?: Date;
}

export interface EventSearchResult {
  events: EventMetadataDB[];
  total: number;
}

export interface SyncResult {
  events_nuevos: number;
  events_actualizados: number;
  total_procesados: number;
  tiempo_ms: number;
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool;

  constructor(private readonly configService: ConfigService) {
    this.pool = new Pool({
      host: this.configService.get<string>('DB_HOST') || 'localhost',
      port: this.configService.get<number>('DB_PORT') || 5432,
      database: this.configService.get<string>('DB_NAME') || 'ms_yourdashboard_auth',
      user: this.configService.get<string>('DB_USER') || 'postgres', 
      password: this.configService.get<string>('DB_PASSWORD'),
    });

    this.logger.log('🔌 DatabaseService inicializado para MS-Calendar');
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
    this.logger.log('🔌 Pool de conexiones cerrado');
  }

  // ================================
  // 📅 MÉTODOS DE CONSULTA A LA BASE DE DATOS
  // ================================
  
  async getActiveGmailAccounts(
    activeDays: number = 7, 
    limit: number = 100
  ): Promise<Array<{
    id: number;
    email_gmail: string;
    access_token: string;
    usuario_principal_id: number;
  }>> {
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
      
    } catch (error) {
      this.logger.error('Error obteniendo cuentas activas:', error);
      throw error;
    }
  }

  // ================================
  // 🔧 MÉTODO GENÉRICO PARA QUERIES
  // ================================

  async query<T extends QueryResultRow = any>(
    text: string, 
    params?: any[]
  ): Promise<{ rows: T[]; rowCount: number }> {
    const client: PoolClient = await this.pool.connect();
    try {
      const start = Date.now();
      const result: QueryResult<T> = await client.query<T>(text, params);
      const duration = Date.now() - start;
      
      this.logger.debug(`🔍 Query ejecutado en ${duration}ms: ${text.substring(0, 50)}...`);
      
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0
      };
    } catch (error) {
      this.logger.error(`❌ Error en query: ${text}`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ================================
  // 📅 SINCRONIZACIÓN DE EVENTS METADATA
  // ================================

  /**
   * 💾 Guardar múltiples eventos en lote (UPSERT)
   */
  async syncEventsMetadata(events: EventMetadataDB[]): Promise<SyncResult> {
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
        // 🎯 UPSERT - Insert o Update si ya existe
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

        // xmax = 0 significa que fue INSERT, xmax > 0 significa UPDATE
        if (result.rows[0]?.inserted) {
          eventsNuevos++;
        } else {
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

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('❌ Error sincronizando eventos:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ================================
  // 🔍 BÚSQUEDAS EN BD LOCAL
  // ================================

  /**
   * 📖 Obtener eventos con paginación desde BD local
   */
  async getEventsPaginated(
    cuentaGmailId: number,
    page: number = 1,
    limit: number = 10,
    futureOnly: boolean = false
  ): Promise<EventSearchResult> {
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
      this.query<EventMetadataDB>(queryEvents, [cuentaGmailId, limit, offset]),
      this.query<{ total: string }>(queryTotal, [cuentaGmailId])
    ]);

    return {
      events: eventsResult.rows,
      total: parseInt(totalResult.rows[0].total)
    };
  }

  /**
   * 🔍 Búsqueda avanzada de eventos en BD local
   */
  async searchEventsInDB(
    cuentaGmailId: number,
    filters: EventSearchFilters,
    page: number = 1,
    limit: number = 10
  ): Promise<EventSearchResult> {
    const offset = (page - 1) * limit;
    
    // 🎯 CONSTRUIR QUERY DINÁMICO
    const conditions: string[] = ['cuenta_gmail_id = $1'];
    const params: any[] = [cuentaGmailId];
    let paramIndex = 2;

    // Filtro por texto (buscar en summary, location, description)
    if (filters.search_text) {
      conditions.push(`(
        LOWER(summary) LIKE $${paramIndex} OR 
        LOWER(location) LIKE $${paramIndex} OR 
        LOWER(description) LIKE $${paramIndex}
      )`);
      params.push(`%${filters.search_text.toLowerCase()}%`);
      paramIndex++;
    }

    // Filtro por rango de fechas
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

    // Queries para eventos y count total
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
      this.query<EventMetadataDB>(queryEvents, eventsParams),
      this.query<{ total: string }>(queryTotal, totalParams)
    ]);

    return {
      events: eventsResult.rows,
      total: parseInt(totalResult.rows[0].total)
    };
  }

  /**
   * 📅 Obtener todas las cuentas Gmail de un usuario principal
   * 🎯 Para búsqueda global de eventos
   */
  async obtenerCuentasGmailUsuario(usuarioId: number): Promise<Array<{
    id: number;
    email_gmail: string;
    nombre_cuenta: string;
    alias_personalizado?: string;
    fecha_conexion: Date;
    ultima_sincronizacion?: Date;
    esta_activa: boolean;
    events_count: number;
  }>> {
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

      const result = await this.query<{
        id: number;
        email_gmail: string;
        nombre_cuenta: string;
        alias_personalizado?: string;
        fecha_conexion: Date;
        ultima_sincronizacion?: Date;
        esta_activa: boolean;
        events_count: string; // Viene como string del COUNT
      }>(query, [usuarioId]);

      const cuentas = result.rows.map(cuenta => ({
        ...cuenta,
        events_count: parseInt(cuenta.events_count, 10) || 0
      }));

      this.logger.log(`✅ ${cuentas.length} cuentas Gmail encontradas para usuario ${usuarioId}`);
      
      return cuentas;

    } catch (error) {
      this.logger.error(`❌ Error obteniendo cuentas Gmail:`, error);
      throw error;
    }
  }

  // ================================
  // 📊 ESTADÍSTICAS RÁPIDAS
  // ================================

  /**
   * 📈 Obtener estadísticas desde BD local
   */
  async getEventStatsFromDB(cuentaGmailId: number): Promise<{
    total_events: number;
    upcoming_events: number;
    past_events: number;
    next_event_date?: Date;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN start_time >= NOW() THEN 1 END) as upcoming_events,
        COUNT(CASE WHEN start_time < NOW() THEN 1 END) as past_events,
        MIN(CASE WHEN start_time >= NOW() THEN start_time END) as next_event_date
      FROM events_sincronizados 
      WHERE cuenta_gmail_id = $1
    `;

    const result = await this.query<{
      total_events: string;
      upcoming_events: string;
      past_events: string;
      next_event_date: Date;
    }>(query, [cuentaGmailId]);

    const stats = result.rows[0];

    return {
      total_events: parseInt(stats?.total_events || '0'),
      upcoming_events: parseInt(stats?.upcoming_events || '0'),
      past_events: parseInt(stats?.past_events || '0'),
      next_event_date: stats?.next_event_date
    };
  }

  // ================================
  // 🧹 UTILIDADES
  // ================================

  /**
   * 🔍 Obtener último evento sincronizado
   */
  async getLastSyncedEvent(cuentaGmailId: number): Promise<EventMetadataDB | null> {
    const query = `
      SELECT * FROM events_sincronizados 
      WHERE cuenta_gmail_id = $1 
      ORDER BY fecha_sincronizado DESC 
      LIMIT 1
    `;

    const result = await this.query<EventMetadataDB>(query, [cuentaGmailId]);
    return result.rows[0] || null;
  }

  /**
   * 🔧 Health check de la base de datos
   */
  async healthCheck(): Promise<{ connected: boolean; query_time_ms: number }> {
    try {
      const start = Date.now();
      await this.query('SELECT 1 as health');
      const queryTimeMs = Date.now() - start;
      
      return { connected: true, query_time_ms: queryTimeMs };
    } catch (error) {
      this.logger.error('❌ Database health check failed:', error);
      return { connected: false, query_time_ms: 0 };
    }
  }


  // ================================
  // 🔄 REFRESH TOKEN METHODS
  // ================================

  /**
   * 🔍 Obtener cuenta Gmail por ID para Calendar
   */
  async getGmailAccountById(cuentaGmailId: number): Promise<{
    id: number;
    email_gmail: string;
    access_token: string;
    refresh_token?: string;
    token_expira_en?: Date;
    usuario_principal_id: number;
  } | null> {
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

    } catch (error) {
      this.logger.error(`❌ Error obteniendo cuenta Gmail ${cuentaGmailId}:`, error);
      throw error;
    }
  }

  /**
   * 🔄 Renovar Google Access Token usando Refresh Token
   */
  async refreshGoogleToken(cuentaGmailId: number): Promise<string | null> {
    try {
      this.logger.log(`🔄 Intentando renovar token para cuenta ${cuentaGmailId}`);

      // 1️⃣ Obtener refresh token de BD
      const account = await this.getGmailAccountById(cuentaGmailId);
      
      if (!account) {
        throw new Error(`Cuenta Gmail ${cuentaGmailId} no encontrada`);
      }

      if (!account.refresh_token) {
        throw new Error(`Refresh token no disponible para cuenta ${cuentaGmailId}`);
      }

      // 2️⃣ Llamar a Google OAuth2 para renovar token
      const { google } = require('googleapis');
      
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
      );

      oauth2Client.setCredentials({
        refresh_token: account.refresh_token
      });

      // 3️⃣ Obtener nuevo access token
      const { credentials } = await oauth2Client.refreshAccessToken();
      const newAccessToken = credentials.access_token;

      if (!newAccessToken) {
        throw new Error('No se pudo obtener nuevo access token');
      }

      // 4️⃣ Calcular nueva fecha de expiración (1 hora)
      const newExpiresAt = new Date(Date.now() + 3600000); // 1 hora

      // 5️⃣ Actualizar en BD
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

    } catch (error) {
      this.logger.error(`❌ Error renovando token para cuenta ${cuentaGmailId}:`, error);
      return null;
    }
  }

  /**
   * 🔐 Obtener Access Token válido (con auto-refresh si es necesario)
   */
  async getValidAccessToken(cuentaGmailId: number): Promise<string> {
    try {
      this.logger.log(`🔐 Obteniendo token válido para cuenta ${cuentaGmailId}`);

      // 1️⃣ Obtener cuenta y verificar token actual
      const account = await this.getGmailAccountById(cuentaGmailId);
      
      if (!account) {
        throw new Error(`Cuenta Gmail ${cuentaGmailId} no encontrada`);
      }

      if (!account.access_token) {
        throw new Error(`Access token no disponible para cuenta ${cuentaGmailId}`);
      }

      // 2️⃣ Verificar si el token está por expirar (menos de 5 minutos)
      const now = new Date();
      const expiresAt = account.token_expira_en;
      const timeToExpire = expiresAt ? expiresAt.getTime() - now.getTime() : 0;
      const fiveMinutesInMs = 5 * 60 * 1000;

      // 3️⃣ Si el token está por expirar o ya expiró, renovarlo
      if (timeToExpire < fiveMinutesInMs) {
        this.logger.warn(`⏰ Token expirando en ${Math.round(timeToExpire / 1000)}s, renovando...`);
        
        const newToken = await this.refreshGoogleToken(cuentaGmailId);
        
        if (!newToken) {
          throw new Error(`No se pudo renovar el token para cuenta ${cuentaGmailId}`);
        }

        return newToken;
      }

      // 4️⃣ Token actual es válido
      this.logger.log(`✅ Token actual válido para cuenta ${cuentaGmailId}`);
      return account.access_token;

    } catch (error) {
      this.logger.error(`❌ Error obteniendo token válido:`, error);
      throw new Error(`Token inválido y no se pudo renovar: ${error.message}`);
    }
  }

  /**
   * 🔍 Obtener cuenta Gmail por User ID (para compatibilidad con CalendarService)
   */
  async getGmailAccountByUserId(userId: number): Promise<{
    id: number;
    google_token: string;
    refresh_token?: string;
  } | null> {
    try {
      // Obtener la primera cuenta activa del usuario
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

    } catch (error) {
      this.logger.error(`❌ Error obteniendo cuenta por user ID:`, error);
      return null;
    }
  }

  // ================================
  // 🔄 MÉTODOS DE COMPATIBILIDAD (para que no rompan su código existente)
  // ================================

  /**
   * 🔧 Método de compatibilidad con su código original
   */
  async query_old(text: string, params?: any[]) {
    try {
      const result = await this.pool.query(text, params);
      return result.rows;
    } catch (error) {
      this.logger.error(`❌ Error en la consulta SQL: ${text}`, error);
      throw new Error('Error ejecutando la consulta SQL');
    }
  }
  
}