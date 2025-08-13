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