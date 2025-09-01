import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import {
  TrafficLightStatus,
  EmailMetadataDBWithTrafficLight,
  MarkEmailRepliedResult,
  UpdateTrafficLightsResult,
  EmailSearchResultWithTrafficLight,
  EmailSearchFiltersWithTrafficLight
} from '../emails/interfaces/traffic-light.interfaces';

// 📧 Interfaces para metadata de emails
export interface EmailMetadataDB {
  id?: number;
  cuenta_gmail_id: number;
  gmail_message_id: string;
  asunto?: string;
  remitente_email?: string;
  remitente_nombre?: string;
  destinatario_email?: string;
  fecha_recibido?: Date;
  esta_leido: boolean;
  tiene_adjuntos: boolean;
  etiquetas_gmail?: string[];
  tamano_bytes?: number;
  fecha_sincronizado?: Date;
}

export interface EmailSearchFilters {
  cuenta_gmail_id?: number;
  esta_leido?: boolean;
  tiene_adjuntos?: boolean;
  remitente_email?: string;
  busqueda_texto?: string;
  fecha_desde?: Date;
  fecha_hasta?: Date;
}

export interface EmailSearchResult {
  emails: EmailMetadataDB[];
  total: number;
}

export interface SyncResult {
  emails_nuevos: number;
  emails_actualizados: number;
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

    this.logger.log('🔌 DatabaseService inicializado para MS-Email');
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
    this.logger.log('🔌 Pool de conexiones cerrado');
  }
// ================================
// 📨 MÉTODOS DE CONSULTA A LA BASE DE DATOS
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
    this.logger.log(`✅ Encontradas ${result.rows.length} cuentas Gmail activas`);
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
  // 📧 SINCRONIZACIÓN DE METADATA
  // ================================

  /**
   * 💾 Guardar múltiples emails en lote (UPSERT)
   */
  async syncEmailsMetadata(emails: EmailMetadataDB[]): Promise<SyncResult> {
    if (emails.length === 0) {
      return { emails_nuevos: 0, emails_actualizados: 0, total_procesados: 0, tiempo_ms: 0 };
    }

    const startTime = Date.now();
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      let emailsNuevos = 0;
      let emailsActualizados = 0;
      
      for (const email of emails) {
        // 🎯 UPSERT - Insert o Update si ya existe
        const query = `
          INSERT INTO emails_sincronizados (
            cuenta_gmail_id, gmail_message_id, asunto, 
            remitente_email, remitente_nombre, destinatario_email,
            fecha_recibido, esta_leido, tiene_adjuntos, 
            etiquetas_gmail, tamano_bytes, fecha_sincronizado
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
          ON CONFLICT (cuenta_gmail_id, gmail_message_id) 
          DO UPDATE SET
            asunto = EXCLUDED.asunto,
            remitente_email = EXCLUDED.remitente_email,
            remitente_nombre = EXCLUDED.remitente_nombre,
            destinatario_email = EXCLUDED.destinatario_email,
            esta_leido = EXCLUDED.esta_leido,
            tiene_adjuntos = EXCLUDED.tiene_adjuntos,
            etiquetas_gmail = EXCLUDED.etiquetas_gmail,
            tamano_bytes = EXCLUDED.tamano_bytes,
            fecha_sincronizado = NOW()
          RETURNING (xmax = 0) AS inserted
        `;

        const result = await client.query(query, [
          email.cuenta_gmail_id,
          email.gmail_message_id,
          email.asunto || null,
          email.remitente_email || null,
          email.remitente_nombre || null,
          email.destinatario_email || null,
          email.fecha_recibido || null,
          email.esta_leido,
          email.tiene_adjuntos,
          email.etiquetas_gmail || null,
          email.tamano_bytes || null
        ]);

        // xmax = 0 significa que fue INSERT, xmax > 0 significa UPDATE
        if (result.rows[0]?.inserted) {
          emailsNuevos++;
        } else {
          emailsActualizados++;
        }
      }

      await client.query('COMMIT');
      
      const tiempoMs = Date.now() - startTime;
      
      this.logger.log(`✅ Sync completado: ${emailsNuevos} nuevos, ${emailsActualizados} actualizados (${tiempoMs}ms)`);
      
      return {
        emails_nuevos: emailsNuevos,
        emails_actualizados: emailsActualizados,
        total_procesados: emails.length,
        tiempo_ms: tiempoMs
      };

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('❌ Error sincronizando emails:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ================================
  // 🔍 BÚSQUEDAS EN BD LOCAL
  // ================================

  /**
   * 📖 Obtener emails con paginación desde BD local
   */
  async getEmailsPaginated(
    cuentaGmailId: number,
    page: number = 1,
    limit: number = 10,
    soloNoLeidos: boolean = false
  ): Promise<EmailSearchResult> {
    const offset = (page - 1) * limit;
    const filtroLeidos = soloNoLeidos ? 'AND esta_leido = FALSE' : '';

    const queryEmails = `
      SELECT 
        id, gmail_message_id, asunto, remitente_email, remitente_nombre,
        destinatario_email, fecha_recibido, esta_leido, tiene_adjuntos,
        etiquetas_gmail, tamano_bytes, fecha_sincronizado
      FROM emails_sincronizados 
      WHERE cuenta_gmail_id = $1 ${filtroLeidos}
      ORDER BY fecha_recibido DESC NULLS LAST
      LIMIT $2 OFFSET $3
    `;

    const queryTotal = `
      SELECT COUNT(*) as total FROM emails_sincronizados 
      WHERE cuenta_gmail_id = $1 ${filtroLeidos}
    `;

    const [emailsResult, totalResult] = await Promise.all([
      this.query<EmailMetadataDB>(queryEmails, [cuentaGmailId, limit, offset]),
      this.query<{ total: string }>(queryTotal, [cuentaGmailId])
    ]);

    return {
      emails: emailsResult.rows,
      total: parseInt(totalResult.rows[0].total)
    };
  }

  /**
   * 🔍 Búsqueda avanzada en BD local
   */
  async searchEmailsInDB(
    cuentaGmailId: number,
    filters: EmailSearchFilters,
    page: number = 1,
    limit: number = 10
  ): Promise<EmailSearchResult> {
    const offset = (page - 1) * limit;
    
    // 🎯 CONSTRUIR QUERY DINÁMICO
    const conditions: string[] = ['cuenta_gmail_id = $1'];
    const params: any[] = [cuentaGmailId];
    let paramIndex = 2;

    // Filtro por texto (buscar en asunto, remitente, destinatario)
    if (filters.busqueda_texto) {
      conditions.push(`(
        LOWER(asunto) LIKE $${paramIndex} OR 
        LOWER(remitente_email) LIKE $${paramIndex} OR 
        LOWER(remitente_nombre) LIKE $${paramIndex} OR
        LOWER(destinatario_email) LIKE $${paramIndex}
      )`);
      params.push(`%${filters.busqueda_texto.toLowerCase()}%`);
      paramIndex++;
    }

    // Filtro por estado leído
    if (filters.esta_leido !== undefined) {
      conditions.push(`esta_leido = $${paramIndex}`);
      params.push(filters.esta_leido);
      paramIndex++;
    }

    // Filtro por adjuntos
    if (filters.tiene_adjuntos !== undefined) {
      conditions.push(`tiene_adjuntos = $${paramIndex}`);
      params.push(filters.tiene_adjuntos);
      paramIndex++;
    }

    // Filtro por remitente específico
    if (filters.remitente_email) {
      conditions.push(`LOWER(remitente_email) = $${paramIndex}`);
      params.push(filters.remitente_email.toLowerCase());
      paramIndex++;
    }

    // Filtro por rango de fechas
    if (filters.fecha_desde) {
      conditions.push(`fecha_recibido >= $${paramIndex}`);
      params.push(filters.fecha_desde);
      paramIndex++;
    }

    if (filters.fecha_hasta) {
      conditions.push(`fecha_recibido <= $${paramIndex}`);
      params.push(filters.fecha_hasta);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Queries para emails y count total
    const queryEmails = `
      SELECT 
        id, gmail_message_id, asunto, remitente_email, remitente_nombre,
        destinatario_email, fecha_recibido, esta_leido, tiene_adjuntos,
        etiquetas_gmail, tamano_bytes, fecha_sincronizado
      FROM emails_sincronizados 
      WHERE ${whereClause}
      ORDER BY fecha_recibido DESC NULLS LAST
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const queryTotal = `
      SELECT COUNT(*) as total FROM emails_sincronizados 
      WHERE ${whereClause}
    `;

    const emailsParams = [...params, limit, offset];
    const totalParams = [...params];

    const [emailsResult, totalResult] = await Promise.all([
      this.query<EmailMetadataDB>(queryEmails, emailsParams),
      this.query<{ total: string }>(queryTotal, totalParams)
    ]);

    return {
      emails: emailsResult.rows,
      total: parseInt(totalResult.rows[0].total)
    };
  }


  
/**
 * 📧 Obtener todas las cuentas Gmail de un usuario principal
 * 🎯 Para búsqueda global
 */
async obtenerCuentasGmailUsuario(usuarioId: number): Promise<Array<{
  id: number;
  email_gmail: string;
  nombre_cuenta: string;
  alias_personalizado?: string;
  fecha_conexion: Date;
  ultima_sincronizacion?: Date;
  esta_activa: boolean;
  emails_count: number;
}>> {
  try {
    this.logger.log(`📧 Obteniendo cuentas Gmail para usuario ${usuarioId}`);

    const query = `
      SELECT 
        cga.id,
        cga.email_gmail,
        cga.nombre_cuenta,
        cga.alias_personalizado,
        cga.fecha_conexion,
        cga.ultima_sincronizacion,
        cga.esta_activa,
        COALESCE(email_counts.count, 0) as emails_count
      FROM cuentas_gmail_asociadas cga
      LEFT JOIN (
        SELECT cuenta_gmail_id, COUNT(*) as count 
        FROM emails_sincronizados 
        GROUP BY cuenta_gmail_id
      ) email_counts ON cga.id = email_counts.cuenta_gmail_id
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
      emails_count: string; // Viene como string del COUNT
    }>(query, [usuarioId]);

    const cuentas = result.rows.map(cuenta => ({
      ...cuenta,
      emails_count: parseInt(cuenta.emails_count, 10) || 0
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
  async getEmailStatsFromDB(cuentaGmailId: number): Promise<{
    total_emails: number;
    emails_no_leidos: number;
    emails_leidos: number;
    emails_con_adjuntos: number;
    ultimo_email_fecha?: Date;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_emails,
        COUNT(CASE WHEN esta_leido = FALSE THEN 1 END) as emails_no_leidos,
        COUNT(CASE WHEN esta_leido = TRUE THEN 1 END) as emails_leidos,
        COUNT(CASE WHEN tiene_adjuntos = TRUE THEN 1 END) as emails_con_adjuntos,
        MAX(fecha_recibido) as ultimo_email_fecha
      FROM emails_sincronizados 
      WHERE cuenta_gmail_id = $1
    `;

    const result = await this.query<{
      total_emails: string;
      emails_no_leidos: string;
      emails_leidos: string;
      emails_con_adjuntos: string;
      ultimo_email_fecha: Date;
    }>(query, [cuentaGmailId]);

    const stats = result.rows[0];

    return {
      total_emails: parseInt(stats?.total_emails || '0'),
      emails_no_leidos: parseInt(stats?.emails_no_leidos || '0'),
      emails_leidos: parseInt(stats?.emails_leidos || '0'),
      emails_con_adjuntos: parseInt(stats?.emails_con_adjuntos || '0'),
      ultimo_email_fecha: stats?.ultimo_email_fecha
    };
  }

  // ================================
  // 🧹 UTILIDADES
  // ================================

  /**
   * 🔍 Obtener último email sincronizado (para sync incremental)
   */
  async getLastSyncedEmail(cuentaGmailId: number): Promise<EmailMetadataDB | null> {
    const query = `
      SELECT * FROM emails_sincronizados 
      WHERE cuenta_gmail_id = $1 
      ORDER BY fecha_sincronizado DESC 
      LIMIT 1
    `;

    const result = await this.query<EmailMetadataDB>(query, [cuentaGmailId]);
    return result.rows[0] || null;
  }

  /**
   * 🗑️ Limpiar emails viejos (opcional - para mantenimiento)
   */
  async cleanupOldEmails(cuentaGmailId: number, olderThanDays: number = 90): Promise<number> {
    const query = `
      DELETE FROM emails_sincronizados 
      WHERE cuenta_gmail_id = $1 
      AND fecha_recibido < NOW() - INTERVAL '${olderThanDays} days'
    `;

    const result = await this.query(query, [cuentaGmailId]);
    
    this.logger.log(`🗑️ Limpieza completada: ${result.rowCount} emails eliminados`);
    
    return result.rowCount;
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
// 🔄 REFRESH TOKEN DE GOOGLE
// ================================

async refreshGoogleToken(cuentaGmailId: number): Promise<string> {
  try {
    // 1. Obtener el refresh token de la BD
    const query = `
      SELECT refresh_token, email_gmail 
      FROM cuentas_gmail_asociadas 
      WHERE id = $1
    `;
    const result = await this.query<{refresh_token: string; email_gmail: string}>(
      query, 
      [cuentaGmailId]
    );
    
    if (!result.rows[0]?.refresh_token) {
      throw new Error('No hay refresh token para esta cuenta');
    }

    const refreshToken = result.rows[0].refresh_token;
    this.logger.log(`🔑 Renovando token para cuenta ${result.rows[0].email_gmail}...`);
    
    // 2. Importar googleapis dinámicamente
    const { google } = await import('googleapis');
    
    // 3. Configurar OAuth2Client
    const oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      'http://localhost:3001/auth/google/callback' // O la URL que uses
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    // 4. Obtener nuevo access token
    const { credentials } = await oauth2Client.refreshAccessToken();
    const newAccessToken = credentials.access_token;
    
    if (!newAccessToken) {
      throw new Error('No se pudo obtener nuevo access token');
    }

    // 5. Actualizar en la BD
    const updateQuery = `
      UPDATE cuentas_gmail_asociadas 
      SET 
        access_token = $1,
        token_expira_en = $2,
        ultima_sincronizacion = NOW()
      WHERE id = $3
    `;
    
    const expiresAt = new Date(Date.now() + 3600000); // 1 hora
    await this.query(updateQuery, [
      newAccessToken, 
      expiresAt, 
      cuentaGmailId
    ]);
    
    this.logger.log(`✅ Token renovado exitosamente para cuenta ${cuentaGmailId}`);
    return newAccessToken;
    
  } catch (error) {
    this.logger.error('❌ Error renovando token:', error);
    throw error;
  }
}
/**
 * 🕐 Actualizar timestamp de última sincronización después de sync exitoso
 */
async updateLastSyncTime(cuentaGmailId: number): Promise<void> {
  try {
    const query = `
      UPDATE cuentas_gmail_asociadas 
      SET ultima_sincronizacion = NOW()
      WHERE id = $1
    `;
    
    await this.query(query, [cuentaGmailId]);
    this.logger.log(`🕐 Timestamp actualizado para cuenta Gmail ID: ${cuentaGmailId}`);
    
  } catch (error) {
    this.logger.error(`❌ Error actualizando timestamp para cuenta ${cuentaGmailId}:`, error);
    throw error;
  }
}


/**
 * Marcar email como respondido usando función SQL
 */
async markEmailAsReplied(
  gmailMessageId: string, 
  repliedAt: Date = new Date()
): Promise<MarkEmailRepliedResult | null> {
  try {
    this.logger.log(`🚦 Marcando email ${gmailMessageId} como respondido`);
    
    const result = await this.query<MarkEmailRepliedResult>(`
      SELECT * FROM mark_email_as_replied($1, $2)
    `, [gmailMessageId, repliedAt]);

    if (result.rows.length > 0) {
      const emailResult = result.rows[0];
      this.logger.log(
        `✅ Email ${emailResult.email_id}: ${emailResult.old_status} → ${emailResult.new_status} (${emailResult.days_saved} días ahorrados)`
      );
      return emailResult;
    }
    
    this.logger.warn(`⚠️ Email ${gmailMessageId} no encontrado para marcar como respondido`);
    return null;
    
  } catch (error) {
    this.logger.error(`❌ Error marcando email como respondido:`, error);
    throw error;
  }
}

/**
 * Actualizar semaforos de todos los emails usando función SQL
 */
async updateAllTrafficLights(): Promise<UpdateTrafficLightsResult> {
  try {
    this.logger.log('🚦 Actualizando todos los semaforos...');
    
    const result = await this.query<UpdateTrafficLightsResult>(`
      SELECT * FROM update_all_traffic_lights()
    `);
    
    if (result.rows.length > 0) {
      const stats = result.rows[0];
      this.logger.log(`✅ Semáforos actualizados: ${stats.actualizados} emails en ${stats.tiempo_ms}ms`);
      this.logger.log(`📊 Por estado:`, stats.por_estado);
      return stats;
    }
    
    // Fallback si no hay resultado
    return {
      actualizados: 0,
      por_estado: {},
      tiempo_ms: 0
    };
    
  } catch (error) {
    this.logger.error('❌ Error actualizando semaforos:', error);
    throw error;
  }
}

/**
 * Obtener emails por estado de semaforo
 */
async getEmailsByTrafficLight(
  cuentaGmailId: number,
  status: TrafficLightStatus,
  limit: number = 10
): Promise<EmailMetadataDBWithTrafficLight[]> {
  try {
    const query = `
      SELECT 
        id, cuenta_gmail_id, gmail_message_id, asunto, 
        remitente_email, remitente_nombre, destinatario_email,
        fecha_recibido, esta_leido, tiene_adjuntos,
        etiquetas_gmail, tamano_bytes, fecha_sincronizado,
        replied_at, days_without_reply, traffic_light_status
      FROM emails_sincronizados 
      WHERE cuenta_gmail_id = $1 
        AND traffic_light_status = $2
      ORDER BY days_without_reply DESC, fecha_recibido ASC
      LIMIT $3
    `;

    const result = await this.query<EmailMetadataDBWithTrafficLight>(
      query, 
      [cuentaGmailId, status, limit]
    );

    this.logger.log(`🚦 Encontrados ${result.rows.length} emails con estado ${status}`);
    return result.rows;
    
  } catch (error) {
    this.logger.error(`❌ Error obteniendo emails por semaforo:`, error);
    throw error;
  }
}

/**
 * Obtener estadísticas de semaforo por cuenta
 */
async getTrafficLightStatsByAccount(
  cuentaGmailId: number
): Promise<Array<{
  traffic_light_status: TrafficLightStatus;
  count: string;
  avg_days: string | null;
}>> {
  try {
    const query = `
      SELECT 
        traffic_light_status,
        COUNT(*)::text as count,
        AVG(days_without_reply)::text as avg_days
      FROM emails_sincronizados 
      WHERE cuenta_gmail_id = $1 AND replied_at IS NULL
      GROUP BY traffic_light_status
      ORDER BY 
        CASE traffic_light_status 
          WHEN 'red' THEN 1 
          WHEN 'orange' THEN 2 
          WHEN 'yellow' THEN 3 
          WHEN 'green' THEN 4 
        END
    `;

    const result = await this.query<{
      traffic_light_status: TrafficLightStatus;
      count: string;
      avg_days: string | null;
    }>(query, [cuentaGmailId]);

    return result.rows;
    
  } catch (error) {
    this.logger.error(`❌ Error obteniendo estadísticas de semaforo:`, error);
    throw error;
  }
}

/**
 * Buscar emails con filtros de semaforo extendidos
 */

async searchEmailsWithTrafficLight(
  filters: EmailSearchFiltersWithTrafficLight,
  page: number = 1,
  limit: number = 10
): Promise<EmailSearchResultWithTrafficLight> {
  const offset = (page - 1) * limit;
  
  try {
    const { conditions, params } = this.buildTrafficLightSearchConditions(filters);
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const queries = this.buildTrafficLightSearchQueries(whereClause, params.length);
    
    const emailsParams = [...params, limit, offset];
    const totalParams = [...params];

    const [emailsResult, totalResult] = await Promise.all([
      this.query<EmailMetadataDBWithTrafficLight>(queries.emailsQuery, emailsParams),
      this.query<{ total: string }>(queries.totalQuery, totalParams)
    ]);

    return {
      emails: emailsResult.rows,
      total: parseInt(totalResult.rows[0].total)
    };

  } catch (error) {
    this.logger.error('Error en búsqueda con semaforo:', error);
    throw error;
  }
}

/**
 * Construir condiciones de búsqueda para filtros del semaforo
 */
private buildTrafficLightSearchConditions(
  filters: EmailSearchFiltersWithTrafficLight
): { conditions: string[]; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  // Filtro por cuenta
  if (filters.cuenta_gmail_id) {
    conditions.push(`cuenta_gmail_id = $${paramIndex}`);
    params.push(filters.cuenta_gmail_id);
    paramIndex++;
  }

  // Filtros del semaforo
  const trafficConditions = this.buildTrafficLightConditions(filters, paramIndex);
  conditions.push(...trafficConditions.conditions);
  params.push(...trafficConditions.params);
  paramIndex += trafficConditions.params.length;

  // Filtros de texto y básicos
  const basicConditions = this.buildBasicSearchConditions(filters, paramIndex);
  conditions.push(...basicConditions.conditions);
  params.push(...basicConditions.params);

  return { conditions, params };
}

/**
 * Construir condiciones específicas del semaforo
 */
private buildTrafficLightConditions(
  filters: EmailSearchFiltersWithTrafficLight,
  startIndex: number
): { conditions: string[]; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = startIndex;

  if (filters.traffic_light_status) {
    conditions.push(`traffic_light_status = $${paramIndex}`);
    params.push(filters.traffic_light_status);
    paramIndex++;
  }

  if (filters.days_without_reply_min !== undefined) {
    conditions.push(`days_without_reply >= $${paramIndex}`);
    params.push(filters.days_without_reply_min);
    paramIndex++;
  }

  if (filters.days_without_reply_max !== undefined) {
    conditions.push(`days_without_reply <= $${paramIndex}`);
    params.push(filters.days_without_reply_max);
    paramIndex++;
  }

  if (filters.replied !== undefined) {
    if (filters.replied) {
      conditions.push(`replied_at IS NOT NULL`);
    } else {
      conditions.push(`replied_at IS NULL`);
    }
  }

  return { conditions, params };
}
/**
 * 🗑️ Marcar email como eliminado usando el semaforo
 */
async markEmailAsDeleted(
  gmailMessageId: string
): Promise<{
  email_id: number;
  previousStatus: TrafficLightStatus;
  success: boolean;
} | null> {
  try {
    this.logger.log(`🗑️ Marcando email ${gmailMessageId} como eliminado`);
    
    // 1️⃣ PRIMERO: Obtener el estado actual ANTES de modificar
    const currentState = await this.query<{
      id: number;
      traffic_light_status: TrafficLightStatus;
    }>(`
      SELECT id, traffic_light_status 
      FROM emails_sincronizados 
      WHERE gmail_message_id = $1
    `, [gmailMessageId]);

    if (currentState.rows.length === 0) {
      this.logger.warn(`⚠️ Email ${gmailMessageId} no encontrado para eliminar`);
      return null;
    }

    const currentEmail = currentState.rows[0];
    
    // 2️⃣ SEGUNDO: Hacer el UPDATE
    await this.query(`
      UPDATE emails_sincronizados 
      SET 
        traffic_light_status = 'deleted',
        replied_at = NOW()
      WHERE gmail_message_id = $1
    `, [gmailMessageId]);

    this.logger.log(
      `✅ Email ${currentEmail.id} marcado como eliminado (era ${currentEmail.traffic_light_status})`
    );
    
    return {
      email_id: currentEmail.id,
      previousStatus: currentEmail.traffic_light_status,  // ✅ Ahora sí es el anterior
      success: true
    };
    
  } catch (error) {
    this.logger.error(`❌ Error marcando email como eliminado:`, error);
    throw error;
  }
}

/**
 * Construir condiciones básicas de búsqueda
 */
private buildBasicSearchConditions(
  filters: EmailSearchFiltersWithTrafficLight,
  startIndex: number
): { conditions: string[]; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = startIndex;

  if (filters.busqueda_texto) {
    conditions.push(`(
      LOWER(asunto) LIKE $${paramIndex} OR 
      LOWER(remitente_email) LIKE $${paramIndex} OR 
      LOWER(remitente_nombre) LIKE $${paramIndex} OR
      LOWER(destinatario_email) LIKE $${paramIndex}
    )`);
    params.push(`%${filters.busqueda_texto.toLowerCase()}%`);
    paramIndex++;
  }

  if (filters.esta_leido !== undefined) {
    conditions.push(`esta_leido = $${paramIndex}`);
    params.push(filters.esta_leido);
    paramIndex++;
  }

  if (filters.tiene_adjuntos !== undefined) {
    conditions.push(`tiene_adjuntos = $${paramIndex}`);
    params.push(filters.tiene_adjuntos);
    paramIndex++;
  }

  if (filters.remitente_email) {
    conditions.push(`LOWER(remitente_email) = $${paramIndex}`);
    params.push(filters.remitente_email.toLowerCase());
    paramIndex++;
  }

  return this.addDateFilters(filters, { conditions, params }, paramIndex);
}

/**
 * Agregar filtros de fecha
 */
private addDateFilters(
  filters: EmailSearchFiltersWithTrafficLight,
  current: { conditions: string[]; params: any[] },
  startIndex: number
): { conditions: string[]; params: any[] } {
  let paramIndex = startIndex;

  if (filters.fecha_desde) {
    current.conditions.push(`fecha_recibido >= $${paramIndex}`);
    current.params.push(filters.fecha_desde);
    paramIndex++;
  }

  if (filters.fecha_hasta) {
    current.conditions.push(`fecha_recibido <= $${paramIndex}`);
    current.params.push(filters.fecha_hasta);
  }

  return current;
}

/**
 * Construir queries SQL para la búsqueda
 */
private buildTrafficLightSearchQueries(
  whereClause: string, 
  paramCount: number
): { emailsQuery: string; totalQuery: string } {
  const emailsQuery = `
    SELECT 
      id, cuenta_gmail_id, gmail_message_id, asunto,
      remitente_email, remitente_nombre, destinatario_email,
      fecha_recibido, esta_leido, tiene_adjuntos,
      etiquetas_gmail, tamano_bytes, fecha_sincronizado,
      replied_at, days_without_reply, traffic_light_status
    FROM emails_sincronizados 
    ${whereClause}
    ORDER BY 
      CASE traffic_light_status 
        WHEN 'red' THEN 1 
        WHEN 'orange' THEN 2 
        WHEN 'yellow' THEN 3 
        WHEN 'green' THEN 4 
      END,
      days_without_reply DESC,
      fecha_recibido DESC
    LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
  `;

  const totalQuery = `
    SELECT COUNT(*)::text as total FROM emails_sincronizados 
    ${whereClause}
  `;

  return { emailsQuery, totalQuery };
}

/**
 * Buscar email específico por ID para responder
 */
async findEmailByIdForUser(
  emailId: string,
  userId: number
): Promise<{
  email: EmailMetadataDBWithTrafficLight;
  cuentaGmail: {
    id: number;
    email_gmail: string;
    nombre_cuenta: string;
  };
} | null> {
  try {
    const query = `
      SELECT 
        es.id, es.cuenta_gmail_id, es.gmail_message_id, es.asunto,
        es.remitente_email, es.remitente_nombre, es.destinatario_email,
        es.fecha_recibido, es.esta_leido, es.tiene_adjuntos,
        es.etiquetas_gmail, es.tamano_bytes, es.fecha_sincronizado,
        es.replied_at, es.days_without_reply, es.traffic_light_status,
        cga.id as cuenta_id, cga.email_gmail, cga.nombre_cuenta
      FROM emails_sincronizados es
      INNER JOIN cuentas_gmail_asociadas cga ON es.cuenta_gmail_id = cga.id
      WHERE es.gmail_message_id = $1 
        AND cga.usuario_principal_id = $2
        AND cga.esta_activa = TRUE
      LIMIT 1
    `;

    const result = await this.query<EmailMetadataDBWithTrafficLight & {
      cuenta_id: number;
      email_gmail: string;
      nombre_cuenta: string;
    }>(query, [emailId, userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      email: {
        id: row.id,
        cuenta_gmail_id: row.cuenta_gmail_id,
        gmail_message_id: row.gmail_message_id,
        asunto: row.asunto,
        remitente_email: row.remitente_email,
        remitente_nombre: row.remitente_nombre,
        destinatario_email: row.destinatario_email,
        fecha_recibido: row.fecha_recibido,
        esta_leido: row.esta_leido,
        tiene_adjuntos: row.tiene_adjuntos,
        etiquetas_gmail: row.etiquetas_gmail,
        tamano_bytes: row.tamano_bytes,
        fecha_sincronizado: row.fecha_sincronizado,
        replied_at: row.replied_at,
        days_without_reply: row.days_without_reply,
        traffic_light_status: row.traffic_light_status
      },
      cuentaGmail: {
        id: row.cuenta_id,
        email_gmail: row.email_gmail,
        nombre_cuenta: row.nombre_cuenta
      }
    };

  } catch (error) {
    this.logger.error(`❌ Error buscando email para usuario:`, error);
    throw error;
  }
}
}