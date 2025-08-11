import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

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
}