// ms-yourdashboard-auth/src/database/database.service.ts
import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { 
  UsuarioPrincipal,

  CuentaGmailAsociada,
  EmailSincronizado,
  DatabaseQueryResult,
  GoogleOAuthData,
  RegistroUsuarioDto,
  CrearSesionDto,
  EstadisticasUsuario,
  CuentaGmailResponse,
  // UserTokens,

} from '../auth/interfaces/auth.interfaces';
import { UserRepository } from './repositories/user.repository';
import { SessionRepository } from './repositories/session.repository';
import { PrismaService } from './prisma.service';
import type { sesiones_jwt, usuarios_principales } from 'generated/prisma';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool;

  constructor(private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly prisma: PrismaService
  ) {
    this.pool = new Pool({
      host: this.configService.get<string>('DB_HOST'),
      port: this.configService.get<number>('DB_PORT'),
      database: this.configService.get<string>('DB_NAME'),
      user: this.configService.get<string>('DB_USER'),
      password: this.configService.get<string>('DB_PASSWORD'),
    });

    this.logger.log('🔌 DatabaseService inicializado con nueva arquitectura');
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
    this.logger.log('🔌 Pool de conexiones cerrado');
  }

  // ================================
  // 🔧 MÉTODO GENÉRICO PARA QUERIES
  // ================================

  async query<T extends QueryResultRow = any>(
    text: string, 
    params?: any[]
  ): Promise<DatabaseQueryResult<T>> {
    const client: PoolClient = await this.pool.connect();
    try {
      const start = Date.now();
      const result: QueryResult<T> = await client.query<T>(text, params);
      const duration = Date.now() - start;
      
      this.logger.debug(`🔍 Query ejecutado en ${duration}ms: ${text.substring(0, 50)}...`);
      
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        command: result.command
      };
    } catch (error) {
      this.logger.error(`❌ Error en query: ${text}`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ================================
  // 👤 USUARIOS PRINCIPALES
  // ================================

  // async crearUsuarioPrincipal(userData: RegistroUsuarioDto & { password_hash: string }): Promise<UsuarioPrincipal> {
  //   const query = `
  //     INSERT INTO usuarios_principales (email, password_hash, nombre, email_verificado)
  //     VALUES ($1, $2, $3, $4)
  //     RETURNING *
  //   `;
    
  //   const result = await this.query<UsuarioPrincipal>(query, [
  //     userData.email,
  //     userData.password_hash,
  //     userData.nombre,
  //     false // Email no verificado por defecto
  //   ]);

  //   this.logger.log(`✅ Usuario principal creado: ${userData.email}`);
  //   return result.rows[0];
  // }

  // async buscarUsuarioPorEmail(email: string): Promise<UsuarioPrincipal | null> {
  //   const query = `SELECT * FROM usuarios_principales WHERE email = $1 AND estado = 'activo'`;
  //   const result = await this.query<UsuarioPrincipal>(query, [email]);
  //   return result.rows[0] || null;
  // }

  // async buscarUsuarioPorId(id: string): Promise<UsuarioPrincipal | null> {
  //   const query = `SELECT * FROM usuarios_principales WHERE id = $1 AND estado = 'activo'`;
  //   const result = await this.query<UsuarioPrincipal>(query, [id]);
  //   return result.rows[0] || null;
  // }

  // async actualizarUltimaActividad(userId: string): Promise<void> {
  //   const query = `
  //     UPDATE usuarios_principales 
  //     SET ultima_actualizacion = NOW() 
  //     WHERE id = $1
  //   `;
  //   await this.query(query, [userId]);
  // }
// 👤 USUARIOS PRINCIPALES - PRISMA


async crearUsuarioPrincipal(userData: RegistroUsuarioDto & { password_hash: string }): Promise<usuarios_principales> {
  const usuario = await this.userRepository.create(userData);
  this.logger.log(`✅ Usuario principal creado: ${userData.email}`);
  return usuario;
}

async buscarUsuarioPorEmail(email: string): Promise<usuarios_principales | null> {
  return this.userRepository.findByEmail(email);
}

async buscarUsuarioPorId(id: string): Promise<usuarios_principales | null> {
  return this.userRepository.findById(id);
}

async actualizarUltimaActividad(userId: string): Promise<void> {
  await this.userRepository.updateLastActivity(userId);
}
  // ================================
  // 🔐 SESIONES JWT
  // ================================

  // async crearSesion(sessionData: CrearSesionDto & { jwt_token: string }): Promise<SesionJwt> {
  //   const horasVida = sessionData.duracion_horas || 24;
  //   const query = `
  //     INSERT INTO sesiones_jwt (
  //       usuario_principal_id, jwt_token, expira_en, 
  //       ip_origen, user_agent, esta_activa
  //     )
  //     VALUES ($1, $2, NOW() + INTERVAL '${horasVida} hours', $3, $4, TRUE)
  //     RETURNING *
  //   `;
    
  //   const result = await this.query<SesionJwt>(query, [
  //     sessionData.usuario_principal_id,
  //     sessionData.jwt_token,
  //     sessionData.ip_origen || null,
  //     sessionData.user_agent || null
  //   ]);

  //   this.logger.log(`🔐 Sesión JWT creada para usuario ${sessionData.usuario_principal_id}`);
  //   return result.rows[0];
  // }

  // async validarSesion(jwtToken: string): Promise<SesionJwt | null> {
  //   const query = `
  //     SELECT * FROM sesiones_jwt 
  //     WHERE jwt_token = $1 
  //     AND esta_activa = TRUE 
  //     AND expira_en > NOW()
  //   `;
  //   const result = await this.query<SesionJwt>(query, [jwtToken]);
  //   return result.rows[0] || null;
  // }

  // async invalidarSesion(jwtToken: string): Promise<void> {
  //   const query = `
  //     UPDATE sesiones_jwt 
  //     SET esta_activa = FALSE 
  //     WHERE jwt_token = $1
  //   `;
  //   await this.query(query, [jwtToken]);
  //   this.logger.log(`🚪 Sesión invalidada`);
  // }

  // async limpiarSesionesExpiradas(): Promise<number> {
  //   const query = `
  //     DELETE FROM sesiones_jwt 
  //     WHERE expira_en < NOW() OR esta_activa = FALSE
  //   `;
  //   const result = await this.query(query);
  //   this.logger.log(`🧹 ${result.rowCount} sesiones expiradas eliminadas`);
  //   return result.rowCount;
  // }
// 🔐 SESIONES JWT - PRISMA

async crearSesion(sessionData: CrearSesionDto & { jwt_token: string }): Promise<sesiones_jwt> {
  return this.sessionRepository.create(sessionData);
}

async validarSesion(jwtToken: string): Promise<sesiones_jwt | null> {
  return this.sessionRepository.findValidSession(jwtToken);
}

async invalidarSesion(jwtToken: string): Promise<void> {
  await this.sessionRepository.invalidate(jwtToken);
}

async limpiarSesionesExpiradas(): Promise<number> {
  return this.sessionRepository.cleanExpiredSessions();
}
  // ================================
  // 📧 CUENTAS GMAIL ASOCIADAS
  // ================================

 async conectarCuentaGmail(oauthData: GoogleOAuthData & { usuario_principal_id: string, alias_personalizado?: string }): Promise<CuentaGmailAsociada> {
    try {
      // 🎯 PRIMERO: Verificar si esta cuenta Gmail ya está conectada a OTRO usuario
      const checkQuery = `
        SELECT usuario_principal_id, email_gmail 
        FROM cuentas_gmail_asociadas 
        WHERE google_id = $1 AND usuario_principal_id != $2 AND esta_activa = TRUE
      `;
      
      const existingAccount = await this.query<{ usuario_principal_id: string; email_gmail: string }>(
        checkQuery, 
        [oauthData.google_id, oauthData.usuario_principal_id]
      );

      if (existingAccount.rows.length > 0) {
        this.logger.warn(`⚠️ Intento de conectar Gmail ${oauthData.email} que ya pertenece a otro usuario`);
        throw new Error(`GMAIL_YA_CONECTADA: La cuenta ${oauthData.email} ya está conectada a otro usuario`);
      }

      const expiresAt = oauthData.token_expira_en 
        ? new Date(oauthData.token_expira_en) 
        : new Date(Date.now() + 3600000); // 1 hora por defecto

      const query = `
        INSERT INTO cuentas_gmail_asociadas (
          usuario_principal_id, email_gmail, nombre_cuenta, google_id,
          access_token, refresh_token, token_expira_en, alias_personalizado
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (usuario_principal_id, email_gmail)
        DO UPDATE SET
          nombre_cuenta = $3,
          access_token = $5,
          refresh_token = $6,
          token_expira_en = $7,
          alias_personalizado = $8,
          esta_activa = TRUE,
          ultima_sincronizacion = NOW()
        RETURNING *
      `;

      const result = await this.query<CuentaGmailAsociada>(query, [
        oauthData.usuario_principal_id,
        oauthData.email,
        oauthData.nombre,
        oauthData.google_id,
        oauthData.access_token,
        oauthData.refresh_token || null,
        expiresAt,
        oauthData.alias_personalizado || null
      ]);

      this.logger.log(`📧 Cuenta Gmail conectada: ${oauthData.email} para usuario ${oauthData.usuario_principal_id}`);
      return result.rows[0];

    } catch (error) {
      // 🎯 Manejar error de constraint UNIQUE de PostgreSQL
      if (error instanceof Error) {
        // Si es nuestro error personalizado
        if (error.message.includes('GMAIL_YA_CONECTADA')) {
          throw error;
        }
        
        // Si es error de PostgreSQL por violación de UNIQUE constraint
        const pgError = error as any;
        if (pgError.code === '23505' && pgError.constraint === 'cuentas_gmail_asociadas_google_id_key') {
          this.logger.error(`❌ Violación de constraint: Gmail ${oauthData.email} ya existe para otro usuario`);
          throw new Error(`GMAIL_YA_CONECTADA: La cuenta ${oauthData.email} ya está conectada a otro usuario`);
        }
      }
      
      this.logger.error(`❌ Error conectando cuenta Gmail:`, error);
      throw error;
    }
  }
async obtenerCuentasGmailUsuario(usuarioId: string): Promise<CuentaGmailResponse[]> {
  const query = `
    SELECT 
      cga.id,
      cga.email_gmail,
      cga.nombre_cuenta,
      cga.alias_personalizado,
      cga.fecha_conexion,
      cga.ultima_sincronizacion,
      cga.esta_activa,
      COALESCE(email_counts.count, 0) as emails_count,
      COALESCE(event_counts.count, 0) as events_count
    FROM cuentas_gmail_asociadas cga
    LEFT JOIN (
      SELECT cuenta_gmail_id, COUNT(*) as count 
      FROM emails_sincronizados 
      GROUP BY cuenta_gmail_id
    ) email_counts ON cga.id = email_counts.cuenta_gmail_id
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
    id: string; 
    email_gmail: string;
    nombre_cuenta: string;
    alias_personalizado?: string;
    fecha_conexion: Date;
    ultima_sincronizacion?: Date;
    esta_activa: boolean;
    emails_count: string; // Viene como string del COUNT
    events_count: string; // Viene como string del COUNT
  }>(query, [usuarioId]);

  // Convertir strings a numbers
  const cuentas = result.rows.map(cuenta => ({
    ...cuenta,
    emails_count: parseInt(cuenta.emails_count, 10) || 0,
    events_count: parseInt(cuenta.events_count, 10) || 0
  }));

  return cuentas;
}
  async obtenerCuentaGmailPorId(cuentaId: string, usuarioId: string): Promise<CuentaGmailAsociada | null> {
    const query = `
      SELECT * FROM cuentas_gmail_asociadas 
      WHERE id = $1 AND usuario_principal_id = $2 AND esta_activa = TRUE
    `;
    const result = await this.query<CuentaGmailAsociada>(query, [cuentaId, usuarioId]);
    return result.rows[0] || null;
  }

  async actualizarTokensGmail(cuentaId: string, accessToken: string, refreshToken?: string, expiresAt?: Date): Promise<void> {
    const query = `
      UPDATE cuentas_gmail_asociadas 
      SET access_token = $2, refresh_token = $3, token_expira_en = $4, ultima_sincronizacion = NOW()
      WHERE id = $1
    `;
    await this.query(query, [cuentaId, accessToken, refreshToken || null, expiresAt || null]);
    this.logger.log(`🔄 Tokens actualizados para cuenta Gmail ID: ${cuentaId}`);
  }
//*************
// este desconectarCuentaGmail solo la update activa=false
// ********************** */
  // async desconectarCuentaGmail(cuentaId: number, usuarioId: number): Promise<void> {
  //   const query = `
  //     UPDATE cuentas_gmail_asociadas 
  //     SET esta_activa = FALSE 
  //     WHERE id = $1 AND usuario_principal_id = $2
  //   `;
  //   await this.query(query, [cuentaId, usuarioId]);
  //   this.logger.log(`📧 Cuenta Gmail desconectada: ID ${cuentaId}`);
  // }

  // ================================
  // 📨 EMAILS SINCRONIZADOS
  // ================================

async desconectarCuentaGmail(cuentaId: string, usuarioId: string): Promise<void> {
  const query = `
    DELETE FROM cuentas_gmail_asociadas 
    WHERE id = $1 AND usuario_principal_id = $2
  `;
  
  const result = await this.query(query, [cuentaId, usuarioId]);
  
  this.logger.log(`🗑️ Cuenta Gmail ELIMINADA: ID ${cuentaId} (${result.rowCount} filas afectadas)`);
  
  // El CASCADE automáticamente borrará todos los emails_sincronizados
}
/**
   * 🔍 Obtener usuario por ID
   */
  async obtenerUsuarioPorId(userId: string): Promise<UsuarioPrincipal | null> {
    const query = `
      SELECT id, email, nombre, fecha_registro, ultima_actualizacion, estado, email_verificado
      FROM usuarios_principales 
      WHERE id = $1
    `;
    const result = await this.query<UsuarioPrincipal>(query, [userId]);
    return result.rows[0] || null;
  }

 

  /**
   * 🗑️ ELIMINAR USUARIO PRINCIPAL (con transacción)
   * Las FK con ON DELETE CASCADE eliminan automáticamente toda la data relacionada
   */
  async eliminarUsuarioPrincipal(userId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Eliminar usuario principal (cascadea automáticamente a todas las tablas relacionadas)
      const deleteResult = await client.query(
        'DELETE FROM usuarios_principales WHERE id = $1 RETURNING email',
        [userId]
      );

      if (deleteResult.rows.length === 0) {
        throw new Error('Usuario no encontrado para eliminar');
      }

      await client.query('COMMIT');
      this.logger.log(`✅ Usuario ${deleteResult.rows[0].email} eliminado con éxito`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('❌ Error en transacción de eliminación:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async sincronizarEmails(emails: Omit<EmailSincronizado, 'id' | 'fecha_sincronizado'>[]): Promise<number> {
    if (emails.length === 0) return 0;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      let emailsInsertados = 0;
      
      for (const email of emails) {
        const query = `
          INSERT INTO emails_sincronizados (
            cuenta_gmail_id, gmail_message_id, asunto, 
            remitente_email, remitente_nombre, fecha_recibido,
            esta_leido, tiene_adjuntos, etiquetas_gmail
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (cuenta_gmail_id, gmail_message_id) 
          DO UPDATE SET
            asunto = $3,
            remitente_email = $4,
            remitente_nombre = $5,
            esta_leido = $7,
            tiene_adjuntos = $8,
            etiquetas_gmail = $9,
            fecha_sincronizado = NOW()
        `;

        await client.query(query, [
          email.cuenta_gmail_id,
          email.gmail_message_id,
          email.asunto || null,
          email.remitente_email || null,
          email.remitente_nombre || null,
          email.fecha_recibido || null,
          email.esta_leido,
          email.tiene_adjuntos,
          email.etiquetas_gmail || null
        ]);
        
        emailsInsertados++;
      }

      await client.query('COMMIT');
      this.logger.log(`📨 ${emailsInsertados} emails sincronizados`);
      return emailsInsertados;

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('❌ Error sincronizando emails:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async obtenerEmailsPaginados(
    cuentaGmailId: string, 
    page: number = 1, 
    limit: number = 10,
    soloNoLeidos: boolean = false
  ): Promise<{ emails: EmailSincronizado[]; total: number }> {
    const offset = (page - 1) * limit;
    const filtroLeidos = soloNoLeidos ? 'AND esta_leido = FALSE' : '';

    const queryEmails = `
      SELECT * FROM emails_sincronizados 
      WHERE cuenta_gmail_id = $1 ${filtroLeidos}
      ORDER BY fecha_recibido DESC 
      LIMIT $2 OFFSET $3
    `;

    const queryTotal = `
      SELECT COUNT(*) as total FROM emails_sincronizados 
      WHERE cuenta_gmail_id = $1 ${filtroLeidos}
    `;

    const [emailsResult, totalResult] = await Promise.all([
      this.query<EmailSincronizado>(queryEmails, [cuentaGmailId, limit, offset]),
      this.query<{ total: string }>(queryTotal, [cuentaGmailId])
    ]);

    return {
      emails: emailsResult.rows,
      total: parseInt(totalResult.rows[0].total)
    };
  }

  async buscarEmails(cuentaGmailId: string, termino: string, page: number = 1, limit: number = 10): Promise<{ emails: EmailSincronizado[]; total: number }> {
    const offset = (page - 1) * limit;
    const terminoBusqueda = `%${termino.toLowerCase()}%`;

    const queryEmails = `
      SELECT * FROM emails_sincronizados 
      WHERE cuenta_gmail_id = $1 
      AND (
        LOWER(asunto) LIKE $2 OR 
        LOWER(remitente_email) LIKE $2 OR 
        LOWER(remitente_nombre) LIKE $2
      )
      ORDER BY fecha_recibido DESC 
      LIMIT $3 OFFSET $4
    `;

    const queryTotal = `
      SELECT COUNT(*) as total FROM emails_sincronizados 
      WHERE cuenta_gmail_id = $1 
      AND (
        LOWER(asunto) LIKE $2 OR 
        LOWER(remitente_email) LIKE $2 OR 
        LOWER(remitente_nombre) LIKE $2
      )
    `;

    const [emailsResult, totalResult] = await Promise.all([
      this.query<EmailSincronizado>(queryEmails, [cuentaGmailId, terminoBusqueda, limit, offset]),
      this.query<{ total: string }>(queryTotal, [cuentaGmailId, terminoBusqueda])
    ]);

    return {
      emails: emailsResult.rows,
      total: parseInt(totalResult.rows[0].total)
    };
  }



  // ================================
  // 📊 ESTADÍSTICAS
  // ================================

  async obtenerEstadisticasUsuario(usuarioId: string): Promise<EstadisticasUsuario> {
    const query = `
      SELECT 
        COUNT(DISTINCT cga.id) as total_cuentas_gmail,
        COUNT(DISTINCT CASE WHEN cga.esta_activa THEN cga.id END) as cuentas_gmail_activas,
        COUNT(es.id) as total_emails_sincronizados,
        COUNT(CASE WHEN es.esta_leido = FALSE THEN 1 END) as emails_no_leidos,
        MAX(cga.ultima_sincronizacion) as ultima_sincronizacion
      FROM usuarios_principales up
      LEFT JOIN cuentas_gmail_asociadas cga ON up.id = cga.usuario_principal_id
      LEFT JOIN emails_sincronizados es ON cga.id = es.cuenta_gmail_id
      WHERE up.id = $1
      GROUP BY up.id
    `;

    const result = await this.query<{ total_cuentas_gmail: string; cuentas_gmail_activas: string; total_emails_sincronizados: string; emails_no_leidos: string; ultima_sincronizacion: string }>(query, [usuarioId]);
    const stats = result.rows[0];

    // Obtener cuenta más activa
    const queryCuentaMasActiva = `
      SELECT cga.email_gmail, COUNT(es.id) as emails_count
      FROM cuentas_gmail_asociadas cga
      LEFT JOIN emails_sincronizados es ON cga.id = es.cuenta_gmail_id
      WHERE cga.usuario_principal_id = $1 AND cga.esta_activa = TRUE
      GROUP BY cga.id, cga.email_gmail
      ORDER BY emails_count DESC
      LIMIT 1
    `;

    const cuentaActivaResult = await this.query<{ email_gmail: string; emails_count: string }>(queryCuentaMasActiva, [usuarioId]);

   return {
  total_cuentas_gmail: parseInt(stats?.total_cuentas_gmail || '0'),
  cuentas_gmail_activas: parseInt(stats?.cuentas_gmail_activas || '0'),
  total_emails_sincronizados: parseInt(stats?.total_emails_sincronizados || '0'),
  emails_no_leidos: parseInt(stats?.emails_no_leidos || '0'),
  // 🆕 CAMPOS DE EVENTOS CON VALORES POR DEFECTO
  total_eventos_sincronizados: 0,
  eventos_proximos: 0,
  eventos_pasados: 0,
  ultima_sincronizacion: stats?.ultima_sincronizacion ? new Date(stats.ultima_sincronizacion) : new Date(0),
  cuenta_mas_activa: {
    email_gmail: cuentaActivaResult.rows[0]?.email_gmail || '',
    emails_count: parseInt(cuentaActivaResult.rows[0]?.emails_count || '0')
  }
};
  }

  // ================================
  // 🔧 HEALTH CHECK
  // ================================

  async healthCheck(): Promise<{ connected: boolean; query_time_ms: number }> {
    try {
      const start = Date.now();
      await this.query('SELECT 1 as health');
      const query_time_ms = Date.now() - start;
      
      return { connected: true, query_time_ms };
    } catch (error) {
      this.logger.error('❌ Database health check failed:', error);
      return { connected: false, query_time_ms: 0 };
    }
  }

  async obtenerEstadisticasGenerales() {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM usuarios_principales WHERE estado = 'activo') as usuarios_activos,
        (SELECT COUNT(*) FROM cuentas_gmail_asociadas WHERE esta_activa = TRUE) as cuentas_gmail_conectadas,
        (SELECT COUNT(*) FROM sesiones_jwt WHERE esta_activa = TRUE AND expira_en > NOW()) as sesiones_activas
    `;

    const result = await this.query<{
      usuarios_activos: string;
      cuentas_gmail_conectadas: string;
      sesiones_activas: string;
    }>(query);

    const stats = result.rows[0];
    return {
      usuarios_activos: parseInt(stats.usuarios_activos),
      cuentas_gmail_conectadas: parseInt(stats.cuentas_gmail_conectadas),
      sesiones_activas: parseInt(stats.sesiones_activas)
    };
  }

  
/**
 * 🔄 Actualizar alias personalizado de cuenta Gmail
 */
async actualizarAliasCuentaGmail(
  cuentaId: string,
  usuarioId: string,
  nuevoAlias: string
): Promise<CuentaGmailAsociada | null> {
  try {
    this.logger.debug(`🔄 Actualizando alias cuenta ${cuentaId} para usuario ${usuarioId} -> "${nuevoAlias}"`);

    // ✅ QUERY SIMPLIFICADO - sin ultima_actualizacion
    const query = `
      UPDATE cuentas_gmail_asociadas 
      SET alias_personalizado = $1
      WHERE id = $2 AND usuario_principal_id = $3
      RETURNING *
    `;

    const result = await this.query(query, [nuevoAlias, cuentaId, usuarioId]);

    if (result.rows.length === 0) {
      this.logger.warn(`⚠️ Cuenta Gmail ${cuentaId} no encontrada para usuario ${usuarioId}`);
      return null;
    }

    const cuenta = result.rows[0];
    this.logger.debug(`✅ Alias actualizado: ${cuentaId} -> "${nuevoAlias}"`);

    return {
      id: cuenta.id,
      email_gmail: cuenta.email_gmail,
      nombre_cuenta: cuenta.nombre_cuenta,
      alias_personalizado: cuenta.alias_personalizado,
      fecha_conexion: cuenta.fecha_conexion,
      ultima_sincronizacion: cuenta.ultima_sincronizacion,
      esta_activa: cuenta.esta_activa,
      usuario_principal_id: cuenta.usuario_principal_id
    } as CuentaGmailAsociada;

  } catch (error) {
    this.logger.error(`❌ Error actualizando alias cuenta Gmail:`, error);
    throw error;
  }
}
}