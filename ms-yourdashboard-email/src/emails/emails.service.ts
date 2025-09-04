// ms-yourdashboard-email/src/emails/emails.service.ts
import {
  Injectable,
  NotFoundException,
  Logger,
  UnauthorizedException,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { google, gmail_v1 } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import {
  DatabaseService,
  EmailSearchFilters,
} from '../database/database.service';
import { SyncService, SyncOptions } from './sync.service';
import {
  EmailListResponse,
  EmailStats,
  EmailDetail,
  EmailMetadata,
  EmailBodyData,
  GmailMessage,
  GmailHeader,
  GmailPayload,
  EmailServiceError,
} from './interfaces/email.interfaces';
import {
  TrafficLightStatus,
  TrafficLightDashboardResponse,
  TrafficLightAccountStats,
  EmailsByTrafficLightResponse,
  UpdateTrafficLightsResponse,
  EmailMetadataDBWithTrafficLight,
  ReplyEmailResponse,
  DeleteEmailResponse,
} from './interfaces/traffic-light.interfaces';
import { EmailAttachmentDto, EmailPriority, SendEmailDto } from './dto/send-email.dto';
import { 
  EmailHeaders, 
  EmailMessage, 
  GmailSendRequest, 
  GmailSendResponse, 
  SendEmailError, 
  SendEmailQuotaCheck, 
  SendEmailResponse 
} from './interfaces/email.interfaces-send';

@Injectable()
export class EmailsService {
  private USE_DATABASE: boolean; // 🎮 Switch mágico desde variable de entorno(si no la encuentra usara DB)
  private readonly logger = new Logger(EmailsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly syncService: SyncService,
  ) {
    // Debug para ver qué lee
    const modeFromEnv = this.configService.get<string>('USE_DATABASE_MODE');
    console.log('🔍 USE_DATABASE_MODE desde .env:', modeFromEnv);
    console.log('🔍 Tipo de dato:', typeof modeFromEnv);

    this.USE_DATABASE = modeFromEnv === 'true';
    this.logger.log(
      `🎮 Modo de emails inicializado: ${this.USE_DATABASE ? 'DATABASE' : 'API'}`,
    );
  }

  // ================================
  // 🔄 SINCRONIZACIÓN - MÉTODOS ACTUALIZADOS
  // ================================

  /**
   * 🔄 Endpoint para sincronizar emails manualmente - ACTUALIZADO
   */
  async syncEmailsWithToken(
    accessToken: string,
    cuentaGmailId: string, // 🎯 Cambio: cuentaGmailId en lugar de userId
    options: SyncOptions = {},
  ) {
    try {
      this.logger.log(
        `🔄 🎉 INICIANDO SINCRONIZACIÓN para cuenta Gmail ${cuentaGmailId}`,
      );

      const cuentaGmailIdNum = parseInt(cuentaGmailId);

      if (isNaN(cuentaGmailIdNum)) {
        throw new Error('cuentaGmailId debe ser un número válido');
      }

      const syncStats = await this.syncService.syncEmailsFromGmail(
        accessToken,
        cuentaGmailIdNum,
        options,
      );

      this.logger.log(
        `✅ Sincronización completada: ${syncStats.emails_nuevos} nuevos, ${syncStats.emails_actualizados} actualizados`,
      );

      return {
        success: true,
        message: 'Sincronización completada exitosamente',
        stats: syncStats,
      };
    } catch (error) {
      this.logger.error(`❌ Error en sincronización:`, error);
      const emailError = error as EmailServiceError;
      throw new Error('Error sincronizando emails: ' + emailError.message);
    }
  }

  // ================================
  // 📧 INBOX - MÉTODO HÍBRIDO MEJORADO - GMAIL-LIKE
  // ================================

  /**
   * 📧 INBOX HÍBRIDO MEJORADO - Gmail API primero, BD como fallback
   * 🎯 CAMBIO PRINCIPAL: Siempre intenta Gmail API primero
   */
  async getInboxWithToken(
    accessToken: string,
    cuentaGmailId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<EmailListResponse> {
    try {
      this.logger.log(
        `📧 🎯 INBOX para cuenta Gmail ${cuentaGmailId} - Página ${page}`,
      );

      const cuentaGmailIdNum = parseInt(cuentaGmailId);

      if (isNaN(cuentaGmailIdNum)) {
        throw new Error('cuentaGmailId debe ser un número válido');
      }

      // 🎮 DECISIÓN BASADA EN USE_DATABASE
      if (this.USE_DATABASE) {
        this.logger.log(`💾 MODO BD ACTIVO - Consultando base de datos local`);

        // Intentar obtener desde BD
        const dbResult = await this.databaseService.getEmailsPaginated(
          cuentaGmailIdNum,
          page,
          limit,
        );

        if (dbResult.total > 0) {
          this.logger.log(
            `✅ Inbox obtenido desde BD: ${dbResult.emails.length} emails`,
          );

          const emails = dbResult.emails.map(this.convertDBToEmailMetadata);
          const totalPages = Math.ceil(dbResult.total / limit);

          return {
            emails,
            total: dbResult.total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          };
        } else {
          this.logger.log(`📭 BD vacía para cuenta ${cuentaGmailId}`);
          return {
            emails: [],
            total: 0,
            page,
            limit,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          };
        }
      } else {
        // 🌐 MODO API - Usar Gmail API
        this.logger.log(`🌐 MODO API ACTIVO - Consultando Gmail API`);

        try {
          const gmailResult = await this.getInboxFromGmailAPI(
            accessToken,
            cuentaGmailId,
            page,
            limit,
          );

          // Iniciar sync en background si es necesario
          this.checkAndStartBackgroundSync(accessToken, cuentaGmailIdNum).catch(
            (err) => {
              this.logger.debug(`Background sync error (ignorado):`, err);
            },
          );

          this.logger.log(
            `✅ Inbox obtenido desde Gmail API: ${gmailResult.emails.length} emails`,
          );
          return gmailResult;
        } catch (apiError) {
          this.logger.error(`❌ Error en Gmail API:`, apiError);

          // Si falla API y tenemos BD, usar como fallback
          this.logger.warn(`⚠️ Gmail API falló, intentando BD como fallback`);

          const dbResult = await this.databaseService.getEmailsPaginated(
            cuentaGmailIdNum,
            page,
            limit,
          );

          if (dbResult.total > 0) {
            this.logger.log(
              `💾 FALLBACK exitoso: ${dbResult.emails.length} emails desde BD`,
            );

            const emails = dbResult.emails.map(this.convertDBToEmailMetadata);
            const totalPages = Math.ceil(dbResult.total / limit);

            return {
              emails,
              total: dbResult.total,
              page,
              limit,
              totalPages,
              hasNextPage: page < totalPages,
              hasPreviousPage: page > 1,
            };
          }

          throw apiError; // Si tampoco hay BD, lanzar error original
        }
      }
    } catch (error) {
      this.logger.error('❌ Error obteniendo inbox:', error);
      const emailError = error as EmailServiceError;
      throw new Error('Error al consultar emails: ' + emailError.message);
    }
  }

  /**
   * 🔄 Verificar y comenzar sincronización en background
   * NO BLOQUEA - Se ejecuta en background
   */
  private async checkAndStartBackgroundSync(
    accessToken: string,
    cuentaGmailId: number,
  ): Promise<void> {
    try {
      // Verificar si ya hay emails sincronizados
      const lastSync =
        await this.databaseService.getLastSyncedEmail(cuentaGmailId);

      if (!lastSync) {
        this.logger.log(
          `🔄 Cuenta nueva detectada, iniciando sync background para cuenta ${cuentaGmailId}`,
        );

        // Sincronización progresiva en background
        // NO usar await aquí para no bloquear
        this.performProgressiveBackgroundSync(accessToken, cuentaGmailId);
      } else {
        // Verificar si necesita actualización (más de 1 hora desde último sync)
        const unaHoraAtras = new Date(Date.now() - 60 * 60 * 1000);

        if (
          lastSync.fecha_sincronizado &&
          lastSync.fecha_sincronizado < unaHoraAtras
        ) {
          this.logger.log(
            `🔄 Sync desactualizado, iniciando sync incremental background`,
          );

          // Sync incremental en background
          this.syncService
            .syncIncrementalEmails(accessToken, cuentaGmailId, 50)
            .then((result) => {
              this.logger.log(
                `✅ Sync incremental completado: ${result.emails_nuevos} nuevos`,
              );
            })
            .catch((err) => {
              this.logger.error(`❌ Error en sync incremental:`, err);
            });
        }
      }
    } catch (error) {
      // No lanzar errores - es background
      this.logger.debug(`Background sync check error (ignorado):`, error);
    }
  }

  /**
   * 🔄 Sincronización progresiva en background
   * Se ejecuta en múltiples etapas para no saturar
   */
  private async performProgressiveBackgroundSync(
    accessToken: string,
    cuentaGmailId: number,
  ): Promise<void> {
    try {
      // Etapa 1: Primeros 100 emails más recientes
      await this.syncService.syncIncrementalEmails(
        accessToken,
        cuentaGmailId,
        100,
      );
      this.logger.log(
        `📧 Etapa 1 completada: 100 emails recientes sincronizados`,
      );

      // Pausa de 5 segundos
      await this.sleep(5000);

      // Etapa 2: Siguientes 200 emails
      await this.syncService.syncIncrementalEmails(
        accessToken,
        cuentaGmailId,
        200,
      );
      this.logger.log(`📧 Etapa 2 completada: 200 emails adicionales`);

      // Pausa de 10 segundos
      await this.sleep(10000);

      // Etapa 3: Siguientes 500 emails (si el usuario sigue activo)
      await this.syncService.syncIncrementalEmails(
        accessToken,
        cuentaGmailId,
        500,
      );
      this.logger.log(`📧 Etapa 3 completada: 500 emails adicionales`);

      this.logger.log(
        `✅ Sincronización progresiva completada para cuenta ${cuentaGmailId}`,
      );
    } catch (error) {
      this.logger.error(`❌ Error en sync progresivo:`, error);
      // No relanzar - es background
    }
  }

  // ================================
  // 🔍 BÚSQUEDA - HÍBRIDA MEJORADA
  // ================================

  /**
   * 🔍 BÚSQUEDA HÍBRIDA MEJORADA - Gmail API primero
   */
  async searchEmailsWithToken(
    accessToken: string,
    cuentaGmailId: string,
    searchTerm: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<EmailListResponse> {
    try {
      this.logger.log(
        `🔍 🎯 BÚSQUEDA "${searchTerm}" para cuenta Gmail ${cuentaGmailId}`,
      );

      const cuentaGmailIdNum = parseInt(cuentaGmailId);

      if (isNaN(cuentaGmailIdNum)) {
        throw new Error('cuentaGmailId debe ser un número válido');
      }

      // 🎮 DECISIÓN BASADA EN USE_DATABASE
      if (this.USE_DATABASE) {
        this.logger.log(`💾 MODO BD ACTIVO - Buscando en base de datos local`);

        const filters: EmailSearchFilters = {
          busqueda_texto: searchTerm.trim(),
        };

        const searchResult = await this.databaseService.searchEmailsInDB(
          cuentaGmailIdNum,
          filters,
          page,
          limit,
        );

        this.logger.log(
          `✅ Búsqueda BD: ${searchResult.emails.length} resultados`,
        );

        const emails = searchResult.emails.map(this.convertDBToEmailMetadata);
        const totalPages = Math.ceil(searchResult.total / limit);

        return {
          emails,
          total: searchResult.total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
          searchTerm,
        };
      } else {
        // 🌐 MODO API - Usar Gmail API
        this.logger.log(`🌐 MODO API ACTIVO - Buscando en Gmail API`);

        try {
          return await this.searchEmailsFromGmailAPI(
            accessToken,
            cuentaGmailId,
            searchTerm,
            page,
            limit,
          );
        } catch {
          this.logger.warn(`⚠️ Gmail API falló, intentando BD como fallback`);

          // Fallback a BD
          const filters: EmailSearchFilters = {
            busqueda_texto: searchTerm.trim(),
          };

          const searchResult = await this.databaseService.searchEmailsInDB(
            cuentaGmailIdNum,
            filters,
            page,
            limit,
          );

          const emails = searchResult.emails.map(this.convertDBToEmailMetadata);
          const totalPages = Math.ceil(searchResult.total / limit);

          return {
            emails,
            total: searchResult.total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            searchTerm,
          };
        }
      }
    } catch (error) {
      this.logger.error('❌ Error en búsqueda:', error);
      const emailError = error as EmailServiceError;
      throw new Error('Error al buscar en Gmail: ' + emailError.message);
    }
  }

  // ================================
  // 📊 ESTADÍSTICAS - HÍBRIDAS MEJORADAS
  // ================================

  /**
   * 📊 ESTADÍSTICAS HÍBRIDAS MEJORADAS - Gmail API primero
   */
  async getInboxStatsWithToken(
    accessToken: string,
    cuentaGmailId: string,
  ): Promise<EmailStats> {
    try {
      this.logger.log(
        `📊 🎯 ESTADÍSTICAS GMAIL-LIKE para cuenta Gmail ${cuentaGmailId}`,
      );

      const cuentaGmailIdNum = parseInt(cuentaGmailId);

      if (isNaN(cuentaGmailIdNum)) {
        throw new Error('cuentaGmailId debe ser un número válido');
      }

      // 1️⃣ ESTRATEGIA GMAIL-LIKE: Gmail API primero
      try {
        this.logger.log(`📡 Obteniendo stats desde Gmail API`);
        return await this.getStatsFromGmailAPI(accessToken, cuentaGmailId);
      } catch {
        this.logger.warn(
          `⚠️ Gmail API no disponible para stats, usando BD local`,
        );

        // 2️⃣ FALLBACK: BD local
        const dbStats =
          await this.databaseService.getEmailStatsFromDB(cuentaGmailIdNum);

        if (dbStats.total_emails > 0) {
          this.logger.log(
            `💾 FALLBACK stats desde BD: ${dbStats.total_emails} emails total`,
          );

          return {
            totalEmails: dbStats.total_emails,
            unreadEmails: dbStats.emails_no_leidos,
            readEmails: dbStats.emails_leidos,
          };
        } else {
          // Si no hay datos, retornar ceros
          return {
            totalEmails: 0,
            unreadEmails: 0,
            readEmails: 0,
          };
        }
      }
    } catch (error) {
      this.logger.error('❌ Error obteniendo estadísticas:', error);
      throw new Error('Error al obtener estadísticas de Gmail');
    }
  }

  // ================================
  // 📧 EMAIL ESPECÍFICO - SIEMPRE GMAIL API
  // ================================
  /**
   * 📧 EMAIL ESPECÍFICO - Gmail API (necesitamos el contenido completo)
   */
  async getEmailByIdWithJWT(
    jwtToken: string,
    messageId: string,
  ): Promise<EmailDetail> {
    try {
      this.logger.log(`📧 🎯 Buscando email ${messageId} con JWT token`);

      // 1️⃣ EXTRAER USER ID DEL JWT TOKEN
      const userId = this.extractUserIdFromJWT(jwtToken);

      if (!userId) {
        throw new UnauthorizedException(
          'Token JWT inválido - no se pudo extraer userId',
        );
      }

      this.logger.log(`🔍 Usuario extraído del JWT: ${userId}`);

      // 2️⃣ OBTENER TODAS LAS CUENTAS GMAIL DEL USUARIO
      const cuentasGmail =
        await this.databaseService.obtenerCuentasGmailUsuario(userId);

      if (!cuentasGmail || cuentasGmail.length === 0) {
        throw new NotFoundException(
          `Usuario ${userId} no tiene cuentas Gmail conectadas`,
        );
      }

      this.logger.log(
        `📧 Usuario ${userId} tiene ${cuentasGmail.length} cuentas Gmail`,
      );

      // 3️⃣ BUSCAR EL EMAIL EN TODAS LAS CUENTAS
      for (const cuenta of cuentasGmail) {
        try {
          this.logger.log(
            `🔍 Buscando email ${messageId} en cuenta ${cuenta.email_gmail} (ID: ${cuenta.id})`,
          );

          // Obtener token para esta cuenta específica
          const accessToken = await this.getValidTokenForAccount(cuenta.id);

          // Intentar obtener el email desde Gmail API
          const email = await this.getEmailFromGmailAPI(
            accessToken,
            cuenta.id.toString(),
            messageId,
          );

          this.logger.log(
            `✅ Email ${messageId} encontrado en cuenta ${cuenta.email_gmail}`,
          );

          // 🎯 AGREGAR INFO DE LA CUENTA AL RESULTADO
          return {
            ...email,
            sourceAccount: cuenta.email_gmail,
            sourceAccountId: cuenta.id,
          };
        } catch (error) {
          // Si no está en esta cuenta, continuar con la siguiente
          this.logger.debug(
            `📭 Email ${messageId} no encontrado en cuenta ${cuenta.email_gmail}: ${error}`,
          );
          continue;
        }
      }

      // 4️⃣ SI NO SE ENCONTRÓ EN NINGUNA CUENTA
      throw new NotFoundException(
        `Email ${messageId} no encontrado en ninguna de las ${cuentasGmail.length} cuentas Gmail del usuario`,
      );
    } catch (error) {
      this.logger.error('❌ Error obteniendo email por JWT:', error);

      if (
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new Error(
        'Error interno obteniendo email: ' + (error as Error).message,
      );
    }
  }

  /**
   * 🔧 Extraer User ID del JWT token
   */
  private extractUserIdFromJWT(authHeader: string): number | null {
    try {
      // Extraer token del header "Bearer TOKEN"
      const token = authHeader.replace('Bearer ', '');

      if (!token || token === authHeader) {
        throw new Error('Token JWT inválido - formato Bearer requerido');
      }

      // Decodificar JWT (sin verificar - solo para extraer payload)
      const payload = this.decodeJWTPayload(token);

      if (!payload?.sub) {
        throw new Error('Token JWT inválido - sub requerido');
      }

      return payload.sub;
    } catch (error) {
      this.logger.error('❌ Error extrayendo userId del JWT:', error);
      return null;
    }
  }

  /**
   * 🔧 Decodificar JWT payload (sin verificar signature)
   */
  private decodeJWTPayload(
    token: string,
  ): { sub: number; email: string; nombre: string } | null {
    try {
      // JWT format: header.payload.signature
      const parts = token.split('.');

      if (parts.length !== 3) {
        throw new Error('Token JWT malformado');
      }

      // Decodificar payload (base64)
      const payloadBase64 = parts[1];
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString(
        'utf-8',
      );
      const payload = JSON.parse(payloadJson);

      // Validar estructura
      if (!payload.sub || typeof payload.sub !== 'number') {
        throw new Error('Token JWT inválido - sub debe ser número');
      }

      return payload;
    } catch (error) {
      this.logger.error('❌ Error decodificando JWT:', error);
      return null;
    }
  }

  // ================================
  // 🌍 BÚSQUEDA GLOBAL - MÉTODO ROUTER PRINCIPAL
  // ================================

  /**
   * 🌍 BÚSQUEDA GLOBAL - MÉTODO PÚBLICO (NO CAMBIAR NOMBRE)
   * Este es el que llama el controller
   */
  async searchAllAccountsEmailsWithUserId(
    userId: string,
    searchTerm: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<EmailListResponse & { accountsSearched: string[] }> {
    // 🎮 SWITCH MÁGICO EN ACCIÓN
    if (this.USE_DATABASE) {
      this.logger.log(
        `⚡ MODO BD ACTIVO - Búsqueda instantánea en todas las cuentas`,
      );
      return this.searchAllAccountsEmailsWithUserIdFromDB(
        userId,
        searchTerm,
        page,
        limit,
      );
    } else {
      this.logger.log(
        `🌐 MODO API ACTIVO - Búsqueda en Gmail API (puede tardar)`,
      );
      return this.searchAllAccountsEmailsWithUserIdFromAPI(
        userId,
        searchTerm,
        page,
        limit,
      );
    }
  }

  /**
   * 💾 BÚSQUEDA GLOBAL - VERSIÓN BD (RÁPIDA)
   */
  private async searchAllAccountsEmailsWithUserIdFromDB(
    userId: string,
    searchTerm: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<EmailListResponse & { accountsSearched: string[] }> {
    try {
      this.logger.log(
        `🌍 💾 BÚSQUEDA GLOBAL BD "${searchTerm}" para usuario ${userId}`,
      );

      const userIdNum = parseInt(userId, 10);
      if (isNaN(userIdNum)) {
        throw new Error('userId debe ser un número válido');
      }

      // 1️⃣ OBTENER TODAS LAS CUENTAS GMAIL DEL USUARIO
      const cuentasGmail =
        await this.databaseService.obtenerCuentasGmailUsuario(userIdNum);

      if (!cuentasGmail || cuentasGmail.length === 0) {
        this.logger.warn(
          `⚠️ Usuario ${userId} no tiene cuentas Gmail conectadas`,
        );
        return {
          emails: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
          searchTerm,
          accountsSearched: [],
        };
      }

      this.logger.log(
        `📧 Usuario ${userId} tiene ${cuentasGmail.length} cuentas Gmail`,
      );

      // 2️⃣ BUSCAR EN BD EN PARALELO
      const searchPromises = cuentasGmail.map(async (cuenta) => {
        try {
          const filters: EmailSearchFilters = {
            busqueda_texto: searchTerm.trim(),
          };

          const searchResult = await this.databaseService.searchEmailsInDB(
            cuenta.id,
            filters,
            1,
            100,
          );

          const emailsConCuenta = searchResult.emails
            .map(this.convertDBToEmailMetadata)
            .map((email) => ({
              ...email,
              sourceAccount: cuenta.email_gmail,
              sourceAccountId: cuenta.id,
            }));

          this.logger.log(
            `💾 Cuenta ${cuenta.email_gmail}: ${emailsConCuenta.length} resultados`,
          );

          return {
            cuenta: cuenta.email_gmail,
            emails: emailsConCuenta,
            total: searchResult.total,
          };
        } catch (error) {
          this.logger.error(
            `❌ Error buscando en BD para cuenta ${cuenta.email_gmail}:`,
            error,
          );
          return {
            cuenta: cuenta.email_gmail,
            emails: [],
            total: 0,
          };
        }
      });

      // 3️⃣ ESPERAR TODOS LOS RESULTADOS
      const resultadosPorCuenta = await Promise.all(searchPromises);

      // 4️⃣ UNIFICAR Y ORDENAR
      const todosLosEmails = resultadosPorCuenta
        .filter((resultado) => resultado.emails.length > 0)
        .flatMap((resultado) => resultado.emails);

      todosLosEmails.sort((a, b) => {
        const fechaA = new Date(a.receivedDate).getTime();
        const fechaB = new Date(b.receivedDate).getTime();
        return fechaB - fechaA;
      });

      // 5️⃣ PAGINACIÓN
      const totalEmails = todosLosEmails.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const emailsPaginados = todosLosEmails.slice(startIndex, endIndex);

      const totalPages = Math.ceil(totalEmails / limit);
      const accountsSearched = resultadosPorCuenta.map(
        (resultado) => resultado.cuenta,
      );

      this.logger.log(
        `✅ BÚSQUEDA BD COMPLETADA: ${totalEmails} emails en ${accountsSearched.length} cuentas`,
      );

      return {
        emails: emailsPaginados,
        total: totalEmails,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        searchTerm,
        accountsSearched,
      };
    } catch (error) {
      this.logger.error('❌ Error en búsqueda global BD:', error);
      throw new Error('Error en búsqueda global: ' + (error as Error).message);
    }
  }

  /**
   * 🌐 BÚSQUEDA GLOBAL - VERSIÓN API (LENTA PERO REAL-TIME)
   */
  private async searchAllAccountsEmailsWithUserIdFromAPI(
    userId: string,
    searchTerm: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<EmailListResponse & { accountsSearched: string[] }> {
    try {
      this.logger.log(
        `🌍 🎯 BÚSQUEDA GLOBAL "${searchTerm}" para usuario principal ${userId}`,
      );

      // 🎯 VALIDAR USERID
      const userIdNum = parseInt(userId, 10);
      if (isNaN(userIdNum)) {
        throw new Error('userId debe ser un número válido');
      }

      // 1️⃣ OBTENER TODAS LAS CUENTAS GMAIL DEL USUARIO
      const cuentasGmail =
        await this.databaseService.obtenerCuentasGmailUsuario(userIdNum);

      if (!cuentasGmail || cuentasGmail.length === 0) {
        this.logger.warn(
          `⚠️ Usuario ${userId} no tiene cuentas Gmail conectadas`,
        );
        return {
          emails: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
          searchTerm,
          accountsSearched: [],
        };
      }

      this.logger.log(
        `📧 Usuario ${userId} tiene ${cuentasGmail.length} cuentas Gmail conectadas`,
      );

      // 2️⃣ BUSCAR EN PARALELO EN TODAS LAS CUENTAS
      const searchPromises = cuentasGmail.map(async (cuenta) => {
        try {
          this.logger.log(
            `🔍 Buscando en cuenta: ${cuenta.email_gmail} (ID: ${cuenta.id})`,
          );

          // 🎯 OBTENER TOKEN PARA ESTA CUENTA ESPECÍFICA
          const accessToken = await this.getValidTokenForAccount(cuenta.id);

          // 🎯 BUSCAR EN ESTA CUENTA (reutilizamos el método existente)
          const resultadoCuenta = await this.searchEmailsWithToken(
            accessToken,
            cuenta.id.toString(),
            searchTerm,
            1, // Siempre página 1 para cada cuenta
            100, // Más resultados por cuenta para unificar después
          );

          // 🎯 AGREGAR INFO DE LA CUENTA A CADA EMAIL
          const emailsConCuenta = resultadoCuenta.emails.map((email) => ({
            ...email,
            sourceAccount: cuenta.email_gmail,
            sourceAccountId: cuenta.id,
          }));

          this.logger.log(
            `✅ Cuenta ${cuenta.email_gmail}: ${emailsConCuenta.length} resultados`,
          );

          return {
            cuenta: cuenta.email_gmail,
            emails: emailsConCuenta,
            total: resultadoCuenta.total,
          };
        } catch (error) {
          this.logger.warn(
            `⚠️ Error buscando en cuenta ${cuenta.email_gmail}:`,
            error,
          );

          // 🎯 FALLBACK: Buscar en BD local para esta cuenta
          try {
            this.logger.log(
              `💾 FALLBACK BD local para cuenta ${cuenta.email_gmail}`,
            );

            const filters = {
              busqueda_texto: searchTerm.trim(),
            };

            const fallbackResult = await this.databaseService.searchEmailsInDB(
              cuenta.id,
              filters,
              1,
              100,
            );

            const emailsFromDB = fallbackResult.emails
              .map(this.convertDBToEmailMetadata)
              .map((email) => ({
                ...email,
                sourceAccount: cuenta.email_gmail,
                sourceAccountId: cuenta.id,
              }));

            this.logger.log(
              `💾 FALLBACK exitoso: ${emailsFromDB.length} resultados desde BD`,
            );

            return {
              cuenta: cuenta.email_gmail,
              emails: emailsFromDB,
              total: fallbackResult.total,
            };
          } catch (fallbackError) {
            this.logger.error(
              `❌ FALLBACK falló para cuenta ${cuenta.email_gmail}:`,
              fallbackError,
            );
            return {
              cuenta: cuenta.email_gmail,
              emails: [],
              total: 0,
            };
          }
        }
      });

      // 3️⃣ ESPERAR TODOS LOS RESULTADOS EN PARALELO
      const resultadosPorCuenta = await Promise.all(searchPromises);

      
// 4️⃣ UNIFICAR Y COMBINAR TODOS LOS EMAILS
const todosLosEmails = resultadosPorCuenta
  .filter((resultado) => resultado.emails.length > 0)
  .flatMap((resultado) => resultado.emails);

// 5️⃣ FILTRAR EMAILS CON FECHAS FUTURAS Y ORDENAR GLOBALMENTE POR FECHA
const ahora = new Date();
const emailsFiltradosYOrdenados = todosLosEmails
  .filter((email) => new Date(email.receivedDate) <= ahora)
  .sort((a, b) => {
    const fechaA = new Date(a.receivedDate).getTime();
    const fechaB = new Date(b.receivedDate).getTime();
    return fechaB - fechaA; // Descendente (más recientes primero)
  });

// 6️⃣ APLICAR PAGINACIÓN GLOBAL
const totalEmails = emailsFiltradosYOrdenados.length;
const startIndex = (page - 1) * limit;
const endIndex = startIndex + limit;
const emailsPaginados = emailsFiltradosYOrdenados.slice(startIndex, endIndex);

// 7️⃣ CALCULAR METADATOS DE PAGINACIÓN
const totalPages = Math.ceil(totalEmails / limit);
const hasNextPage = page < totalPages;
const hasPreviousPage = page > 1;

// 8️⃣ OBTENER LISTA DE CUENTAS BUSCADAS
const accountsSearched = resultadosPorCuenta.map(
  (resultado) => resultado.cuenta,
);

this.logger.log(`✅ BÚSQUEDA GLOBAL COMPLETADA:`);
this.logger.log(`   📊 Total emails encontrados: ${totalEmails}`);
this.logger.log(`   📧 Cuentas buscadas: ${accountsSearched.join(', ')}`);
this.logger.log(
  `   📄 Página ${page}/${totalPages} (${emailsPaginados.length} emails)`,
);

return {
  emails: emailsPaginados,
  total: totalEmails,
  page,
  limit,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  searchTerm,
  accountsSearched,
};
    } catch (error) {
      this.logger.error('❌ Error en búsqueda global:', error);
      const emailError = error as EmailServiceError;
      throw new Error('Error en búsqueda global: ' + emailError.message);
    }
  }

  // ================================
  // 📥 INBOX UNIFICADO - MÉTODO ROUTER PRINCIPAL
  // ================================

  /**
   * 📥 INBOX UNIFICADO - MÉTODO PÚBLICO (NO CAMBIAR NOMBRE)
   * Este es el que llama el controller
   */
  async getInboxAllAccountsWithUserId(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<EmailListResponse & { accountsLoaded: string[] }> {
    // 🎮 SWITCH MÁGICO EN ACCIÓN
    if (this.USE_DATABASE) {
      this.logger.log(
        `⚡ MODO BD ACTIVO - Inbox instantáneo desde base de datos`,
      );
      return this.getInboxAllAccountsWithUserIdFromDB(userId, page, limit);
    } else {
      this.logger.log(`🌐 MODO API ACTIVO - Inbox desde Gmail API (real-time)`);
      return this.getInboxAllAccountsWithUserIdFromAPI(userId, page, limit);
    }
  }

  /**
   * 💾 INBOX UNIFICADO - VERSIÓN BD (RÁPIDA)
   */
  private async getInboxAllAccountsWithUserIdFromDB(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<EmailListResponse & { accountsLoaded: string[] }> {
    try {
      this.logger.log(
        `📥 💾 INBOX UNIFICADO (BD) para usuario principal ${userId}`,
      );

      // 🎯 VALIDAR USERID
      const userIdNum = parseInt(userId, 10);
      if (isNaN(userIdNum)) {
        throw new Error('userId debe ser un número válido');
      }

      // 1️⃣ OBTENER TODAS LAS CUENTAS GMAIL DEL USUARIO
      const cuentasGmail =
        await this.databaseService.obtenerCuentasGmailUsuario(userIdNum);

      if (!cuentasGmail || cuentasGmail.length === 0) {
        this.logger.warn(
          `⚠️ Usuario ${userId} no tiene cuentas Gmail conectadas`,
        );
        return {
          emails: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
          accountsLoaded: [],
        };
      }

      this.logger.log(
        `📧 Usuario ${userId} tiene ${cuentasGmail.length} cuentas Gmail`,
      );

      // 2️⃣ 🚀 TOTAL DESDE BD (INSTANTÁNEO!)
      const totalRealGlobal = cuentasGmail.reduce(
        (sum, cuenta) => sum + cuenta.emails_count,
        0,
      );
      this.logger.log(
        `🔥 TOTAL DESDE BD: ${totalRealGlobal} emails de todas las cuentas`,
      );

      // 3️⃣ OBTENER EMAILS DE CADA CUENTA DESDE BD
      const inboxPromises = cuentasGmail.map(async (cuenta) => {
        try {
          this.logger.log(
            `💾 Obteniendo emails de BD para: ${cuenta.email_gmail} (ID: ${cuenta.id})`,
          );

          // 🎯 DIRECTO DESDE BD - SIN TOKEN NI API
          // 🎯 AUMENTAR LÍMITE PARA CUBRIR TODAS LAS PÁGINAS
          const emailsNeeded = page * limit * 2; // Margen de seguridad
          const maxEmailsPerAccount = Math.max(1000, emailsNeeded); // Mínimo 1000
          console.log(
            `🔍 Obteniendo hasta ${maxEmailsPerAccount} emails de cuenta ${cuenta.email_gmail}`,
          );
          const dbResult = await this.databaseService.getEmailsPaginated(
            cuenta.id,
            1, // Siempre página 1 para cada cuenta
            maxEmailsPerAccount, // Más emails por cuenta para unificar(paginacion alta)
            false, // Todos los emails
          );

          // 🎯 AGREGAR INFO DE LA CUENTA A CADA EMAIL
          const emailsConCuenta = dbResult.emails
            .map(this.convertDBToEmailMetadata)
            .map((email) => ({
              ...email,
              sourceAccount: cuenta.email_gmail,
              sourceAccountId: cuenta.id,
            }));

          this.logger.log(
            `✅ BD cuenta ${cuenta.email_gmail}: ${emailsConCuenta.length} emails obtenidos`,
          );

          return {
            cuenta: cuenta.email_gmail,
            emails: emailsConCuenta,
            total: dbResult.total,
          };
        } catch (error) {
          this.logger.error(
            `❌ Error obteniendo emails de ${cuenta.email_gmail}:`,
            error,
          );
          return {
            cuenta: cuenta.email_gmail,
            emails: [],
            total: 0,
          };
        }
      });

      // 4️⃣ ESPERAR TODOS LOS RESULTADOS EN PARALELO
      const resultadosPorCuenta = await Promise.all(inboxPromises);

      // 5️⃣ UNIFICAR Y COMBINAR TODOS LOS EMAILS
      const todosLosEmails = resultadosPorCuenta
        .filter((resultado) => resultado.emails.length > 0)
        .flatMap((resultado) => resultado.emails);

      // 6️⃣ FILTRAR EMAILS CON FECHAS FUTURAS Y ORDENAR GLOBALMENTE POR FECHA
      const ahora = new Date();
      const emailsFiltradosYOrdenados = todosLosEmails
        .filter((email) => new Date(email.receivedDate) <= ahora)
        .sort((a, b) => {
          const fechaA = new Date(a.receivedDate).getTime();
          const fechaB = new Date(b.receivedDate).getTime();
          return fechaB - fechaA; // Descendente (más recientes primero)
        });

      // 7️⃣ APLICAR PAGINACIÓN GLOBAL
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const emailsPaginados = emailsFiltradosYOrdenados.slice(
        startIndex,
        endIndex,
      );

      // 8️⃣ CALCULAR METADATOS DE PAGINACIÓN
      const totalPages = Math.ceil(totalRealGlobal / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      // 9️⃣ OBTENER LISTA DE CUENTAS CARGADAS
      const accountsLoaded = resultadosPorCuenta.map(
        (resultado) => resultado.cuenta,
      );

      this.logger.log(`✅ INBOX UNIFICADO DESDE BD COMPLETADO:`);
      this.logger.log(`   💾 Total emails (BD): ${totalRealGlobal}`);
      this.logger.log(
        `   📧 Emails filtrados y mostrados: ${emailsPaginados.length}`,
      );
      this.logger.log(`   📧 Cuentas cargadas: ${accountsLoaded.join(', ')}`);
      this.logger.log(`   📄 Página ${page}/${totalPages}`);
      this.logger.log(`   ⚡ Tiempo: INSTANTÁNEO (desde BD)`);

      return {
        emails: emailsPaginados,
        total: totalRealGlobal,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPreviousPage,
        accountsLoaded,
      };
    } catch (error) {
      this.logger.error('❌ Error en inbox unificado (BD):', error);
      const emailError = error as EmailServiceError;
      throw new Error('Error en inbox unificado: ' + emailError.message);
    }
  }

  /**
   * 🌐 INBOX UNIFICADO - VERSIÓN API (LENTA PERO REAL-TIME)
   */
  private async getInboxAllAccountsWithUserIdFromAPI(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<EmailListResponse & { accountsLoaded: string[] }> {
    try {
      this.logger.log(`📥 🎯 INBOX UNIFICADO para usuario principal ${userId}`);

      // 🎯 VALIDAR USERID
      const userIdNum = parseInt(userId, 10);
      if (isNaN(userIdNum)) {
        throw new Error('userId debe ser un número válido');
      }

      // 1️⃣ OBTENER TODAS LAS CUENTAS GMAIL DEL USUARIO
      const cuentasGmail =
        await this.databaseService.obtenerCuentasGmailUsuario(userIdNum);

      if (!cuentasGmail || cuentasGmail.length === 0) {
        this.logger.warn(
          `⚠️ Usuario ${userId} no tiene cuentas Gmail conectadas`,
        );
        return {
          emails: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
          accountsLoaded: [],
        };
      }

      this.logger.log(
        `📧 Usuario ${userId} tiene ${cuentasGmail.length} cuentas Gmail para inbox unificado`,
      );

      // 2️⃣ 🆕 OBTENER TOTAL REAL DE TODAS LAS CUENTAS EN PARALELO
      this.logger.log(`📊 Obteniendo totales reales de Gmail API...`);
      const totalRealPromises = cuentasGmail.map(async (cuenta) => {
        try {
          const accessToken = await this.getValidTokenForAccount(cuenta.id);
          const stats = await this.getStatsFromGmailAPI(
            accessToken,
            cuenta.id.toString(),
          );
          this.logger.log(
            `✅ Cuenta ${cuenta.email_gmail}: ${stats.totalEmails} emails totales`,
          );
          return stats.totalEmails;
        } catch (error) {
          this.logger.warn(
            `⚠️ No se pudo obtener total real de ${cuenta.email_gmail}:`,
            error,
          );
          return 0; // Si una cuenta falla, contribuye con 0 al total
        }
      });

      // Esperar todos los totales reales
      const totalesReales = await Promise.all(totalRealPromises);
      const totalRealGlobal = totalesReales.reduce(
        (sum, total) => sum + total,
        0,
      );

      this.logger.log(
        `🔥 TOTAL REAL GLOBAL: ${totalRealGlobal} emails de todas las cuentas`,
      );

      // 3️⃣ OBTENER INBOX DE CADA CUENTA EN PARALELO (PARA MOSTRAR)
      const inboxPromises = cuentasGmail.map(async (cuenta) => {
        try {
          this.logger.log(
            `📥 Obteniendo inbox de cuenta: ${cuenta.email_gmail} (ID: ${cuenta.id})`,
          );

          // ✅ CORREGIDO: SIEMPRE USAR API EN ESTE MÉTODO
          this.logger.log(
            `🌐 Usando Gmail API para cuenta ${cuenta.email_gmail}`,
          );

          const accessToken = await this.getValidTokenForAccount(cuenta.id);

          const inboxCuenta = await this.getInboxWithToken(
            accessToken,
            cuenta.id.toString(),
            1,
            100,
          );

          const emailsConCuenta = inboxCuenta.emails.map((email) => ({
            ...email,
            sourceAccount: cuenta.email_gmail,
            sourceAccountId: cuenta.id,
          }));

          return {
            cuenta: cuenta.email_gmail,
            emails: emailsConCuenta,
            total: inboxCuenta.total,
          };
        } catch (error) {
          this.logger.warn(
            `⚠️ Error obteniendo inbox de cuenta ${cuenta.email_gmail}:`,
            error,
          );

          // Fallback a BD si falla API
          try {
            this.logger.log(`💾 FALLBACK BD para cuenta ${cuenta.email_gmail}`);

            const fallbackResult =
              await this.databaseService.getEmailsPaginated(
                cuenta.id,
                1,
                100,
                false,
              );

            const emailsFromDB = fallbackResult.emails
              .map(this.convertDBToEmailMetadata)
              .map((email) => ({
                ...email,
                sourceAccount: cuenta.email_gmail,
                sourceAccountId: cuenta.id,
              }));

            return {
              cuenta: cuenta.email_gmail,
              emails: emailsFromDB,
              total: fallbackResult.total,
            };
          } catch (fallbackError) {
            this.logger.error(
              `❌ FALLBACK falló para cuenta ${cuenta.email_gmail}:`,
              fallbackError,
            );
          }

          return {
            cuenta: cuenta.email_gmail,
            emails: [],
            total: 0,
          };
        }
      });

      // 4️⃣ ESPERAR TODOS LOS RESULTADOS EN PARALELO
      const resultadosPorCuenta = await Promise.all(inboxPromises);

      // 5️⃣ UNIFICAR Y COMBINAR TODOS LOS EMAILS
      const todosLosEmails = resultadosPorCuenta
        .filter((resultado) => resultado.emails.length > 0)
        .flatMap((resultado) => resultado.emails);

      // 6️⃣ FILTRAR EMAILS CON FECHAS FUTURAS Y ORDENAR GLOBALMENTE POR FECHA
      const ahora = new Date();
      const emailsFiltradosYOrdenados = todosLosEmails
        .filter((email) => new Date(email.receivedDate) <= ahora)
        .sort((a, b) => {
          const fechaA = new Date(a.receivedDate).getTime();
          const fechaB = new Date(b.receivedDate).getTime();
          return fechaB - fechaA; // Descendente (más recientes primero)
        });

      // 7️⃣ APLICAR PAGINACIÓN GLOBAL
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const emailsPaginados = emailsFiltradosYOrdenados.slice(
        startIndex,
        endIndex,
      );

      // 8️⃣ CALCULAR METADATOS DE PAGINACIÓN CON TOTAL REAL
      const totalPages = Math.ceil(totalRealGlobal / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      // 9️⃣ OBTENER LISTA DE CUENTAS CARGADAS
      const accountsLoaded = resultadosPorCuenta.map(
        (resultado) => resultado.cuenta,
      );

      this.logger.log(`✅ INBOX UNIFICADO COMPLETADO:`);
      this.logger.log(`   🔥 Total REAL global: ${totalRealGlobal} emails`);
      this.logger.log(
        `   📧 Emails filtrados y mostrados: ${emailsPaginados.length} de ${emailsFiltradosYOrdenados.length} filtrados`,
      );
      this.logger.log(`   📧 Cuentas cargadas: ${accountsLoaded.join(', ')}`);
      this.logger.log(`   📄 Página ${page}/${totalPages}`);

      return {
        emails: emailsPaginados,
        total: totalRealGlobal,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPreviousPage,
        accountsLoaded,
      };
    } catch (error) {
      this.logger.error('❌ Error en inbox unificado:', error);
      const emailError = error as EmailServiceError;
      throw new Error('Error en inbox unificado: ' + emailError.message);
    }
  }

  // ================================
  // 📊 ESTADÍSTICAS UNIFICADAS - MÉTODO ROUTER
  // ================================

  /**
   * 📊 ESTADÍSTICAS UNIFICADAS - MÉTODO PÚBLICO
   * Obtiene estadísticas combinadas de todas las cuentas Gmail del usuario
   */
  async getEmailStats(userId: string): Promise<EmailStats> {
    // 🎮 SWITCH MÁGICO EN ACCIÓN
    if (this.USE_DATABASE) {
      this.logger.log(`⚡ MODO BD ACTIVO - Estadísticas instantáneas desde BD`);
      return this.getEmailStatsFromDB(userId);
    } else {
      this.logger.log(`🌐 MODO API ACTIVO - Estadísticas desde Gmail API`);
      return this.getEmailStatsFromAPI(userId);
    }
  }

  /**
   * 💾 ESTADÍSTICAS - VERSIÓN BD (RÁPIDA)
   */
  private async getEmailStatsFromDB(userId: string): Promise<EmailStats> {
    try {
      this.logger.log(`📊 💾 ESTADÍSTICAS DESDE BD para usuario ${userId}`);

      const userIdNum = parseInt(userId, 10);
      if (isNaN(userIdNum)) {
        throw new Error('userId debe ser un número válido');
      }

      // Obtener todas las cuentas del usuario
      const cuentasGmail =
        await this.databaseService.obtenerCuentasGmailUsuario(userIdNum);

      if (!cuentasGmail || cuentasGmail.length === 0) {
        return {
          totalEmails: 0,
          unreadEmails: 0,
          readEmails: 0,
        };
      }

      // Obtener estadísticas de cada cuenta desde BD
      const statsPromises = cuentasGmail.map(async (cuenta) => {
        const dbStats = await this.databaseService.getEmailStatsFromDB(
          cuenta.id,
        );
        return {
          total: dbStats.total_emails,
          unread: dbStats.emails_no_leidos,
          read: dbStats.emails_leidos,
        };
      });

      const allStats = await Promise.all(statsPromises);

      // Sumar todas las estadísticas
      const totalStats = allStats.reduce(
        (acc, stats) => ({
          totalEmails: acc.totalEmails + stats.total,
          unreadEmails: acc.unreadEmails + stats.unread,
          readEmails: acc.readEmails + stats.read,
        }),
        { totalEmails: 0, unreadEmails: 0, readEmails: 0 },
      );

      this.logger.log(
        `✅ ESTADÍSTICAS BD: ${totalStats.totalEmails} totales, ${totalStats.unreadEmails} no leídos`,
      );

      return totalStats;
    } catch (error) {
      this.logger.error('❌ Error obteniendo estadísticas desde BD:', error);
      throw new Error('Error al obtener estadísticas');
    }
  }

  /**
   * 🌐 ESTADÍSTICAS - VERSIÓN API (LENTA PERO REAL-TIME)
   */
  private async getEmailStatsFromAPI(userId: string): Promise<EmailStats> {
    try {
      this.logger.log(`📊 🌐 ESTADÍSTICAS DESDE API para usuario ${userId}`);

      const userIdNum = parseInt(userId, 10);
      if (isNaN(userIdNum)) {
        throw new Error('userId debe ser un número válido');
      }

      // Obtener todas las cuentas del usuario
      const cuentasGmail =
        await this.databaseService.obtenerCuentasGmailUsuario(userIdNum);

      if (!cuentasGmail || cuentasGmail.length === 0) {
        return {
          totalEmails: 0,
          unreadEmails: 0,
          readEmails: 0,
        };
      }

      // Obtener estadísticas de cada cuenta desde Gmail API
      const statsPromises = cuentasGmail.map(async (cuenta) => {
        try {
          const accessToken = await this.getValidTokenForAccount(cuenta.id);
          return await this.getStatsFromGmailAPI(
            accessToken,
            cuenta.id.toString(),
          );
        } catch (error) {
          this.logger.warn(
            `⚠️ Error obteniendo stats de ${cuenta.email_gmail}:`,
            error,
          );
          return { totalEmails: 0, unreadEmails: 0, readEmails: 0 };
        }
      });

      const allStats = await Promise.all(statsPromises);

      // Sumar todas las estadísticas
      const totalStats = allStats.reduce(
        (acc, stats) => ({
          totalEmails: acc.totalEmails + stats.totalEmails,
          unreadEmails: acc.unreadEmails + stats.unreadEmails,
          readEmails: acc.readEmails + stats.readEmails,
        }),
        { totalEmails: 0, unreadEmails: 0, readEmails: 0 },
      );

      this.logger.log(
        `✅ ESTADÍSTICAS API: ${totalStats.totalEmails} totales, ${totalStats.unreadEmails} no leídos`,
      );

      return totalStats;
    } catch (error) {
      this.logger.error('❌ Error obteniendo estadísticas desde API:', error);
      throw new Error('Error al obtener estadísticas');
    }
  }

  // ================================
  // 📧 EMAIL POR ID - MÉTODO ROUTER
  // ================================

  /**
   * 📧 OBTENER EMAIL POR ID - MÉTODO PÚBLICO
   */
  async getEmailById(userId: string, messageId: string): Promise<EmailDetail> {
    // 🎮 Para emails específicos, siempre necesitamos el contenido completo
    // Por eso siempre usamos API para este método
    this.logger.log(
      `📧 Obteniendo email específico ${messageId} - Siempre desde API para contenido completo`,
    );

    try {
      const userIdNum = parseInt(userId, 10);
      if (isNaN(userIdNum)) {
        throw new Error('userId debe ser un número válido');
      }

      // Buscar en qué cuenta está este email
      // Por ahora, buscaremos en todas las cuentas del usuario
      const cuentasGmail =
        await this.databaseService.obtenerCuentasGmailUsuario(userIdNum);

      if (!cuentasGmail || cuentasGmail.length === 0) {
        throw new NotFoundException(
          `Usuario ${userId} no tiene cuentas Gmail conectadas`,
        );
      }

      // Intentar en cada cuenta hasta encontrar el email
      for (const cuenta of cuentasGmail) {
        try {
          const accessToken = await this.getValidTokenForAccount(cuenta.id);
          const email = await this.getEmailFromGmailAPI(
            accessToken,
            userId,
            messageId,
          );

          // Si encontramos el email, lo retornamos
          return email;
        } catch {
          // Si no está en esta cuenta, continuar con la siguiente
          this.logger.debug(
            `Email ${messageId} no encontrado en cuenta ${cuenta.email_gmail}`,
          );
          continue;
        }
      }

      // Si no se encontró en ninguna cuenta
      throw new NotFoundException(
        `Email ${messageId} no encontrado en ninguna cuenta`,
      );
    } catch (error) {
      this.logger.error('❌ Error obteniendo email por ID:', error);
      throw error;
    }
  }

  // ================================
  // 🔧 MÉTODOS PRIVADOS - CONVERSIÓN Y FALLBACKS
  // ================================

  /**
   * 🔄 Convertir EmailMetadataDB → EmailMetadata (para compatibilidad API)
   */
  private convertDBToEmailMetadata(dbEmail: EmailMetadataDBWithTrafficLight): EmailMetadata {
    return {
      id: dbEmail.gmail_message_id,
      messageId: dbEmail.gmail_message_id,
      subject: dbEmail.asunto || 'Sin asunto',
      fromEmail: dbEmail.remitente_email || '',
      fromName: dbEmail.remitente_nombre || '',
      receivedDate: dbEmail.fecha_recibido || new Date(),
      isRead: dbEmail.esta_leido,
      hasAttachments: dbEmail.tiene_adjuntos,
      // para compatibilidad con API semaforo:
      trafficLightStatus: dbEmail.traffic_light_status || 'green',
      daysWithoutReply: dbEmail.days_without_reply || 0,
      repliedAt: dbEmail.replied_at || null
    };
  }

  /**
   * 📧 Método original de inbox (Gmail API)
   */
  private async getInboxFromGmailAPI(
    accessToken: string,
    cuentaGmailId: string,
    page: number,
    limit: number,
  ): Promise<EmailListResponse> {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const realTotalEmails = await this.getRealEmailCount(gmail, 'in:inbox');
    const emailsForPage = await this.getEmailsForPage(
      gmail,
      'in:inbox',
      page,
      limit,
    );
    const totalPages = Math.ceil(realTotalEmails / limit);

    return {
      emails: emailsForPage,
      total: realTotalEmails,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * 🔍 Método original de búsqueda (Gmail API)
   */
  private async searchEmailsFromGmailAPI(
    accessToken: string,
    cuentaGmailId: string,
    searchTerm: string,
    page: number,
    limit: number,
  ): Promise<EmailListResponse> {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const gmailQuery = `in:inbox ${searchTerm}`;
    const realTotalEmails = await this.getRealEmailCount(gmail, gmailQuery);
    const emailsForPage = await this.getEmailsForPage(
      gmail,
      gmailQuery,
      page,
      limit,
    );
    const totalPages = Math.ceil(realTotalEmails / limit);

    return {
      emails: emailsForPage,
      total: realTotalEmails,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      searchTerm,
    };
  }

  /**
   * 📊 Método original de stats (Gmail API)
   */
  private async getStatsFromGmailAPI(
    accessToken: string,
    cuentaGmailId: string,
  ): Promise<EmailStats> {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    console.log('🔍 DEBUG - Getting stats for cuenta:', cuentaGmailId);

    // 🎯 USAR getRealEmailCount EN LUGAR DE resultSizeEstimate
    const [totalEmails, unreadEmails] = await Promise.all([
      this.getRealEmailCount(gmail, 'in:inbox'),
      this.getRealEmailCount(gmail, 'in:inbox is:unread'),
    ]);

    console.log('🔍 DEBUG - Stats REALES:', {
      totalEmails,
      unreadEmails,
      cuentaGmailId,
      accessToken: accessToken ? 'presente' : 'faltante',
    });

    return {
      totalEmails,
      unreadEmails,
      readEmails: totalEmails - unreadEmails,
    };
  }

  // ================================
  // 📤 MÉTODOS PARA SEND EMAIL
  // ================================

  /**
   * 🏗️ CONSTRUIR EMAIL COMPLETO (headers + body + attachments)
   */
  private async buildEmailMessage(sendEmailData: SendEmailDto): Promise<EmailMessage> {
    try {
      // 1️⃣ GENERAR MESSAGE ID ÚNICO
      const messageId = this.generateMessageId(sendEmailData.from);
      
      // 2️⃣ CONSTRUIR HEADERS BÁSICOS
      const headers = {
        'To': this.encodeUtf8Header(sendEmailData.to.join(', ')),
        'Subject': this.encodeUtf8Header(sendEmailData.subject),
        'From': this.encodeUtf8Header(sendEmailData.from),
        'Message-ID': messageId,
        'Date': new Date().toUTCString(),
        'MIME-Version': '1.0'
      };

      // 3️⃣ AGREGAR CC Y BCC SI EXISTEN
      if (sendEmailData.cc?.length) {
        headers['Cc'] = this.encodeUtf8Header(sendEmailData.cc.join(', '));
      }
      
      if (sendEmailData.bcc?.length) {
        headers['Bcc'] = this.encodeUtf8Header(sendEmailData.bcc.join(', '));
      }

      // 4️⃣ AGREGAR HEADERS DE PRIORIDAD
      if (sendEmailData.priority && sendEmailData.priority !== EmailPriority.NORMAL) {
        const priorityHeaders = this.getPriorityHeaders(sendEmailData.priority);
        Object.assign(headers, priorityHeaders);
      }

      // 5️⃣ AGREGAR CONFIRMACIÓN DE LECTURA
      if (sendEmailData.requestReadReceipt) {
        headers['Disposition-Notification-To'] = sendEmailData.from;
      }

      // 6️⃣ AGREGAR HEADERS PARA MANTENER HILO
      if (sendEmailData.inReplyTo && this.isValidMessageId(sendEmailData.inReplyTo)) {
        headers['In-Reply-To'] = sendEmailData.inReplyTo;
      }
      
      if (sendEmailData.references?.length) {
        const validReferences = sendEmailData.references.filter(ref => this.isValidMessageId(ref));
        if (validReferences.length > 0) {
          headers['References'] = validReferences.join(' ');
        }
      }

      // 7️⃣ CONSTRUIR CUERPO DEL EMAIL
      const emailBody = await this.buildEmailBody(sendEmailData, sendEmailData.attachments);

     // 8️⃣ DETERMINAR CONTENT-TYPE HEADER
if (sendEmailData.attachments?.length) {
  // NO generar boundary aquí - lo hace buildEmailBody
  headers['Content-Type'] = 'multipart/mixed; boundary="PLACEHOLDER"';
  
  const emailBodyWithBoundary = await this.buildEmailBody(sendEmailData, sendEmailData.attachments);
  
  // Extraer el boundary que se usó en buildEmailBody
  const boundaryMatch = emailBodyWithBoundary.match(/--([^-\r\n]+)/);
  const actualBoundary = boundaryMatch ? boundaryMatch[1] : this.generateBoundary();
  
  headers['Content-Type'] = `multipart/mixed; boundary="${actualBoundary}"`;
  
  return {
    headers: headers as Record<string, string>,
    body: emailBodyWithBoundary,
    attachments: sendEmailData.attachments,
    messageId
  };
      } else {
        headers['Content-Type'] = 'text/plain; charset=UTF-8';
        
        return {
          headers: headers as Record<string, string>,
          body: emailBody,
          messageId
        };
      }

    } catch (error) {
      this.logger.error('❌ Error construyendo email:', error);
      throw new Error(`Error construyendo email: ${error.message}`);
    }
  }

  /**
   * 📤 ENVIAR EMAIL VIA GMAIL API
   */
  private async sendNewEmailViaGmailAPI(
    accessToken: string, 
    emailMessage: EmailMessage,
    threadId?: string
  ): Promise<GmailSendResponse> {
    try {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const fullEmail = this.combineHeadersAndBody(emailMessage);

      const encodedMessage = Buffer.from(fullEmail)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const gmailRequest: GmailSendRequest = {
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      };

      if (threadId) {
        gmailRequest.requestBody.threadId = threadId;
      }

      const response = await gmail.users.messages.send(gmailRequest);

      if (!response.data.id) {
        throw new Error('Gmail API no retornó ID del mensaje enviado');
      }

      return {
        id: response.data.id,
        threadId: response.data.threadId || response.data.id,
        labelIds: response.data.labelIds || undefined,
        snippet: response.data.snippet || undefined,
        sizeEstimate: response.data.sizeEstimate || undefined,
        historyId: response.data.historyId || undefined,
        internalDate: response.data.internalDate || undefined
      };

    } catch (error) {
      this.logger.error('❌ Error en Gmail API send:', error);
      throw error;
    }
  }
  

  /**
   * 🔗 COMBINAR HEADERS Y BODY EN EMAIL COMPLETO
   */
  private combineHeadersAndBody(emailMessage: EmailMessage): string {
    try {
      const headerLines = Object.entries(emailMessage.headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\r\n');

      return headerLines + '\r\n\r\n' + emailMessage.body;

    } catch (error) {
      this.logger.error('❌ Error combinando headers y body:', error);
      throw new Error(`Error combinando email: ${error.message}`);
    }
  }


  /**
   * 📤 ENVIAR EMAIL NUEVO CON JWT - MÉTODO PRINCIPAL
   */
 async sendEmailWithJWT(
  jwtToken: string,
  sendEmailData: SendEmailDto
): Promise<SendEmailResponse> {
  try {
    this.logger.log(`Iniciando envío de email desde ${sendEmailData.from}`);
    
    // 1️⃣ EXTRAER USER ID DEL JWT TOKEN
    const userId = this.extractUserIdFromJWT(jwtToken);
    
    if (!userId) {
      throw new UnauthorizedException('Token JWT inválido - no se pudo extraer userId');
    }

    // 2️⃣ VALIDAR QUE LA CUENTA FROM PERTENEZCA AL USUARIO
    const cuentasUsuario = await this.databaseService.obtenerCuentasGmailUsuario(userId);
    const cuentaGmail = cuentasUsuario.find(cuenta => cuenta.email_gmail === sendEmailData.from);
    
    if (!cuentaGmail) {
      throw new NotFoundException(
        `La cuenta ${sendEmailData.from} no está asociada al usuario ${userId}`
      );
    }

    // 3️⃣ OBTENER TOKEN DE ACCESO VÁLIDO
    const accessToken = await this.getValidTokenForAccount(cuentaGmail.id);
    
    if (!accessToken) {
      throw new UnauthorizedException('No se pudo obtener token de acceso válido para Gmail');
    }

    // 4️⃣ VALIDACIONES BÁSICAS
    if (!sendEmailData.subject?.trim()) {
      throw new BadRequestException('Asunto del email es requerido');
    }

    if (!sendEmailData.body?.trim()) {
      throw new BadRequestException('Contenido del email es requerido');
    }

    // 5️⃣ POR AHORA: RECHAZAR ATTACHMENTS (implementar después)
   if ((sendEmailData.attachments?.length ?? 0) > 5) {
  throw new BadRequestException('Máximo 5 attachments permitidos por email');
}


    // 6️⃣ ENVIAR EMAIL USANDO LÓGICA SIMPLE
    const sentMessageId = await this.sendEmailSimpleAndWorking(
      accessToken,
      sendEmailData
    );

    // 7️⃣ RESPUESTA EXITOSA
    const response: SendEmailResponse = {
      success: true,
      messageId: sentMessageId,
      threadId: sentMessageId,
      sentAt: new Date().toISOString(),
      fromEmail: sendEmailData.from,
      toEmails: sendEmailData.to,
      ccEmails: sendEmailData.cc,
      bccEmails: sendEmailData.bcc,
      subject: sendEmailData.subject,
      priority: sendEmailData.priority || EmailPriority.NORMAL,
      hasAttachments: !!(sendEmailData.attachments?.length),
      attachmentCount: sendEmailData.attachments?.length || 0
    };

    this.logger.log(`✅ Email enviado exitosamente - ID: ${response.messageId}`);

    return response;

  } catch (error) {
    this.logger.error('❌ Error enviando email:', error);
    
    // Re-throw specific exceptions
    if (error instanceof UnauthorizedException || 
        error instanceof NotFoundException ||
        error instanceof BadRequestException) {
      throw error;
    }

    // Generic error
    throw new BadRequestException({
      success: false,
      error: 'SEND_FAILED',
      message: 'Error interno enviando email.'
    });
  }
}

/**
 * 📧 ENVIAR EMAIL SIMPLE - BASADO EN sendReplyEmail QUE YA FUNCIONA
 */
private async sendEmailSimpleAndWorking(
  accessToken: string,
  sendEmailData: SendEmailDto
): Promise<string> {
  try {
    // 1️⃣ CONFIGURAR GMAIL CLIENT
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // 2️⃣ CONSTRUIR HEADERS BÁSICOS
    const headers = [
      `To: ${sendEmailData.to.join(', ')}`,
      `Subject: ${this.encodeSubject(sendEmailData.subject)}`,
      `From: ${sendEmailData.from}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: ${this.generateSimpleMessageId(sendEmailData.from)}`,
      `MIME-Version: 1.0`
    ];

    // CC/BCC si existen
    if (sendEmailData.cc?.length) {
      headers.push(`Cc: ${sendEmailData.cc.join(', ')}`);
    }
    
    if (sendEmailData.bcc?.length) {
      headers.push(`Bcc: ${sendEmailData.bcc.join(', ')}`);
    }

    // 3️⃣ CONSTRUIR CUERPO DEL EMAIL
    let emailContent = '';

    // CASO 1: Solo texto plano, sin attachments
    if (!sendEmailData.bodyHtml && !sendEmailData.attachments?.length) {
      headers.push('Content-Type: text/plain; charset=UTF-8');
      emailContent = headers.join('\r\n') + '\r\n\r\n' + sendEmailData.body;
    }
    // CASO 2: HTML sin attachments  
    else if (sendEmailData.bodyHtml && !sendEmailData.attachments?.length) {
      const boundary = this.generateUniqueBoundary();
      
      headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
      emailContent = headers.join('\r\n') + '\r\n\r\n';
      
      // Texto plano
      emailContent += `--${boundary}\r\n`;
      emailContent += 'Content-Type: text/plain; charset=UTF-8\r\n\r\n';
      emailContent += sendEmailData.body + '\r\n\r\n';
      
      // HTML
      emailContent += `--${boundary}\r\n`;
      emailContent += 'Content-Type: text/html; charset=UTF-8\r\n\r\n';
      emailContent += sendEmailData.bodyHtml + '\r\n\r\n';
      
      emailContent += `--${boundary}--`;
    }
    // CASO 3: Con attachments (con o sin HTML)
    else if (sendEmailData.attachments?.length) {
      const mainBoundary = this.generateUniqueBoundary();
      
      headers.push(`Content-Type: multipart/mixed; boundary="${mainBoundary}"`);
      emailContent = headers.join('\r\n') + '\r\n\r\n';

      // PARTE 1: Contenido del mensaje
      if (sendEmailData.bodyHtml) {
        // Contenido multipart/alternative anidado
        const contentBoundary = this.generateUniqueBoundary();
        
        emailContent += `--${mainBoundary}\r\n`;
        emailContent += `Content-Type: multipart/alternative; boundary="${contentBoundary}"\r\n\r\n`;
        
        // Texto plano
        emailContent += `--${contentBoundary}\r\n`;
        emailContent += 'Content-Type: text/plain; charset=UTF-8\r\n\r\n';
        emailContent += sendEmailData.body + '\r\n\r\n';
        
        // HTML
        emailContent += `--${contentBoundary}\r\n`;
        emailContent += 'Content-Type: text/html; charset=UTF-8\r\n\r\n';
        emailContent += sendEmailData.bodyHtml + '\r\n\r\n';
        
        emailContent += `--${contentBoundary}--\r\n\r\n`;
      } else {
        // Solo texto plano
        emailContent += `--${mainBoundary}\r\n`;
        emailContent += 'Content-Type: text/plain; charset=UTF-8\r\n\r\n';
        emailContent += sendEmailData.body + '\r\n\r\n';
      }

      // PARTE 2: Attachments
      for (const attachment of sendEmailData.attachments) {
        emailContent += await this.buildAttachmentSimple(attachment, mainBoundary);
      }

      // Cerrar multipart principal
      emailContent += `--${mainBoundary}--`;
    }

    // 4️⃣ CODIFICAR PARA GMAIL API
    const encodedMessage = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // 5️⃣ ENVIAR VIA GMAIL API
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    if (!response.data.id) {
      throw new Error('Gmail API no retornó ID del mensaje');
    }

    return response.data.id;
    
  } catch (error) {
    this.logger.error('❌ Error en Gmail API:', error);
    throw error;
  }
}

/**
 * 📎 CONSTRUIR ATTACHMENT SIMPLE Y CORRECTO
 */
private async buildAttachmentSimple(
  attachment: EmailAttachmentDto, 
  boundary: string
): Promise<string> {
  try {
    // Validaciones básicas
    if (!attachment.filename || !attachment.content || !attachment.mimeType) {
      throw new Error('Attachment incompleto');
    }

    // Validar base64
    if (!this.isValidBase64Simple(attachment.content)) {
      throw new Error(`Attachment ${attachment.filename}: contenido no es base64 válido`);
    }

    let attachmentPart = `--${boundary}\r\n`;
    attachmentPart += `Content-Type: ${attachment.mimeType}\r\n`;
    attachmentPart += `Content-Disposition: attachment; filename="${this.sanitizeFilename(attachment.filename)}"\r\n`;
    attachmentPart += 'Content-Transfer-Encoding: base64\r\n\r\n';
    
    // Dividir base64 en líneas de 76 caracteres
    const base64Lines = attachment.content.match(/.{1,76}/g) || [];
    attachmentPart += base64Lines.join('\r\n') + '\r\n\r\n';

    return attachmentPart;

  } catch (error) {
    this.logger.error(`❌ Error procesando attachment ${attachment.filename}:`, error);
    throw error;
  }
}

/**
 * 🔧 MÉTODOS HELPER SIMPLIFICADOS
 */

private generateUniqueBoundary(): string {
  const timestamp = Date.now();
  const random1 = Math.random().toString(36).substring(2, 8);
  const random2 = Math.random().toString(36).substring(2, 8);
  return `----=_Part_${timestamp}_${random1}_${random2}`;
}

private isValidBase64Simple(str: string): boolean {
  try {
    return Buffer.from(str, 'base64').toString('base64') === str;
  } catch {
    return false;
  }
}



// MÉTODOS HELPER SIMPLIFICADOS

/**
 * 🏷️ CODIFICAR SUBJECT UTF-8
 */
private encodeSubject(subject: string): string {
  // Si es ASCII simple, no hacer nada
  if (/^[\x00-\x7F]*$/.test(subject)) {
    return subject;
  }
  
  // Para caracteres especiales, usar encoding RFC 2047
  return `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
}

/**
 * 🆔 GENERAR MESSAGE ID SIMPLE
 */
private generateSimpleMessageId(fromEmail: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const domain = fromEmail.split('@')[1] || 'gmail.com';
  return `<${timestamp}.${random}@${domain}>`;
}

 /**
   * 🏗️ CONSTRUIR CUERPO DEL EMAIL (texto + HTML + attachments) - CORREGIDO
   */
  private async buildEmailBody(
    sendEmailData: SendEmailDto, 
    attachments?: EmailAttachmentDto[]
  ): Promise<string> {
    try {
      // 1️⃣ EMAIL SIMPLE (solo texto plano, sin attachments ni HTML)
      if (!sendEmailData.bodyHtml && !attachments?.length) {
        return sendEmailData.body;
      }

      // 2️⃣ EMAIL MULTIPART - ESTRUCTURA CORRECTA
      const mainBoundary = this.generateBoundary();

      // ✅ CASO 1: Solo HTML (sin attachments)
      if (sendEmailData.bodyHtml && !attachments?.length) {
        return this.buildAlternativeBody(sendEmailData, mainBoundary);
      }

      // ✅ CASO 2: Solo attachments (sin HTML)
      if (!sendEmailData.bodyHtml && attachments?.length) {
        return this.buildMixedBodyTextOnly(sendEmailData, attachments || [], mainBoundary);
      }

      // ✅ CASO 3: HTML + attachments (estructura anidada completa)
      return this.buildFullMixedBody(sendEmailData, attachments || [], mainBoundary);

    } catch (error) {
      this.logger.error('❌ Error construyendo cuerpo del email:', error);
      throw new Error(`Error construyendo cuerpo: ${error.message}`);
    }
  }

  /**
   * 📝 CONSTRUIR CUERPO SOLO CON TEXTO + HTML (multipart/alternative)
   */
  private buildAlternativeBody(sendEmailData: SendEmailDto, boundary: string): string {
    let emailBody = '';
    
    // Texto plano
    emailBody += `--${boundary}\r\n`;
    emailBody += 'Content-Type: text/plain; charset=UTF-8\r\n';
    emailBody += 'Content-Transfer-Encoding: 7bit\r\n\r\n';
    emailBody += sendEmailData.body + '\r\n\r\n';

    // HTML
    emailBody += `--${boundary}\r\n`;
    emailBody += 'Content-Type: text/html; charset=UTF-8\r\n';
    emailBody += 'Content-Transfer-Encoding: 7bit\r\n\r\n';
    emailBody += sendEmailData.bodyHtml + '\r\n\r\n';

    // Cerrar multipart
    emailBody += `--${boundary}--\r\n`;
    
    return emailBody;
  }

  /**
   * 📎 CONSTRUIR CUERPO CON TEXTO + ATTACHMENTS (multipart/mixed simple)
   */
  private async buildMixedBodyTextOnly(
    sendEmailData: SendEmailDto, 
    attachments: EmailAttachmentDto[], 
    boundary: string
  ): Promise<string> {
    let emailBody = '';
    
    // Parte de texto
    emailBody += `--${boundary}\r\n`;
    emailBody += 'Content-Type: text/plain; charset=UTF-8\r\n';
    emailBody += 'Content-Transfer-Encoding: 7bit\r\n\r\n';
    emailBody += sendEmailData.body + '\r\n\r\n';

    // Attachments
    for (const attachment of attachments) {
      emailBody += await this.buildAttachmentPart(attachment, boundary);
    }

    // Cerrar multipart
    emailBody += `--${boundary}--\r\n`;
    
    return emailBody;
  }

  /**
   * 🎯 CONSTRUIR CUERPO COMPLETO: HTML + ATTACHMENTS (estructura anidada correcta)
   */
  private async buildFullMixedBody(
    sendEmailData: SendEmailDto, 
    attachments: EmailAttachmentDto[], 
    mainBoundary: string
  ): Promise<string> {
    let emailBody = '';
    const alternativeBoundary = this.generateBoundary();

    // 1️⃣ COMENZAR CONTENEDOR PRINCIPAL (multipart/mixed)
    emailBody += `--${mainBoundary}\r\n`;
    emailBody += `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"\r\n`;
    emailBody += `\r\n`;

    // 2️⃣ PARTE ALTERNATIVA: TEXTO PLANO
    emailBody += `--${alternativeBoundary}\r\n`;
    emailBody += 'Content-Type: text/plain; charset=UTF-8\r\n';
    emailBody += 'Content-Transfer-Encoding: 7bit\r\n\r\n';
    emailBody += sendEmailData.body + '\r\n\r\n';

    // 3️⃣ PARTE ALTERNATIVA: HTML
    emailBody += `--${alternativeBoundary}\r\n`;
    emailBody += 'Content-Type: text/html; charset=UTF-8\r\n';
    emailBody += 'Content-Transfer-Encoding: 7bit\r\n\r\n';
    emailBody += sendEmailData.bodyHtml + '\r\n\r\n';

    // 4️⃣ CERRAR PARTE ALTERNATIVA
    emailBody += `--${alternativeBoundary}--\r\n\r\n`;

    // 5️⃣ AGREGAR ATTACHMENTS AL CONTENEDOR PRINCIPAL
    for (const attachment of attachments) {
      emailBody += await this.buildAttachmentPart(attachment, mainBoundary);
    }

    // 6️⃣ CERRAR CONTENEDOR PRINCIPAL
    emailBody += `--${mainBoundary}--\r\n`;
    
    return emailBody;
  }

  /**
   * 🎯 GENERAR MESSAGE ID ÚNICO
   */
  private generateMessageId(fromEmail: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const domain = fromEmail.split('@')[1] || 'gmail.com';
    return `<${timestamp}.${random}@${domain}>`;
  }

  /**
   * 🔤 CODIFICAR HEADERS UTF-8 CORRECTAMENTE
   */
  private encodeUtf8Header(value: string): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    try {
      // Si solo contiene ASCII, no necesita encoding
      if (/^[\x00-\x7F]*$/.test(value)) {
        return value;
      }
      
      // Para caracteres no-ASCII, usar RFC 2047 encoded-word
      const maxLength = 50;
      
      if (value.length <= maxLength) {
        return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
      }
      
      // Para textos largos, dividir en múltiples encoded-words
      const chunks: string[] = [];
      let remaining = value;
      
      while (remaining.length > 0) {
        let chunk = remaining.substring(0, maxLength);
        while (chunk.length > 0 && Buffer.byteLength(chunk, 'utf8') > maxLength) {
          chunk = chunk.substring(0, chunk.length - 1);
        }
        
        chunks.push(`=?UTF-8?B?${Buffer.from(chunk, 'utf8').toString('base64')}?=`);
        remaining = remaining.substring(chunk.length);
      }
      
      return chunks.join(' ');
      
    } catch (error) {
      this.logger.warn(`Error encoding header: ${value}, usando original`);
      return value;
    }
  }

  /**
   * 🎨 OBTENER HEADERS DE PRIORIDAD
   */
  private getPriorityHeaders(priority: EmailPriority): Record<string, string> {
    switch (priority) {
      case EmailPriority.HIGH:
        return {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        };
      case EmailPriority.LOW:
        return {
          'X-Priority': '5', 
          'X-MSMail-Priority': 'Low',
          'Importance': 'low'
        };
      case EmailPriority.NORMAL:
      default:
        return {
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal', 
          'Importance': 'normal'
        };
    }
  }

  /**
   * ✅ VALIDAR MESSAGE ID PARA HILOS
   */
  private isValidMessageId(messageId: string): boolean {
    if (!messageId || typeof messageId !== 'string') {
      return false;
    }
    
    const messageIdRegex = /^<[^<>@]+@[^<>@]+\.[^<>@]+>$/;
    return messageIdRegex.test(messageId) && messageId.length <= 998;
  }

  /**
   * 📦 GENERAR BOUNDARY PARA MULTIPART
   */
  private generateBoundary(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const uuid = Math.random().toString(36).substring(2, 8);
    return `----=_Part_${timestamp}_${random}_${uuid}`;
  }

  /**
   * 🆔 GENERAR REQUEST ID PARA TRACKING
   */
  private generateRequestId(): string {
    return 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
  }

  /**
   * 📎 CONSTRUIR PARTE DE ATTACHMENT - MEJORADO
   */
  private async buildAttachmentPart(
    attachment: EmailAttachmentDto, 
    boundary: string
  ): Promise<string> {
    try {
      // Validar attachment completo
      if (!attachment.filename || !attachment.content || !attachment.mimeType) {
        throw new Error('Attachment incompleto: falta filename, content o mimeType');
      }

      // Validar filename seguro
      if (!this.isValidFilename(attachment.filename)) {
        throw new Error(`Filename inválido: ${attachment.filename}`);
      }

      // Validar que el contenido sea base64 válido
      if (!this.isValidBase64(attachment.content)) {
        throw new Error(`Attachment ${attachment.filename}: contenido no es base64 válido`);
      }

      // Validar tamaño del attachment
      const attachmentSizeBytes = (attachment.content.length * 3) / 4; // Tamaño real decodificado
      const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024; // 20MB por archivo
      
      if (attachmentSizeBytes > MAX_ATTACHMENT_SIZE) {
        throw new Error(`Attachment ${attachment.filename} demasiado grande: ${Math.round(attachmentSizeBytes / 1024 / 1024)}MB. Límite: 20MB`);
      }

      // Validar MIME type
      if (!this.isValidMimeType(attachment.mimeType)) {
        throw new Error(`MIME type inválido o peligroso: ${attachment.mimeType}`);
      }

      let attachmentPart = `--${boundary}\r\n`;
      attachmentPart += `Content-Type: ${attachment.mimeType}; name="${this.sanitizeFilename(attachment.filename)}"\r\n`;
      attachmentPart += `Content-Disposition: attachment; filename="${this.sanitizeFilename(attachment.filename)}"\r\n`;
      attachmentPart += 'Content-Transfer-Encoding: base64\r\n\r\n';
      
      // Dividir base64 en líneas de 76 caracteres (estándar MIME)
      const base64Lines = attachment.content.match(/.{1,76}/g) || [];
      attachmentPart += base64Lines.join('\r\n') + '\r\n\r\n';

      this.logger.debug(`Attachment procesado: ${attachment.filename} (${attachment.mimeType}) - ${Math.round(attachmentSizeBytes / 1024)}KB`);
      
      return attachmentPart;

    } catch (error) {
      this.logger.error(`❌ Error procesando attachment ${attachment.filename}:`, error);
      throw error;
    }
  }

  /**
   * 📂 VALIDAR FILENAME SEGURO
   */
  private isValidFilename(filename: string): boolean {
    // Rechazar nombres de archivo peligrosos
    const dangerousPatterns = [
      /\.\./,                    // Path traversal
      /^\.+$/,                   // Solo puntos
      /[\u0000-\u001F\u007F]/,   // Caracteres de control
      /[<>:"|?*]/,              // Caracteres problemáticos en Windows
      /\.(exe|bat|cmd|scr|pif|com|pdb|dll|vbs|js)$/i, // Ejecutables peligrosos
    ];

    if (filename.length === 0 || filename.length > 255) return false;
    
    return !dangerousPatterns.some(pattern => pattern.test(filename));
  }

  /**
   * 🧹 SANITIZAR FILENAME
   */
private sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"|?*\u0000-\u001F\u007F]/g, '_')
    .replace(/^\.+/, '_')
    .substring(0, 100);
}

  /**
   * 🎭 VALIDAR MIME TYPE SEGURO
   */
  private isValidMimeType(mimeType: string): boolean {
    // Lista blanca de MIME types seguros
    const allowedMimeTypes = [
      // Documentos
      'text/plain',
      'text/csv',
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      
      // Imágenes
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      
      // Archivos comprimidos
      'application/zip',
      'application/x-zip-compressed',
      'application/gzip',
      'application/x-rar-compressed',
      
      // Otros seguros
      'application/json',
      'text/xml',
      'application/xml',
    ];

    // MIME types peligrosos que siempre rechazar
    const dangerousMimeTypes = [
      'application/x-msdownload',
      'application/x-msdos-program', 
      'application/x-executable',
      'application/x-winexe',
      'application/x-javascript',
      'text/javascript',
      'application/javascript',
    ];

    if (dangerousMimeTypes.includes(mimeType.toLowerCase())) {
      return false;
    }

    return allowedMimeTypes.includes(mimeType.toLowerCase());
  }

  /**
   * 📊 VERIFICAR QUOTA DE GMAIL (prevenir errores de límite)
   */
  private async checkGmailQuota(
    accessToken: string, 
    sendEmailData: SendEmailDto
  ): Promise<SendEmailQuotaCheck> {
    try {
      // 1️⃣ VALIDAR EMAILS DESTINATARIOS ANTES DE ENVIAR
      const allRecipients = [
        ...sendEmailData.to,
        ...(sendEmailData.cc || []),
        ...(sendEmailData.bcc || [])
      ];

      // Validar cada email con regex más estricto
      const invalidEmails = allRecipients.filter(email => !this.isValidEmailFormat(email));
      if (invalidEmails.length > 0) {
        return {
          canSend: false,
          reason: `Emails inválidos detectados: ${invalidEmails.join(', ')}`,
          quotaInfo: {
            dailyQuotaLimit: 500,
            dailyQuotaUsed: 0,
            rateLimitPerMinute: 10,
            rateLimitUsed: 0,
            canSendEmail: false
          }
        };
      }

      // 2️⃣ CALCULAR TAMAÑO ESTIMADO DEL EMAIL
      const estimatedSize = this.estimateEmailSize(sendEmailData);
      
      // 3️⃣ LÍMITES CONOCIDOS DE GMAIL
      const GMAIL_DAILY_LIMIT = 500; // Emails por día para cuentas normales
      const GMAIL_SIZE_LIMIT = 25 * 1024 * 1024; // 25MB por email
      const MAX_RECIPIENTS_PER_EMAIL = 100;

      // 4️⃣ VERIFICAR TAMAÑO
      if (estimatedSize > GMAIL_SIZE_LIMIT) {
        return {
          canSend: false,
          reason: `Email demasiado grande: ${Math.round(estimatedSize / 1024 / 1024)}MB. Límite: 25MB`,
          quotaInfo: {
            dailyQuotaLimit: GMAIL_DAILY_LIMIT,
            dailyQuotaUsed: 0,
            rateLimitPerMinute: 10,
            rateLimitUsed: 0,
            canSendEmail: false
          }
        };
      }

      // 5️⃣ VERIFICAR NÚMERO DE DESTINATARIOS
      const totalRecipients = allRecipients.length;
      
      if (totalRecipients > MAX_RECIPIENTS_PER_EMAIL) {
        return {
          canSend: false,
          reason: `Demasiados destinatarios: ${totalRecipients}. Límite: ${MAX_RECIPIENTS_PER_EMAIL}`,
          quotaInfo: {
            dailyQuotaLimit: GMAIL_DAILY_LIMIT,
            dailyQuotaUsed: 0,
            rateLimitPerMinute: 10,
            rateLimitUsed: 0,
            canSendEmail: false
          }
        };
      }

      // 6️⃣ TODO OK - PUEDE ENVIAR
      return {
        canSend: true,
        quotaInfo: {
          dailyQuotaLimit: GMAIL_DAILY_LIMIT,
          dailyQuotaUsed: 0,
          rateLimitPerMinute: 10,
          rateLimitUsed: 0,
          canSendEmail: true
        }
      };

    } catch (error) {
      this.logger.warn('⚠️ Error verificando quota, permitiendo envío:', error);
      
      // Si falla la verificación, permitir envío (fail-open)
      return {
        canSend: true,
        quotaInfo: {
          dailyQuotaLimit: 500,
          dailyQuotaUsed: 0,
          rateLimitPerMinute: 10,
          rateLimitUsed: 0,
          canSendEmail: true
        }
      };
    }
  }

  /**
   * ✉️ VALIDAR FORMATO DE EMAIL MÁS ESTRICTAMENTE
   */
  private isValidEmailFormat(email: string): boolean {
    // Regex más estricto que incluye dominios válidos
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(email)) {
      return false;
    }

    // Validaciones adicionales
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    
    const [local, domain] = parts;
    
    // Validar parte local (antes del @)
    if (local.length === 0 || local.length > 64) return false;
    if (local.startsWith('.') || local.endsWith('.')) return false;
    if (local.includes('..')) return false;
    
    // Validar dominio
    if (domain.length === 0 || domain.length > 255) return false;
    if (domain.startsWith('-') || domain.endsWith('-')) return false;
    if (domain.startsWith('.') || domain.endsWith('.')) return false;
    
    // Rechazar dominios obviamente falsos
    const fakeDomains = ['ejemplo.com', 'example.com', 'test.com', 'fake.com'];
    if (fakeDomains.includes(domain.toLowerCase())) {
      return false;
    }
    
    return true;
  }

  /**
   * 📏 ESTIMAR TAMAÑO DEL EMAIL
   */
  private estimateEmailSize(sendEmailData: SendEmailDto): number {
    try {
      let totalSize = 0;

      // Headers (estimado)
      totalSize += 1024; // ~1KB para headers

      // Body texto
      totalSize += Buffer.byteLength(sendEmailData.body, 'utf8');

      // Body HTML
      if (sendEmailData.bodyHtml) {
        totalSize += Buffer.byteLength(sendEmailData.bodyHtml, 'utf8');
      }

      // Attachments
      if (sendEmailData.attachments?.length) {
        for (const attachment of sendEmailData.attachments) {
          // Base64 añade ~33% de overhead
          const attachmentSize = (attachment.content.length * 3) / 4; // Decodificado
          totalSize += attachmentSize * 1.33; // Con overhead de encoding
        }
      }

      this.logger.debug(`Tamaño estimado del email: ${Math.round(totalSize / 1024)}KB`);
      
      return Math.round(totalSize);

    } catch (error) {
      this.logger.warn('⚠️ Error estimando tamaño, usando default:', error);
      return 10 * 1024; // 10KB default
    }
  }

  /**
   * 🔍 PARSEAR ERRORES DE GMAIL API
   */
  private parseGmailApiError(error: unknown): SendEmailError | null {
    try {
      // Type guard seguro
      const errorObj = this.isErrorWithMessage(error) ? error : { message: 'Unknown error' };
      const errorMessage = errorObj.message || '';
      const errorCode = this.getErrorCode(error);

      // Errores conocidos de Gmail API
      if (errorMessage.includes('Invalid recipients') || errorMessage.includes('invalid_recipient')) {
        return {
          code: 'INVALID_RECIPIENTS',
          message: 'Uno o más destinatarios tienen direcciones de email inválidas',
          timestamp: new Date().toISOString(),
          gmailApiError: { code: errorCode, message: errorMessage }
        };
      }

      if (errorMessage.includes('quota') || errorMessage.includes('limit') || errorCode === 429) {
        return {
          code: 'QUOTA_EXCEEDED',
          message: 'Límite de envío de Gmail excedido. Inténtalo más tarde.',
          timestamp: new Date().toISOString(),
          gmailApiError: { code: errorCode, message: errorMessage }
        };
      }

      if (errorMessage.includes('permission') || errorMessage.includes('access') || errorCode === 403) {
        return {
          code: 'ACCESS_DENIED',
          message: 'No tienes permisos para enviar desde esta cuenta Gmail',
          timestamp: new Date().toISOString(),
          gmailApiError: { code: errorCode, message: errorMessage }
        };
      }

      if (errorMessage.includes('authentication') || errorMessage.includes('token') || errorCode === 401) {
        return {
          code: 'AUTH_FAILED',
          message: 'Token de Gmail inválido o expirado',
          timestamp: new Date().toISOString(),
          gmailApiError: { code: errorCode, message: errorMessage }
        };
      }

      if (errorMessage.includes('size') || errorMessage.includes('too large')) {
        return {
          code: 'EMAIL_TOO_LARGE',
          message: 'El email excede el tamaño máximo permitido (25MB)',
          timestamp: new Date().toISOString(),
          gmailApiError: { code: errorCode, message: errorMessage }
        };
      }

      // Si no es un error conocido, devolver null
      return null;

    } catch {
      return null;
    }
  }

  /**
   * ✅ VALIDAR BASE64
   */
  private isValidBase64(str: string): boolean {
    try {
      // En Node.js usar Buffer
      return Buffer.from(str, 'base64').toString('base64') === str;
    } catch (error) {
  this.logger.debug(`Base64 validation failed:`, error);
  return false;
}
  }

  // Type guards helper
  private isErrorWithMessage(error: unknown): error is { message: string } {
    return typeof error === 'object' && error !== null && 'message' in error;
  }

  private getErrorCode(error: unknown): number {
    if (typeof error === 'object' && error !== null) {
      const errorObj = error as any;
      return errorObj.code || errorObj.response?.status || 0;
    }
    return 0;
  }

  // ================================
  // 📤 MÉTODOS REPLY EMAIL (EXISTENTES)
  // ================================

  /**
   * Responder email con JWT - ACTUALIZADO CON SEMÁFORO
   */
  async replyToEmailWithJWT(
    jwtToken: string,
    messageId: string,
    replyData: {
      body: string;
      bodyHtml?: string;
    },
  ): Promise<ReplyEmailResponse> {
    try {
      this.logger.log(
        `Iniciando respuesta al email ${messageId} con JWT token`,
      );

      // 1️⃣ EXTRAER USER ID DEL JWT TOKEN
      const userId = this.extractUserIdFromJWT(jwtToken);

      if (!userId) {
        return {
          success: false,
          error: 'Token JWT inválido - no se pudo extraer userId',
        };
      }

      this.logger.log(`Usuario extraído del JWT: ${userId}`);

      // 2️⃣ BUSCAR EL EMAIL Y LA CUENTA EN UN SOLO QUERY
      const emailResult = await this.databaseService.findEmailByIdForUser(
        messageId,
        userId,
      );

      if (!emailResult) {
        return {
          success: false,
          error: `Email ${messageId} no encontrado o no pertenece al usuario`,
        };
      }

      const { email, cuentaGmail } = emailResult;
      console.log('🔍 DEBUG - Email encontrado:', email);
      this.logger.log(`Email encontrado en cuenta: ${cuentaGmail.email_gmail}`);

      // 3️⃣ OBTENER TOKEN DE ACCESO VÁLIDO
      const accessToken = await this.getValidTokenForAccount(cuentaGmail.id);

      if (!accessToken) {
        return {
          success: false,
          error: 'No se pudo obtener token de acceso para Gmail',
        };
      }

      // 4️⃣ OBTENER EMAIL COMPLETO DESDE GMAIL API
      let emailCompleto: EmailDetail;
      try {
        emailCompleto = await this.getEmailFromGmailAPI(
          accessToken,
          cuentaGmail.id.toString(),
          messageId,
        );
      } catch (error) {
        this.logger.error('Error obteniendo email completo:', error);
        return {
          success: false,
          error: 'No se pudo obtener el email completo desde Gmail',
        };
      }

      // 5️⃣ ENVIAR LA RESPUESTA
      const sentMessageId = await this.sendReplyEmail(
        accessToken,
        emailCompleto,
        replyData,
        cuentaGmail.email_gmail,
      );

      // 🚦 6️⃣ MARCAR EMAIL COMO RESPONDIDO EN BD
      let trafficLightUpdated = false;
      try {
        const markResult =
          await this.databaseService.markEmailAsReplied(messageId);

        if (markResult) {
          trafficLightUpdated = true;
          this.logger.log(
            `Semáforo actualizado: ${markResult.old_status} → ${markResult.new_status} ` +
              `(ahorró ${markResult.days_saved} días sin respuesta)`,
          );
        }
      } catch (dbError) {
        this.logger.error('Error actualizando semaforo (no crítico):', dbError);
        // No fallar toda la operación por esto
      }

      // 7️⃣ INVALIDAR CACHE (si existe)
      try {
        // Solo si tienes cache service implementado
        // await this.cacheService.invalidateEmailCache(cuentaGmail.id);
      } catch (cacheError) {
        this.logger.warn('Error invalidando cache (ignorado):', cacheError);
      }

      this.logger.log(
        `Respuesta enviada exitosamente con ID: ${sentMessageId}`,
      );

      return {
        success: true,
        message: `Respuesta enviada exitosamente desde ${cuentaGmail.email_gmail}`,
        sentMessageId,
        traffic_light_updated: trafficLightUpdated,
      };
    } catch (error) {
      this.logger.error('Error enviando respuesta:', error);

      return {
        success: false,
        error: `Error interno enviando respuesta: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Dashboard del semaforo
   */
  async getTrafficLightDashboard(
    authHeader: string,
  ): Promise<TrafficLightDashboardResponse> {
    try {
      const userId = this.extractUserIdFromJWT(authHeader);

      if (!userId) {
        return {
          success: false,
          dashboard: [],
          ultima_actualizacion: new Date().toISOString(),
          error: 'Token JWT inválido - no se pudo extraer userId',
        };
      }

      this.logger.log(
        `Obteniendo dashboard de semaforo para usuario ${userId}`,
      );

      // Obtener todas las cuentas del usuario
      const cuentasGmail =
        await this.databaseService.obtenerCuentasGmailUsuario(userId);

      if (!cuentasGmail || cuentasGmail.length === 0) {
        this.logger.warn(`Usuario ${userId} no tiene cuentas Gmail conectadas`);
        return {
          success: true,
          dashboard: [],
          ultima_actualizacion: new Date().toISOString(),
        };
      }

      const dashboard: TrafficLightAccountStats[] = [];

      for (const cuenta of cuentasGmail) {
        try {
          const estadisticas =
            await this.databaseService.getTrafficLightStatsByAccount(cuenta.id);

          const totalSinResponder = estadisticas.reduce(
            (sum, stat) => sum + parseInt(stat.count),
            0,
          );

          const accountStats: TrafficLightAccountStats = {
            cuenta_id: cuenta.id,
            email_gmail: cuenta.email_gmail,
            nombre_cuenta: cuenta.nombre_cuenta,
            estadisticas,
            total_sin_responder: totalSinResponder,
          };

          dashboard.push(accountStats);

          this.logger.debug(
            `Cuenta ${cuenta.email_gmail}: ${totalSinResponder} emails sin responder`,
          );
        } catch (error) {
          this.logger.error(
            `Error obteniendo stats para cuenta ${cuenta.email_gmail}:`,
            error,
          );

          // Continuar con las demás cuentas
          const fallbackStats: TrafficLightAccountStats = {
            cuenta_id: cuenta.id,
            email_gmail: cuenta.email_gmail,
            nombre_cuenta: cuenta.nombre_cuenta,
            estadisticas: [],
            total_sin_responder: 0,
          };

          dashboard.push(fallbackStats);
        }
      }

      this.logger.log(
        `Dashboard generado para ${dashboard.length} cuentas Gmail`,
      );

      return {
        success: true,
        dashboard,
        ultima_actualizacion: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error obteniendo dashboard semaforo:', error);
      return {
        success: false,
        dashboard: [],
        ultima_actualizacion: new Date().toISOString(),
        error: (error as Error).message,
      };
    }
  }

  /**
   * Obtener emails por estado del semaforo
   */
  async getEmailsByTrafficLight(
    authHeader: string,
    status: TrafficLightStatus,
    cuentaId?: number,
    limit: number = 10,
  ): Promise<EmailsByTrafficLightResponse> {
    try {
      const userId = this.extractUserIdFromJWT(authHeader);

      if (!userId) {
        return {
          success: false,
          status,
          count: 0,
          emails: [],
          error: 'Token JWT inválido - no se pudo extraer userId',
        };
      }

      this.logger.log(
        `Obteniendo emails con estado ${status} para usuario ${userId}`,
      );

      let emails: EmailMetadataDBWithTrafficLight[] = [];

      if (cuentaId) {
        // Verificar que la cuenta pertenece al usuario
        const cuentasUsuario =
          await this.databaseService.obtenerCuentasGmailUsuario(userId);
        const cuentaValida = cuentasUsuario.find((c) => c.id === cuentaId);

        if (!cuentaValida) {
          return {
            success: false,
            status,
            count: 0,
            emails: [],
            error: 'Cuenta no encontrada o no autorizada',
          };
        }

        emails = await this.databaseService.getEmailsByTrafficLight(
          cuentaId,
          status,
          limit,
        );
      } else {
        // Obtener de todas las cuentas del usuario
        const cuentasGmail =
          await this.databaseService.obtenerCuentasGmailUsuario(userId);

        const allEmails: EmailMetadataDBWithTrafficLight[] = [];

        for (const cuenta of cuentasGmail) {
          try {
            const emailsCuenta =
              await this.databaseService.getEmailsByTrafficLight(
                cuenta.id,
                status,
                limit * 2, // Obtener más emails para mezclar mejor
              );
            allEmails.push(...emailsCuenta);
          } catch (error) {
            this.logger.warn(
              `Error obteniendo emails de cuenta ${cuenta.email_gmail}:`,
              error,
            );
            // Continuar con otras cuentas
          }
        }

        // Ordenar por días sin respuesta (descendente) y limitar
        allEmails.sort((a, b) => b.days_without_reply - a.days_without_reply);
        emails = allEmails.slice(0, limit);
      }

      this.logger.log(
        `Encontrados ${emails.length} emails con estado ${status}`,
      );

      return {
        success: true,
        status,
        count: emails.length,
        emails,
      };
    } catch (error) {
      this.logger.error('Error obteniendo emails por semaforo:', error);
      return {
        success: false,
        status,
        count: 0,
        emails: [],
        error: (error as Error).message,
      };
    }
  }

  /**
   * Actualizar semaforos manualmente - CORREGIDO
   */
  async updateTrafficLights(
    authHeader: string,
  ): Promise<UpdateTrafficLightsResponse> {
    try {
      const userId = this.extractUserIdFromJWT(authHeader);

      if (!userId) {
        return {
          success: false,
          error: 'Token JWT inválido - no se pudo extraer userId',
        };
      }

      this.logger.log(`Usuario ${userId} solicitó actualización de semaforos`);

      // Actualizar todos los semaforos del sistema
      const estadisticas = await this.databaseService.updateAllTrafficLights();

      this.logger.log(
        `Semáforos actualizados: ${estadisticas.actualizados} emails procesados`,
      );

      return {
        success: true,
        message: 'Semáforos actualizados correctamente',
        estadisticas,
      };
    } catch (error) {
      this.logger.error('Error actualizando semaforos:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 📤 ENVIAR RESPUESTA USANDO GMAIL API
   */
  private async sendReplyEmail(
    accessToken: string,
    originalEmail: EmailDetail,
    replyData: { body: string; bodyHtml?: string },
    fromGmailAccount: string,
  ): Promise<string> {
    try {
      this.logger.log(`📤 Enviando respuesta desde ${fromGmailAccount}`);

      // 1️⃣ CONFIGURAR GMAIL CLIENT
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // 2️⃣ CONSTRUIR HEADERS DE LA RESPUESTA
      const replySubject = originalEmail.subject.startsWith('Re: ')
        ? originalEmail.subject
        : `Re: ${originalEmail.subject}`;

      const replyHeaders = [
        `To: ${originalEmail.fromEmail}`,
        `Subject: ${replySubject}`,
        `In-Reply-To: ${originalEmail.messageId}`,
        `References: ${originalEmail.messageId}`,
        `From: ${fromGmailAccount}`,
        `Content-Type: text/plain; charset=UTF-8`,
      ];

      // 3️⃣ CONSTRUIR EL CUERPO DEL EMAIL
      let emailContent = replyHeaders.join('\r\n') + '\r\n\r\n';

      // Si hay HTML, crear email multipart
      if (replyData.bodyHtml) {
        const boundary = '----=_Part_' + Date.now();

        // Cambiar content-type header para multipart
        replyHeaders[replyHeaders.length - 1] =
          `Content-Type: multipart/alternative; boundary="${boundary}"`;

        emailContent = replyHeaders.join('\r\n') + '\r\n\r\n';
        emailContent += `--${boundary}\r\n`;
        emailContent += 'Content-Type: text/plain; charset=UTF-8\r\n\r\n';
        emailContent += replyData.body + '\r\n\r\n';
        emailContent += `--${boundary}\r\n`;
        emailContent += 'Content-Type: text/html; charset=UTF-8\r\n\r\n';
        emailContent += replyData.bodyHtml + '\r\n\r\n';
        emailContent += `--${boundary}--`;
      } else {
        // Solo texto plano
        emailContent += replyData.body;
      }

      // 4️⃣ CODIFICAR EN BASE64 PARA GMAIL API
      const encodedMessage = Buffer.from(emailContent)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // 5️⃣ ENVIAR A TRAVÉS DE GMAIL API
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
          threadId: originalEmail.id, // Para mantener la conversación
        },
      });

      if (!response.data.id) {
        throw new Error('Gmail API no retornó ID del mensaje enviado');
      }

      this.logger.log(`✅ Email enviado con ID: ${response.data.id}`);
      return response.data.id;
    } catch (error) {
      this.logger.error('❌ Error enviando email via Gmail API:', error);
      throw error;
    }
  }

  /**
   * 📧 Obtener email específico desde Gmail API
   */
  private async getEmailFromGmailAPI(
    accessToken: string,
    userId: string,
    messageId: string,
  ): Promise<EmailDetail> {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const emailDetail = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    const extractedData = this.extractFullEmailData(emailDetail.data);

    if (!extractedData) {
      throw new NotFoundException(
        `Email con ID ${messageId} no pudo ser procesado`,
      );
    }

    return extractedData;
  }

  /**
   * 🔑 Obtener token válido para una cuenta específica
   */
  private async getValidTokenForAccount(
    cuentaGmailId: number,
  ): Promise<string> {
    try {
      // 🎯 CONSULTAR A MS-AUTH PARA OBTENER TOKEN
      const response = await fetch(
        `http://localhost:3001/tokens/gmail/${cuentaGmailId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Error obteniendo token: ${response.status}`);
      }

      const tokenData = await response.json();

      if (!tokenData.success || !tokenData.accessToken) {
        throw new Error('Token no válido recibido de MS-Auth');
      }

      return tokenData.accessToken;
    } catch (error) {
      this.logger.error(
        `❌ Error obteniendo token para cuenta ${cuentaGmailId}:`,
        error,
      );
      throw new Error(
        `No se pudo obtener token para cuenta Gmail ${cuentaGmailId}`,
      );
    }
  }

  /**
   * 🗑️ ELIMINAR EMAIL CON JWT
   */
  async deleteEmailWithJWT(
    jwtToken: string,
    messageId: string,
  ): Promise<DeleteEmailResponse> {
    try {
      this.logger.log(`🗑️ Iniciando eliminación del email ${messageId}`);

      // 1️⃣ EXTRAER USER ID DEL JWT
      const userId = this.extractUserIdFromJWT(jwtToken);

      if (!userId) {
        return {
          success: false,
          emailId: messageId,
          error: 'Token JWT inválido - no se pudo extraer userId',
        };
      }

      // 2️⃣ BUSCAR EMAIL Y VERIFICAR PERTENENCIA
      const emailResult = await this.databaseService.findEmailByIdForUser(
        messageId,
        userId,
      );

      if (!emailResult) {
        return {
          success: false,
          emailId: messageId,
          error: `Email ${messageId} no encontrado o no pertenece al usuario`,
        };
      }

      const { email, cuentaGmail } = emailResult;
      this.logger.log(`Email encontrado en cuenta: ${cuentaGmail.email_gmail}`);
      console.log('🔍 DEBUG - Email a eliminar:', email);

      // 3️⃣ MARCAR COMO DELETED EN BD (usando semaforo)
      const deleteResult =
        await this.databaseService.markEmailAsDeleted(messageId);

      if (!deleteResult) {
        return {
          success: false,
          emailId: messageId,
          error: 'No se pudo marcar el email como eliminado',
        };
      }

      // 4️⃣ OPCIONAL: ELIMINAR DE GMAIL API (si está configurado)
      let deletedFromGmail = false;
      const DELETE_FROM_GMAIL =
        this.configService.get<string>('DELETE_FROM_GMAIL') === 'true';

      if (DELETE_FROM_GMAIL) {
        try {
          const accessToken = await this.getValidTokenForAccount(
            cuentaGmail.id,
          );
          await this.deleteFromGmailAPI(accessToken, messageId);
          deletedFromGmail = true;
          this.logger.log(`✅ Email eliminado también de Gmail API`);
        } catch (gmailError) {
          this.logger.warn(
            `⚠️ Error eliminando de Gmail (continuando):`,
            gmailError,
          );
          // No fallar toda la operación
        }
      }

      // 5️⃣ LOG DE AUDITORÍA
      this.logger.log(
        `🗑️ EMAIL ELIMINADO - Usuario: ${userId}, Email: ${messageId}, ` +
          `Cuenta: ${cuentaGmail.email_gmail}, Estado anterior: ${deleteResult.previousStatus}, ` +
          `Gmail API: ${deletedFromGmail}`,
      );

      return {
        success: true,
        message: `Email eliminado exitosamente`,
        emailId: messageId,
        previousStatus: deleteResult.previousStatus,
        deletedFromGmail,
      };
    } catch (error) {
      this.logger.error('❌ Error eliminando email:', error);

      return {
        success: false,
        emailId: messageId,
        error: `Error interno eliminando email: ${(error as Error).message}`,
      };
    }
  }

  /**
   * 🗑️ ELIMINAR DE GMAIL API (opcional)
   */
  private async deleteFromGmailAPI(
    accessToken: string,
    messageId: string,
  ): Promise<void> {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    await gmail.users.messages.delete({
      userId: 'me',
      id: messageId,
    });
  }

  // ================================
  // 🔧 MÉTODOS AUXILIARES
  // ================================

  private async getRealEmailCount(
    gmail: gmail_v1.Gmail,
    query: string = 'in:inbox',
  ): Promise<number> {
    try {
      this.logger.log(
        `🔢 Iniciando conteo EXACTO de emails con query: "${query}"`,
      );

      let totalCount = 0;
      let nextPageToken: string | undefined = undefined;
      let pageNumber = 1;

      // NO HAY LÍMITE - Contamos TODOS los emails
      do {
        const response = await gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: 500, // Máximo permitido por Gmail API
          pageToken: nextPageToken,
          fields: 'messages/id,nextPageToken', // Solo necesitamos IDs para contar
        });

        const messages = response.data.messages || [];
        totalCount += messages.length;

        // Log de progreso cada 5 páginas
        if (pageNumber % 5 === 0) {
          this.logger.log(
            `📊 Conteo en progreso: ${totalCount} emails encontrados...`,
          );
        }

        nextPageToken = response.data.nextPageToken || undefined;
        pageNumber++;

        // Si no hay más mensajes, terminar
        if (messages.length === 0) {
          break;
        }
      } while (nextPageToken); // Continuar mientras haya más páginas

      this.logger.log(
        `✅ Conteo EXACTO completado: ${totalCount} emails totales`,
      );
      return totalCount;
    } catch (error) {
      this.logger.error('❌ Error obteniendo conteo exacto de emails:', error);
      // En caso de error, intentar al menos con resultSizeEstimate
      try {
        const fallbackResponse = await gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: 1,
        });
        const estimate = fallbackResponse.data.resultSizeEstimate || 0;
        this.logger.warn(
          `⚠️ Usando estimado como fallback: ${estimate} emails`,
        );
        return estimate;
      } catch {
        return 0;
      }
    }
  }

  private async getEmailsForPage(
    gmail: gmail_v1.Gmail,
    query: string,
    targetPage: number,
    limit: number,
  ): Promise<EmailMetadata[]> {
    let currentPage = 1;
    let nextPageToken: string | undefined = undefined;
    let targetEmails: GmailMessage[] = [];

    while (currentPage <= targetPage) {
      const messagesResponse = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: limit,
        pageToken: nextPageToken,
      });

      const messages = messagesResponse.data.messages || [];

      if (currentPage === targetPage) {
        targetEmails = messages;
        break;
      }

      nextPageToken = messagesResponse.data.nextPageToken || undefined;
      if (!nextPageToken) break;

      currentPage++;
    }

    const emails = await Promise.all(
      targetEmails.map(async (message): Promise<EmailMetadata | null> => {
        if (!message.id) return null;

        try {
          const emailDetail = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'metadata',
            metadataHeaders: ['Subject', 'From', 'Date', 'To'],
          });

          return this.extractEmailMetadata(emailDetail.data);
        } catch {
          return null;
        }
      }),
    );

    return emails.filter((email): email is EmailMetadata => email !== null);
  }

  private extractEmailMetadata(emailData: GmailMessage): EmailMetadata | null {
    try {
      if (!emailData.id) return null;

      const payload = emailData.payload;
      const headers = payload?.headers || [];

      const subject = this.getHeader(headers, 'Subject') || 'Sin asunto';
      const from = this.getHeader(headers, 'From') || '';
      const date = this.getHeader(headers, 'Date') || new Date().toISOString();

      const fromMatch = RegExp(/^(.+?)\s*<(.+?)>$/).exec(from) || [
        null,
        from,
        from,
      ];
      const fromName = fromMatch[1]?.trim().replace(/"/g, '') || '';
      const fromEmail = fromMatch[2]?.trim() || from;

      return {
        id: emailData.id,
        messageId: emailData.id,
        subject,
        fromEmail,
        fromName,
        receivedDate: new Date(date),
        isRead: !emailData.labelIds?.includes('UNREAD'),
        hasAttachments: this.hasAttachments(payload),
      };
    } catch {
      return null;
    }
  }

  private extractFullEmailData(emailData: GmailMessage): EmailDetail | null {
    try {
      if (!emailData.id) return null;

      const payload = emailData.payload;
      const headers = payload?.headers || [];

      const subject = this.getHeader(headers, 'Subject') || 'Sin asunto';
      const from = this.getHeader(headers, 'From') || '';
      const to = this.getHeader(headers, 'To') || '';
      const date = this.getHeader(headers, 'Date') || new Date().toISOString();

      const fromMatch = RegExp(/^(.+?)\s*<(.+?)>$/).exec(from) || [
        null,
        from,
        from,
      ];
      const fromName = fromMatch[1]?.trim().replace(/"/g, '') || '';
      const fromEmail = fromMatch[2]?.trim() || from;

      const bodyData = this.extractBody(payload);

      return {
        id: emailData.id,
        messageId: emailData.id,
        subject,
        fromEmail,
        fromName,
        toEmails: [to],
        bodyText: bodyData.text,
        bodyHtml: bodyData.html,
        receivedDate: new Date(date),
        isRead: !emailData.labelIds?.includes('UNREAD'),
        hasAttachments: this.hasAttachments(payload),
      };
    } catch {
      return null;
    }
  }

  private getHeader(headers: GmailHeader[], name: string): string {
    const header = headers.find(
      (h) => h.name?.toLowerCase() === name.toLowerCase(),
    );
    return header?.value || '';
  }

  private extractBody(payload: GmailPayload | null | undefined): EmailBodyData {
    let textBody = '';
    let htmlBody = '';

    if (payload?.body?.data) {
      const mimeType = payload.mimeType || '';
      const bodyData = Buffer.from(payload.body.data, 'base64').toString(
        'utf-8',
      );

      if (mimeType.includes('text/plain')) {
        textBody = bodyData;
      } else if (mimeType.includes('text/html')) {
        htmlBody = bodyData;
      }
    } else if (payload?.parts) {
      payload.parts.forEach((part: GmailPayload) => {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          textBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/html' && part.body?.data) {
          htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      });
    }

    return { text: textBody, html: htmlBody };
  }

  private hasAttachments(payload: GmailPayload | null | undefined): boolean {
    if (payload?.parts) {
      return payload.parts.some(
        (part: GmailPayload) => part.filename && part.filename.length > 0,
      );
    }
    return false;
  }

  /**
   * 💤 Helper para pausas en sync progresivo
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ================================
  // 🎮 MÉTODO PARA CAMBIAR EL MODO
  // ================================

  /**
   * 🎮 Cambiar entre modo BD y API dinámicamente
   */
  toggleDatabaseMode(): { mode: string; USE_DATABASE: boolean } {
    this.USE_DATABASE = !this.USE_DATABASE;
    const mode = this.USE_DATABASE ? 'DATABASE' : 'API';
    this.logger.log(`🎮 Modo cambiado a: ${mode}`);
    return { mode, USE_DATABASE: this.USE_DATABASE };
  }

  /**
   * 🎮 Obtener el modo actual
   */
  getCurrentMode(): { mode: string; USE_DATABASE: boolean } {
    const mode = this.USE_DATABASE ? 'DATABASE' : 'API';
    return { mode, USE_DATABASE: this.USE_DATABASE };
  }

  /**
   * 🎮 Establecer modo específico
   */
  setMode(useDatabase: boolean): { mode: string; USE_DATABASE: boolean } {
    this.USE_DATABASE = useDatabase;
    const mode = this.USE_DATABASE ? 'DATABASE' : 'API';
    this.logger.log(`🎮 Modo establecido a: ${mode}`);
    return { mode, USE_DATABASE: this.USE_DATABASE };
  }
}