// ms-yourdashboard-auth/src/auth/auth.service.ts
import { Injectable, ConflictException, UnauthorizedException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcrypt';
import { sign } from 'jsonwebtoken';
import {
  UsuarioPrincipal,
  RespuestaLogin,
  RespuestaRegistro,
  RespuestaPerfil,
  RespuestaConexionGmail,
  GoogleOAuthUser,
  JwtPayload,
  CodigosErrorAuth,
} from './interfaces/auth.interfaces';
import axios from 'axios';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService
  ) {}

  // ================================
  // 📝 REGISTRO DE USUARIO PRINCIPAL
  // ================================

  async registrarUsuario(email: string, password: string, nombre: string): Promise<RespuestaRegistro>  {
    try {
      this.logger.log(`🔵 Registrando usuario: ${email}`);

      // 1️⃣ Verificar si el email ya existe
      const usuarioExistente = await this.databaseService.buscarUsuarioPorEmail(email);
      if (usuarioExistente) {
        this.logger.warn(`🚫 Email ya registrado: ${email}`);
        throw new ConflictException({
          codigo: CodigosErrorAuth.EMAIL_YA_EXISTE,
          mensaje: 'El email ya está registrado'
        });
      }

      // 2️⃣ Hashear password
      const saltRounds = parseInt(this.configService.get<string>('BCRYPT_ROUNDS') || '10');
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // 3️⃣ Crear usuario principal en BD
      const nuevoUsuario = await this.databaseService.crearUsuarioPrincipal({
        email: email,
        nombre: nombre,
        password: password, // No se usa, solo para interface
        password_hash: passwordHash
      });

      // 4️⃣ Generar JWT
      const token = this.generarJWT(nuevoUsuario);

      // 5️⃣ Crear sesión JWT
      const sesion = await this.databaseService.crearSesion({
        usuario_principal_id: nuevoUsuario.id,
        jwt_token: token
      });

      this.logger.log(`✅ Usuario registrado exitosamente: ${nuevoUsuario.email}`);

      return {
        success: true,
        message: 'Usuario registrado exitosamente',
        usuario: {
          id: nuevoUsuario.id,
          email: nuevoUsuario.email,
          nombre: nuevoUsuario.nombre,
          fecha_registro: nuevoUsuario.fecha_registro,
          estado: nuevoUsuario.estado,
          email_verificado: nuevoUsuario.email_verificado
        },
        token,
        sesion_id: sesion.id
      };

    } catch (error) {
      console.log(error);
      this.logger.error(`❌ Error registrando usuario:`, error);
      
      if (error instanceof ConflictException) {
        throw error;
      }
      
      throw new ConflictException({
        codigo: CodigosErrorAuth.EMAIL_YA_EXISTE,
        mensaje: 'Error interno al registrar usuario'
      });
    }
  }

  // ================================
  // 🔑 LOGIN DE USUARIO PRINCIPAL
  // ================================

  async loginUsuario(email: string, password: string): Promise<RespuestaLogin>{
    try {
      this.logger.log(`🔵 Intento de login: ${email}`);

      // 1️⃣ Buscar usuario por email
      const usuario = await this.databaseService.buscarUsuarioPorEmail(email);
      if (!usuario) {
        this.logger.warn(`🚫 Usuario no encontrado: ${email}`);
        throw new UnauthorizedException({
          codigo: CodigosErrorAuth.CREDENCIALES_INVALIDAS,
          mensaje: 'Credenciales inválidas'
        });
      }

      // 2️⃣ Verificar estado del usuario
      if (usuario.estado !== 'activo') {
        this.logger.warn(`🚫 Usuario inactivo: ${email} - Estado: ${usuario.estado}`);
        throw new UnauthorizedException({
          codigo: CodigosErrorAuth.USUARIO_NO_ENCONTRADO,
          mensaje: 'Usuario inactivo'
        });
      }

      // 3️⃣ Verificar password
      if (!usuario.password_hash) {
        this.logger.warn(`🚫 Usuario sin password hash: ${email}`);
        throw new UnauthorizedException({
          codigo: CodigosErrorAuth.CREDENCIALES_INVALIDAS,
          mensaje: 'Credenciales inválidas'
        });
      }

      const passwordValido = await bcrypt.compare(password, usuario.password_hash);
      if (!passwordValido) {
        this.logger.warn(`🚫 Password inválido para: ${email}`);
        throw new UnauthorizedException({
          codigo: CodigosErrorAuth.CREDENCIALES_INVALIDAS,
          mensaje: 'Credenciales inválidas'
        });
      }

      // 4️⃣ Generar JWT
      const token = this.generarJWT(usuario);

      // 5️⃣ Crear nueva sesión
      const sesion = await this.databaseService.crearSesion({
        usuario_principal_id: usuario.id,
        jwt_token: token
      });

      // 6️⃣ Actualizar última actividad
      await this.databaseService.actualizarUltimaActividad(usuario.id);

      this.logger.log(`✅ Login exitoso: ${usuario.email}`);

      return {
        success: true,
        message: 'Login exitoso',
        usuario: {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.nombre,
          fecha_registro: usuario.fecha_registro,
          estado: usuario.estado,
          email_verificado: usuario.email_verificado
        },
        token,
        sesion_id: sesion.id
      };

    } catch (error) {
      console.log(error);
      this.logger.error(`❌ Error en login:`, error);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new UnauthorizedException({
        codigo: CodigosErrorAuth.CREDENCIALES_INVALIDAS,
        mensaje: 'Error interno en autenticación'
      });
    }
  }

  // ================================
  // 👤 OBTENER PERFIL COMPLETO
  // ================================

  async obtenerPerfil(usuarioId: number): Promise<RespuestaPerfil> {
    try {
      this.logger.log(`🔵 Obteniendo perfil para usuario ${usuarioId}`);

      // 1️⃣ Obtener datos del usuario principal
      const usuario = await this.databaseService.buscarUsuarioPorId(usuarioId);
      if (!usuario) {
        throw new NotFoundException({
          codigo: CodigosErrorAuth.USUARIO_NO_ENCONTRADO,
          mensaje: 'Usuario no encontrado'
        });
      }

      // 2️⃣ Obtener cuentas Gmail asociadas
      const cuentasGmail = await this.databaseService.obtenerCuentasGmailUsuario(usuarioId);

      // 3️⃣ Obtener estadísticas del usuario
      const estadisticas = await this.databaseService.obtenerEstadisticasUsuario(usuarioId);

      // 🆕 4️⃣ Obtener estadísticas de eventos
      const eventStats = await this.obtenerEstadisticasEventos(usuarioId);  

      // 4️⃣ Obtener sesiones activas (simplificado por ahora)
      const sesionesActivas = []; // Implementar obtener sesiones activas

      this.logger.log(`✅ Perfil obtenido para usuario ${usuarioId}`);

      return {
        success: true,
        usuario: {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.nombre,
          fecha_registro: usuario.fecha_registro,
          estado: usuario.estado,
          email_verificado: usuario.email_verificado
        },
        cuentas_gmail: cuentasGmail.map(cuenta => ({
          ...cuenta,
          ultima_sincronizacion: cuenta.ultima_sincronizacion
        })),
        sesiones_activas: sesionesActivas,
        estadisticas: {
          ...estadisticas,
          total_eventos_sincronizados: eventStats.total_eventos_sincronizados,
          eventos_proximos: eventStats.eventos_proximos,
          eventos_pasados: eventStats.eventos_pasados,
          ultima_sincronizacion: estadisticas.ultima_sincronizacion
        }
      };

    } catch (error) {
      console.log(error);
      this.logger.error(`❌ Error obteniendo perfil:`, error);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new NotFoundException({
        codigo: CodigosErrorAuth.USUARIO_NO_ENCONTRADO,
        mensaje: 'Error obteniendo perfil de usuario'
      });
    }
  }

  /**
 * 📧 Obtener cuenta Gmail específica por ID
 */
async obtenerCuentaGmailPorId(usuarioId: number, cuentaId: number) {
  const cuenta = await this.databaseService.obtenerCuentaGmailPorId(cuentaId, usuarioId);
  
  if (!cuenta) {
    throw new NotFoundException({
      codigo: CodigosErrorAuth.CUENTA_GMAIL_NO_ENCONTRADA,
      mensaje: 'Cuenta Gmail no encontrada'
    });
  }
  
  // Convertir Date → string para el DTO
  return {
    id: cuenta.id,
    email_gmail: cuenta.email_gmail,
    nombre_cuenta: cuenta.nombre_cuenta,
    alias_personalizado: cuenta.alias_personalizado,
    fecha_conexion: cuenta.fecha_conexion.toISOString(),
    ultima_sincronizacion: cuenta.ultima_sincronizacion?.toISOString(),
    esta_activa: cuenta.esta_activa,
    emails_count: 0 // El orchestrator lo llenará con el count real
  };
}


/**
   * 🔧 GENERAR URL OAUTH CON STATE CODIFICADO (userId:service)
   */
  generarUrlOAuth(userId: number, service: 'gmail' | 'calendar' = 'gmail'): string {
    try {
      console.log(`🔵 Generando URL OAuth para usuario ${userId}, servicio: ${service}`);
      
      const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
      const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
      const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI') || 'http://localhost:3001/auth/google/callback';
      
      // 🎯 SCOPES SEGÚN EL SERVICIO
      const scopes = this.getScopesForService(service);
      
      const params = new URLSearchParams({
        client_id: clientId || '',
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scopes.join(' '),
        access_type: 'offline',
        prompt: 'consent',
        state: `${userId}:${service}` // 🎯 CODIFICAR USER ID + SERVICE
      });

      const authUrl = `${baseUrl}?${params.toString()}`;
      console.log(`✅ URL OAuth generada para usuario ${userId}, servicio: ${service}`);
      
      return authUrl;
      
    } catch (error) {
      console.log(error);
      this.logger.error(`❌ Error generando URL OAuth:`, error);
      throw new Error('Error generando URL de autenticación Google');
    }
  }

  // ================================
  // 🔐 MANEJAR CALLBACK DE GOOGLE OAUTH
  // ================================

 async manejarCallbackGoogle(googleUser: GoogleOAuthUser, usuarioActualId: number): Promise<RespuestaConexionGmail> {
    try {
      this.logger.log(`🔵 Procesando callback Google para: ${googleUser.email}`);
      this.logger.log(`🎯 Usuario principal ID: ${usuarioActualId}`);

      // ✅ AHORA SÍ TENEMOS EL USER ID
      if (!usuarioActualId) {
        throw new UnauthorizedException({
          codigo: CodigosErrorAuth.PERMISOS_INSUFICIENTES,
          mensaje: 'Usuario debe estar autenticado para conectar cuenta Gmail'
        });
      }

      // Verificar que el usuario principal existe
      const usuarioPrincipal = await this.databaseService.buscarUsuarioPorId(usuarioActualId);
      if (!usuarioPrincipal) {
        throw new NotFoundException({
          codigo: CodigosErrorAuth.USUARIO_NO_ENCONTRADO,
          mensaje: 'Usuario principal no encontrado'
        });
      }

      // ✅ CONECTAR CUENTA GMAIL AL USUARIO PRINCIPAL
      const cuentaGmail = await this.databaseService.conectarCuentaGmail({
        usuario_principal_id: usuarioActualId,
        google_id: googleUser.googleId,
        email: googleUser.email,
        nombre: googleUser.name,
        access_token: googleUser.accessToken,
        refresh_token: googleUser.refreshToken
      });

      // 🎯 AQUÍ SE PODRÍA TRIGGEAR SINCRONIZACIÓN INICIAL DE EMAILS
      // 🔄 SINCRONIZACIÓN INICIAL DE EMAILS
let emailsSincronizados = 0;
try {
  this.logger.log(`🔄 Iniciando sincronización automática para cuenta ${cuentaGmail.id}`);
  
  // Llamamos directamente al MS-Email porque ya tenemos el token
  const syncResponse = await axios.post(
    'http://localhost:3002/emails/sync',
    null, // No body needed
    {
      params: {
        cuentaGmailId: cuentaGmail.id.toString(),
        maxEmails: 100 // Solo 100 para que sea rápido
      },
      headers: {
        'Authorization': `Bearer ${googleUser.accessToken}`
      },
      timeout: 30000 // 30 segundos máximo
    }
  );

  // Extraer cuántos emails se sincronizaron
  emailsSincronizados = syncResponse.data?.stats?.emails_nuevos || 0;
  
  this.logger.log(`✅ Sincronización inicial completada: ${emailsSincronizados} emails`);
  
} catch (syncError: any) {
  // NO lanzamos error - la sincronización es "nice to have"
  this.logger.warn(`⚠️ Sync inicial falló (continuando sin sync): ${syncError.message}`);
  
  // Si es error de timeout, loguear específicamente
  if (syncError.code === 'ECONNABORTED') {
    this.logger.warn('⏱️ Timeout en sincronización inicial - el usuario puede sincronizar manualmente');
  }
}
      

      this.logger.log(`✅ Cuenta Gmail conectada: ${googleUser.email} para usuario ${usuarioActualId}`);

      return {
        success: true,
        message: 'Cuenta Gmail conectada exitosamente',
        cuenta_gmail: {
          id: cuentaGmail.id,
          email_gmail: cuentaGmail.email_gmail,
          nombre_cuenta: cuentaGmail.nombre_cuenta,
          alias_personalizado: cuentaGmail.alias_personalizado,
          fecha_conexion: cuentaGmail.fecha_conexion,
          ultima_sincronizacion: cuentaGmail.ultima_sincronizacion,
          esta_activa: cuentaGmail.esta_activa,
          emails_count: emailsSincronizados// Se calculará en sincronización
        },
        emails_sincronizados: emailsSincronizados // Retornar count real después de sincronización
      };

    } catch (error) {
      console.log(error);
      this.logger.error(`❌ Error en callback Google:`, error);
      
      // 🎯 MANEJAR ERROR ESPECÍFICO DE GMAIL YA CONECTADA
      if (error instanceof Error && error.message.includes('GMAIL_YA_CONECTADA')) {
        const emailMatch = error.message.match(/La cuenta (.+) ya está conectada/);
        const email = emailMatch ? emailMatch[1] : 'de Gmail';
        
        throw new UnauthorizedException({
          codigo: CodigosErrorAuth.CUENTA_GMAIL_YA_CONECTADA,
          mensaje: `La cuenta ${email} ya está conectada a otro usuario. Cada cuenta de Gmail solo puede estar asociada a un usuario.`
        });
      }
      
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      
      throw new UnauthorizedException({
        codigo: CodigosErrorAuth.GOOGLE_OAUTH_ERROR,
        mensaje: 'Error conectando cuenta de Google'
      });
    }
  }

  // ================================
  // 🚪 LOGOUT
  // ================================

  async logout(token: string) {
    await this.databaseService.invalidarSesion(token);
    return {
      success: true,
      mensaje: 'Sesión cerrada exitosamente',
      sesion_cerrada_id: token
    };
  }

  // ================================
  // 📧 DESCONECTAR CUENTA GMAIL
  // ================================

  async desconectarCuentaGmail(usuarioId: number, cuentaId: number) {
    // PRIMERO obtener datos de la cuenta
    const cuenta = await this.databaseService.obtenerCuentaGmailPorId(cuentaId, usuarioId);

    // Verificar si la cuenta existe
    if (!cuenta) {
      throw new NotFoundException({
        codigo: CodigosErrorAuth.USUARIO_NO_ENCONTRADO,
        mensaje: 'Cuenta Gmail no encontrada'
      });
    }
    
    // DESPUÉS desconectarla
    await this.databaseService.desconectarCuentaGmail(cuentaId, usuarioId);
    
    // RETORNAR los datos que obtuviste
    return {
      success: true,
      cuenta_desconectada: {
        id: cuenta.id,
        email_gmail: cuenta.email_gmail
      }
    };
  }

  // ================================
  // 📧 LISTAR CUENTAS GMAIL DE USUARIO 
  // ================================

  async listarCuentasGmailUsuario(usuarioId: number): Promise<Array<{
    id: number;
    email_gmail: string;
    nombre_cuenta: string;
    alias_personalizado?: string;
    fecha_conexion: string;
    esta_activa: boolean;
    emails_count: number;
  }>> {
    const cuentas = await this.databaseService.obtenerCuentasGmailUsuario(usuarioId);
    
    // 🔧 CONVERTIR Date → string
    return cuentas.map(cuenta => ({
      ...cuenta,
      fecha_conexion: cuenta.fecha_conexion.toISOString(), // Date → string
      ultima_sincronizacion: cuenta.ultima_sincronizacion?.toISOString() // Si existe
    }));
  }

  // ================================
  // 🔧 MÉTODOS AUXILIARES PRIVADOS
  // ================================

  private generarJWT(usuario: UsuarioPrincipal): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    const expiresIn = this.configService.get<string>('JWT_EXPIRATION') || '24h';

    if (!secret) {
      this.logger.error('❌ JWT_SECRET no configurado');
      throw new Error('JWT_SECRET no está configurado en las variables de entorno');
    }

    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
    };

    return sign(payload, secret, { expiresIn });
  }

  // ================================
  // 🔧 HEALTH CHECK
  // ================================

  async healthCheck() {
    try {
      const dbHealth = await this.databaseService.healthCheck();
      const estadisticasGenerales = await this.databaseService.obtenerEstadisticasGenerales();

      return {
        service: 'ms-yourdashboard-auth',
        status: dbHealth.connected ? 'OK' : 'ERROR',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbHealth,
        estadisticas: estadisticasGenerales
      };

    } catch (error) {
      
      console.log(error);
      this.logger.error('❌ Error en health check:', error);
      return {
        service: 'ms-yourdashboard-auth',
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: { connected: false, query_time_ms: 0 },
        estadisticas: {
          usuarios_activos: 0,
          cuentas_gmail_conectadas: 0,
          sesiones_activas: 0
        }
      };
    }
  }

  async obtenerEstadisticasServicio() {
    return await this.databaseService.obtenerEstadisticasGenerales();
  }

  /**
   * 🔍 BUSCAR USUARIO POR ID
   */
  async buscarUsuarioPorId(usuarioId: number): Promise<UsuarioPrincipal | null> {
    try {
      this.logger.log(`🔍 Buscando usuario por ID: ${usuarioId}`);

      const usuario = await this.databaseService.buscarUsuarioPorId(usuarioId);
      
      if (usuario) {
        this.logger.log(`✅ Usuario encontrado: ${usuario.email}`);
      } else {
        this.logger.warn(`⚠️ Usuario no encontrado: ${usuarioId}`);
      }

      return usuario;

    } catch (error) {
      console.log(error);
      this.logger.error(`❌ Error buscando usuario por ID ${usuarioId}:`, error);
      return null;
    }
  }

  
  // ================================
  // 🔧 MÉTODO PRIVADO NUEVO
  // ================================

  private getScopesForService(service: 'gmail' | 'calendar'): string[] {
  // ✅ TODOS LOS SERVICIOS = TODOS LOS SCOPES
  console.log(`🔍 Obteniendo scopes para servicio: ${service}`);
  const allScopes = [
    'email',
    'profile',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.send',
    'https://mail.google.com/',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.events.readonly',
    'https://www.googleapis.com/auth/calendar.acls'
  ];

  // 🎯 SIEMPRE RETORNAR TODOS LOS SCOPES
  return allScopes;
}

/**
 * 🆕 📅 OBTENER ESTADÍSTICAS DE EVENTOS PARA EL USUARIO
 * Suma todos los eventos de todas las cuentas Gmail del usuario
 */
private async obtenerEstadisticasEventos(usuarioId: number): Promise<{
  total_eventos_sincronizados: number;
  eventos_proximos: number;
  eventos_pasados: number;
}> {
  try {
    this.logger.log(`📊 Obteniendo estadísticas de eventos para usuario ${usuarioId}`);

    // 🎯 QUERY PARA SUMAR EVENTOS DE TODAS LAS CUENTAS DEL USUARIO
    const query = `
      SELECT 
        COUNT(*) as total_eventos_sincronizados,
        COUNT(CASE WHEN start_time >= NOW() THEN 1 END) as eventos_proximos,
        COUNT(CASE WHEN start_time < NOW() THEN 1 END) as eventos_pasados
      FROM events_sincronizados es
      INNER JOIN cuentas_gmail_asociadas cga ON es.cuenta_gmail_id = cga.id
      WHERE cga.usuario_principal_id = $1 
      AND cga.esta_activa = TRUE
    `;

    const result = await this.databaseService.query(query, [usuarioId]);
    
    if (!result.rows.length) {
      return {
        total_eventos_sincronizados: 0,
        eventos_proximos: 0,
        eventos_pasados: 0
      };
    }

    const stats = result.rows[0];
    
    const estadisticas = {
      total_eventos_sincronizados: parseInt(stats.total_eventos_sincronizados || '0'),
      eventos_proximos: parseInt(stats.eventos_proximos || '0'),
      eventos_pasados: parseInt(stats.eventos_pasados || '0')
    };

    this.logger.log(`✅ Estadísticas eventos: ${estadisticas.total_eventos_sincronizados} total, ${estadisticas.eventos_proximos} próximos`);

    return estadisticas;

  } catch (error) {
    this.logger.error(`❌ Error obteniendo estadísticas de eventos:`, error);
    // Retornar valores por defecto en caso de error
    return {
      total_eventos_sincronizados: 0,
      eventos_proximos: 0,
      eventos_pasados: 0
    };
  }
}
}