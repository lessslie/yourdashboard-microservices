// ms-yourdashboard-email/src/emails/emails.service.ts
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { google, gmail_v1 } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import { 
  DatabaseService, 
  EmailMetadataDB, 
  EmailSearchFilters 
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
  EmailServiceError
} from './interfaces/email.interfaces';

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly syncService: SyncService
  ) {}

  // ================================
  // 🔄 SINCRONIZACIÓN - MÉTODOS ACTUALIZADOS
  // ================================

  /**
   * 🔄 Endpoint para sincronizar emails manualmente - ACTUALIZADO
   */
  async syncEmailsWithToken(
    accessToken: string,
    cuentaGmailId: string, // 🎯 Cambio: cuentaGmailId en lugar de userId
    options: SyncOptions = {}
  ) {
    try {
      this.logger.log(`🔄 🎉 INICIANDO SINCRONIZACIÓN para cuenta Gmail ${cuentaGmailId}`);
      
      const cuentaGmailIdNum = parseInt(cuentaGmailId);
      
      if (isNaN(cuentaGmailIdNum)) {
        throw new Error('cuentaGmailId debe ser un número válido');
      }
      
      const syncStats = await this.syncService.syncEmailsFromGmail(
        accessToken, 
        cuentaGmailIdNum, 
        options
      );

      this.logger.log(`✅ Sincronización completada: ${syncStats.emails_nuevos} nuevos, ${syncStats.emails_actualizados} actualizados`);

      return {
        success: true,
        message: 'Sincronización completada exitosamente',
        stats: syncStats
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
    limit: number = 10
  ): Promise<EmailListResponse> {
    try {
      this.logger.log(`📧 🎯 INBOX GMAIL-LIKE para cuenta Gmail ${cuentaGmailId} - Página ${page}`);

      const cuentaGmailIdNum = parseInt(cuentaGmailId);
      
      if (isNaN(cuentaGmailIdNum)) {
        throw new Error('cuentaGmailId debe ser un número válido');
      }

      // 1️⃣ ESTRATEGIA GMAIL-LIKE: Siempre intentar Gmail API primero
      try {
        this.logger.log(`📡 Consultando Gmail API directamente (estrategia Gmail-like)`);
        const gmailResult = await this.getInboxFromGmailAPI(accessToken, cuentaGmailId, page, limit);
        
        // 2️⃣ Iniciar sync en background si es necesario (NO BLOQUEA)
        this.checkAndStartBackgroundSync(accessToken, cuentaGmailIdNum).catch(err => {
          this.logger.debug(`Background sync error (ignorado):`, err);
        });
        
        this.logger.log(`✅ Inbox obtenido desde Gmail API: ${gmailResult.emails.length} emails`);
        return gmailResult;
        
      } catch {
        this.logger.warn(`⚠️ Gmail API no disponible, usando BD local como fallback`);
        
        // 3️⃣ FALLBACK: Si Gmail API falla, intentar BD local
        const dbResult = await this.databaseService.getEmailsPaginated(
          cuentaGmailIdNum, 
          page, 
          limit
        );

        if (dbResult.total > 0) {
          this.logger.log(`💾 FALLBACK exitoso: ${dbResult.emails.length} emails desde BD local`);
          
          const emails = dbResult.emails.map(this.convertDBToEmailMetadata);
          const totalPages = Math.ceil(dbResult.total / limit);
          
          return {
            emails,
            total: dbResult.total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
          };
        } else {
          this.logger.log(`📭 BD local vacía, retornando respuesta vacía`);
          
          return {
            emails: [],
            total: 0,
            page,
            limit,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false
          };
        }
      }

    } catch (error) {
      this.logger.error('❌ Error obteniendo inbox:', error);
      const emailError = error as EmailServiceError;
      throw new Error('Error al consultar Gmail: ' + emailError.message);
    }
  }

  /**
   * 🔄 Verificar y comenzar sincronización en background
   * NO BLOQUEA - Se ejecuta en background
   */
  private async checkAndStartBackgroundSync(accessToken: string, cuentaGmailId: number): Promise<void> {
    try {
      // Verificar si ya hay emails sincronizados
      const lastSync = await this.databaseService.getLastSyncedEmail(cuentaGmailId);
      
      if (!lastSync) {
        this.logger.log(`🔄 Cuenta nueva detectada, iniciando sync background para cuenta ${cuentaGmailId}`);
        
        // Sincronización progresiva en background
        // NO usar await aquí para no bloquear
        this.performProgressiveBackgroundSync(accessToken, cuentaGmailId);
      } else {
        // Verificar si necesita actualización (más de 1 hora desde último sync)
        const unaHoraAtras = new Date(Date.now() - 60 * 60 * 1000);
        
        if (lastSync.fecha_sincronizado && lastSync.fecha_sincronizado < unaHoraAtras) {
          this.logger.log(`🔄 Sync desactualizado, iniciando sync incremental background`);
          
          // Sync incremental en background
          this.syncService.syncIncrementalEmails(accessToken, cuentaGmailId, 50)
            .then(result => {
              this.logger.log(`✅ Sync incremental completado: ${result.emails_nuevos} nuevos`);
            })
            .catch(err => {
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
  private async performProgressiveBackgroundSync(accessToken: string, cuentaGmailId: number): Promise<void> {
    try {
      // Etapa 1: Primeros 100 emails más recientes
      await this.syncService.syncIncrementalEmails(accessToken, cuentaGmailId, 100);
      this.logger.log(`📧 Etapa 1 completada: 100 emails recientes sincronizados`);
      
      // Pausa de 5 segundos
      await this.sleep(5000);
      
      // Etapa 2: Siguientes 200 emails
      await this.syncService.syncIncrementalEmails(accessToken, cuentaGmailId, 200);
      this.logger.log(`📧 Etapa 2 completada: 200 emails adicionales`);
      
      // Pausa de 10 segundos
      await this.sleep(10000);
      
      // Etapa 3: Siguientes 500 emails (si el usuario sigue activo)
      await this.syncService.syncIncrementalEmails(accessToken, cuentaGmailId, 500);
      this.logger.log(`📧 Etapa 3 completada: 500 emails adicionales`);
      
      this.logger.log(`✅ Sincronización progresiva completada para cuenta ${cuentaGmailId}`);
      
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
    limit: number = 10
  ): Promise<EmailListResponse> {
    try {
      this.logger.log(`🔍 🎯 BÚSQUEDA GMAIL-LIKE "${searchTerm}" para cuenta Gmail ${cuentaGmailId}`);

      const cuentaGmailIdNum = parseInt(cuentaGmailId);

      if (isNaN(cuentaGmailIdNum)) {
        throw new Error('cuentaGmailId debe ser un número válido');
      }

      // 1️⃣ ESTRATEGIA GMAIL-LIKE: Siempre intentar Gmail API primero
      try {
        this.logger.log(`📡 Buscando en Gmail API directamente`);
        return await this.searchEmailsFromGmailAPI(accessToken, cuentaGmailId, searchTerm, page, limit);
        
      } catch  {
        this.logger.warn(`⚠️ Gmail API no disponible para búsqueda, usando BD local`);
        
        // 2️⃣ FALLBACK: BD local
        const filters: EmailSearchFilters = {
          busqueda_texto: searchTerm.trim()
        };

        const searchResult = await this.databaseService.searchEmailsInDB(
          cuentaGmailIdNum,
          filters,
          page,
          limit
        );

        this.logger.log(`💾 FALLBACK búsqueda BD: ${searchResult.emails.length} resultados`);

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
          searchTerm
        };
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
  async getInboxStatsWithToken(accessToken: string, cuentaGmailId: string): Promise<EmailStats> {
    try {
      this.logger.log(`📊 🎯 ESTADÍSTICAS GMAIL-LIKE para cuenta Gmail ${cuentaGmailId}`);
      
      const cuentaGmailIdNum = parseInt(cuentaGmailId);
      

      if (isNaN(cuentaGmailIdNum)) {
        throw new Error('cuentaGmailId debe ser un número válido');
      }

      // 1️⃣ ESTRATEGIA GMAIL-LIKE: Gmail API primero
      try {
        this.logger.log(`📡 Obteniendo stats desde Gmail API`);
        return await this.getStatsFromGmailAPI(accessToken, cuentaGmailId);
        
      } catch {
        this.logger.warn(`⚠️ Gmail API no disponible para stats, usando BD local`);
        
        // 2️⃣ FALLBACK: BD local
        const dbStats = await this.databaseService.getEmailStatsFromDB(cuentaGmailIdNum);
        
        if (dbStats.total_emails > 0) {
          this.logger.log(`💾 FALLBACK stats desde BD: ${dbStats.total_emails} emails total`);
          
          return {
            totalEmails: dbStats.total_emails,
            unreadEmails: dbStats.emails_no_leidos,
            readEmails: dbStats.emails_leidos
          };
        } else {
          // Si no hay datos, retornar ceros
          return {
            totalEmails: 0,
            unreadEmails: 0,
            readEmails: 0
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
  async getEmailByIdWithToken(
    accessToken: string, 
    cuentaGmailId: string,
    messageId: string
  ): Promise<EmailDetail> {
    this.logger.log(`📧 Obteniendo email específico ${messageId} desde Gmail API para cuenta ${cuentaGmailId}`);
    
    // Este siempre va a Gmail API porque necesitamos el contenido completo
    return await this.getEmailFromGmailAPI(accessToken, cuentaGmailId, messageId);
  }

  // ================================
  // 🔧 MÉTODOS PRIVADOS - CONVERSIÓN Y FALLBACKS
  // ================================

  /**
   * 🔄 Convertir EmailMetadataDB → EmailMetadata (para compatibilidad API)
   */
  private convertDBToEmailMetadata(dbEmail: EmailMetadataDB): EmailMetadata {
    return {
      id: dbEmail.gmail_message_id,
      messageId: dbEmail.gmail_message_id,
      subject: dbEmail.asunto || 'Sin asunto',
      fromEmail: dbEmail.remitente_email || '',
      fromName: dbEmail.remitente_nombre || '',
      receivedDate: dbEmail.fecha_recibido || new Date(),
      isRead: dbEmail.esta_leido,
      hasAttachments: dbEmail.tiene_adjuntos
    };
  }

  /**
   * 📧 Método original de inbox (Gmail API)
   */
  private async getInboxFromGmailAPI(
    accessToken: string,
    cuentaGmailId: string,
    page: number,
    limit: number
  ): Promise<EmailListResponse> {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const realTotalEmails = await this.getRealEmailCount(gmail, 'in:inbox');
    const emailsForPage = await this.getEmailsForPage(gmail, 'in:inbox', page, limit);
    const totalPages = Math.ceil(realTotalEmails / limit);

    return {
      emails: emailsForPage,
      total: realTotalEmails,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
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
    limit: number
  ): Promise<EmailListResponse> {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const gmailQuery = `in:inbox ${searchTerm}`;
    const realTotalEmails = await this.getRealEmailCount(gmail, gmailQuery);
    const emailsForPage = await this.getEmailsForPage(gmail, gmailQuery, page, limit);
    const totalPages = Math.ceil(realTotalEmails / limit);

    return {
      emails: emailsForPage,
      total: realTotalEmails,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      searchTerm
    };
  }

  /**
   * 📊 Método original de stats (Gmail API)
   */
 private async getStatsFromGmailAPI(accessToken: string, cuentaGmailId: string): Promise<EmailStats> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  console.log('🔍 DEBUG - Getting stats for cuenta:', cuentaGmailId);

  // 🎯 USAR getRealEmailCount EN LUGAR DE resultSizeEstimate
  const [totalEmails, unreadEmails] = await Promise.all([
    this.getRealEmailCount(gmail, 'in:inbox'),
    this.getRealEmailCount(gmail, 'in:inbox is:unread')
  ]);

  console.log('🔍 DEBUG - Stats REALES:', { 
    totalEmails,
    unreadEmails,
    cuentaGmailId,
    accessToken: accessToken ? 'presente' : 'faltante'
  });

  return {
    totalEmails,
    unreadEmails,
    readEmails: totalEmails - unreadEmails
  };
}

  /**
   * 📧 Obtener email específico desde Gmail API
   */
  private async getEmailFromGmailAPI(
    accessToken: string,
    userId: string,
    messageId: string
  ): Promise<EmailDetail> {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const emailDetail = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    const extractedData = this.extractFullEmailData(emailDetail.data);
    
    if (!extractedData) {
      throw new NotFoundException(`Email con ID ${messageId} no pudo ser procesado`);
    }

    return extractedData;
  }

  
/**
 * 🌍 BÚSQUEDA GLOBAL - Buscar en TODAS las cuentas Gmail del usuario
 * 🎯 NUEVO: Método principal de búsqueda unificada
 */
async searchAllAccountsEmailsWithUserId(
  userId: string,
  searchTerm: string,
  page: number,
  limit: number
): Promise<EmailListResponse & { accountsSearched: string[] }> {
  try {
    this.logger.log(`🌍 🎯 BÚSQUEDA GLOBAL "${searchTerm}" para usuario principal ${userId}`);

    // 🎯 VALIDAR USERID
    const userIdNum = parseInt(userId, 10);
    if (isNaN(userIdNum)) {
      throw new Error('userId debe ser un número válido');
    }

    // 1️⃣ OBTENER TODAS LAS CUENTAS GMAIL DEL USUARIO
    const cuentasGmail = await this.databaseService.obtenerCuentasGmailUsuario(userIdNum);
    
    if (!cuentasGmail || cuentasGmail.length === 0) {
      this.logger.warn(`⚠️ Usuario ${userId} no tiene cuentas Gmail conectadas`);
      return {
        emails: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        searchTerm,
        accountsSearched: []
      };
    }

    this.logger.log(`📧 Usuario ${userId} tiene ${cuentasGmail.length} cuentas Gmail conectadas`);

    // 2️⃣ BUSCAR EN PARALELO EN TODAS LAS CUENTAS
    const searchPromises = cuentasGmail.map(async (cuenta) => {
      try {
        this.logger.log(`🔍 Buscando en cuenta: ${cuenta.email_gmail} (ID: ${cuenta.id})`);
        
        // 🎯 OBTENER TOKEN PARA ESTA CUENTA ESPECÍFICA
        const accessToken = await this.getValidTokenForAccount(cuenta.id);
        
        // 🎯 BUSCAR EN ESTA CUENTA (reutilizamos el método existente)
        const resultadoCuenta = await this.searchEmailsWithToken(
          accessToken,
          cuenta.id.toString(),
          searchTerm,
          1, // Siempre página 1 para cada cuenta
          1000 // Más resultados por cuenta para unificar después
        );

        // 🎯 AGREGAR INFO DE LA CUENTA A CADA EMAIL
        const emailsConCuenta = resultadoCuenta.emails.map(email => ({
          ...email,
          sourceAccount: cuenta.email_gmail,
          sourceAccountId: cuenta.id
        }));

        this.logger.log(`✅ Cuenta ${cuenta.email_gmail}: ${emailsConCuenta.length} resultados`);

        return {
          cuenta: cuenta.email_gmail,
          emails: emailsConCuenta,
          total: resultadoCuenta.total
        };

      } catch (error) {
        this.logger.warn(`⚠️ Error buscando en cuenta ${cuenta.email_gmail}:`, error);
        
        // 🎯 FALLBACK: Buscar en BD local para esta cuenta
        try {
          this.logger.log(`💾 FALLBACK BD local para cuenta ${cuenta.email_gmail}`);
          
          const filters = {
            busqueda_texto: searchTerm.trim()
          };

          const fallbackResult = await this.databaseService.searchEmailsInDB(
            cuenta.id,
            filters,
            1,
            100
          );

          const emailsFromDB = fallbackResult.emails.map(this.convertDBToEmailMetadata).map(email => ({
            ...email,
            sourceAccount: cuenta.email_gmail,
            sourceAccountId: cuenta.id
          }));

          this.logger.log(`💾 FALLBACK exitoso: ${emailsFromDB.length} resultados desde BD`);

          return {
            cuenta: cuenta.email_gmail,
            emails: emailsFromDB,
            total: fallbackResult.total
          };

        } catch (fallbackError) {
          this.logger.error(`❌ FALLBACK falló para cuenta ${cuenta.email_gmail}:`, fallbackError);
          return {
            cuenta: cuenta.email_gmail,
            emails: [],
            total: 0
          };
        }
      }
    });

    // 3️⃣ ESPERAR TODOS LOS RESULTADOS EN PARALELO
    const resultadosPorCuenta = await Promise.all(searchPromises);

    // 4️⃣ UNIFICAR Y COMBINAR TODOS LOS EMAILS
    const todosLosEmails = resultadosPorCuenta
      .filter(resultado => resultado.emails.length > 0)
      .flatMap(resultado => resultado.emails);

    // 5️⃣ ORDENAR GLOBALMENTE POR FECHA (MÁS RECIENTES PRIMERO)
    todosLosEmails.sort((a, b) => {
      const fechaA = new Date(a.receivedDate).getTime();
      const fechaB = new Date(b.receivedDate).getTime();
      return fechaB - fechaA; // Descendente (más recientes primero)
    });

    // 6️⃣ APLICAR PAGINACIÓN GLOBAL
    const totalEmails = todosLosEmails.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const emailsPaginados = todosLosEmails.slice(startIndex, endIndex);

    // 7️⃣ CALCULAR METADATOS DE PAGINACIÓN
    const totalPages = Math.ceil(totalEmails / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // 8️⃣ OBTENER LISTA DE CUENTAS BUSCADAS
    const accountsSearched = resultadosPorCuenta.map(resultado => resultado.cuenta);

    this.logger.log(`✅ BÚSQUEDA GLOBAL COMPLETADA:`);
    this.logger.log(`   📊 Total emails encontrados: ${totalEmails}`);
    this.logger.log(`   📧 Cuentas buscadas: ${accountsSearched.join(', ')}`);
    this.logger.log(`   📄 Página ${page}/${totalPages} (${emailsPaginados.length} emails)`);

    return {
      emails: emailsPaginados,
      total: totalEmails,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPreviousPage,
      searchTerm,
      accountsSearched
    };

  } catch (error) {
    this.logger.error('❌ Error en búsqueda global:', error);
    const emailError = error as EmailServiceError;
    throw new Error('Error en búsqueda global: ' + emailError.message);
  }
}


// ================================
// 📥 INBOX UNIFICADO - TODAS LAS CUENTAS GMAIL
// ================================

/**
 *  cantidad de emails total real de Gmail API (no de BD local)
 */
async getInboxAllAccountsWithUserId(
  userId: string,
  page: number = 1,
  limit: number = 10
): Promise<EmailListResponse & { accountsLoaded: string[] }> {
  try {
    this.logger.log(`📥 🎯 INBOX UNIFICADO para usuario principal ${userId}`);

    // 🎯 VALIDAR USERID
    const userIdNum = parseInt(userId, 10);
    if (isNaN(userIdNum)) {
      throw new Error('userId debe ser un número válido');
    }

    // 1️⃣ OBTENER TODAS LAS CUENTAS GMAIL DEL USUARIO
    const cuentasGmail = await this.databaseService.obtenerCuentasGmailUsuario(userIdNum);
    
    if (!cuentasGmail || cuentasGmail.length === 0) {
      this.logger.warn(`⚠️ Usuario ${userId} no tiene cuentas Gmail conectadas`);
      return {
        emails: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        accountsLoaded: []
      };
    }

    this.logger.log(`📧 Usuario ${userId} tiene ${cuentasGmail.length} cuentas Gmail para inbox unificado`);

    // 2️⃣ 🆕 OBTENER TOTAL REAL DE TODAS LAS CUENTAS EN PARALELO
    this.logger.log(`📊 Obteniendo totales reales de Gmail API...`);
    const totalRealPromises = cuentasGmail.map(async (cuenta) => {
      try {
        const accessToken = await this.getValidTokenForAccount(cuenta.id);
        const stats = await this.getStatsFromGmailAPI(accessToken, cuenta.id.toString());
        this.logger.log(`✅ Cuenta ${cuenta.email_gmail}: ${stats.totalEmails} emails totales`);
        return stats.totalEmails;
      } catch (error) {
        this.logger.warn(`⚠️ No se pudo obtener total real de ${cuenta.email_gmail}:`, error);
        return 0; // Si una cuenta falla, contribuye con 0 al total
      }
    });

    // Esperar todos los totales reales
    const totalesReales = await Promise.all(totalRealPromises);
    const totalRealGlobal = totalesReales.reduce((sum, total) => sum + total, 0);
    
    this.logger.log(`🔥 TOTAL REAL GLOBAL: ${totalRealGlobal} emails de todas las cuentas`);

    // 3️⃣ OBTENER INBOX DE CADA CUENTA EN PARALELO (PARA MOSTRAR)
    const inboxPromises = cuentasGmail.map(async (cuenta) => {
      try {
        this.logger.log(`📥 Obteniendo inbox de cuenta: ${cuenta.email_gmail} (ID: ${cuenta.id})`);
        
        // 🎯 OBTENER TOKEN PARA ESTA CUENTA ESPECÍFICA
        const accessToken = await this.getValidTokenForAccount(cuenta.id);
        
        // 🎯 OBTENER INBOX DE ESTA CUENTA
        const inboxCuenta = await this.getInboxWithToken(
          accessToken,
          cuenta.id.toString(),
          1, // Siempre página 1 para cada cuenta
          100 // Más resultados por cuenta para unificar después
        );

        // 🎯 AGREGAR INFO DE LA CUENTA A CADA EMAIL
        const emailsConCuenta = inboxCuenta.emails.map(email => ({
          ...email,
          sourceAccount: cuenta.email_gmail,
          sourceAccountId: cuenta.id
        }));

        this.logger.log(`✅ Inbox cuenta ${cuenta.email_gmail}: ${emailsConCuenta.length} emails obtenidos`);

        return {
          cuenta: cuenta.email_gmail,
          emails: emailsConCuenta,
          total: inboxCuenta.total // Este es el total de la cuenta individual
        };

      } catch (error) {
        this.logger.warn(`⚠️ Error obteniendo inbox de cuenta ${cuenta.email_gmail}:`, error);
        
        // 🎯 FALLBACK: Obtener emails de BD local para esta cuenta
        try {
          this.logger.log(`💾 FALLBACK BD local para inbox de cuenta ${cuenta.email_gmail}`);
          
          const fallbackResult = await this.databaseService.getEmailsPaginated(
            cuenta.id,
            1,
            100,
            false // Todos los emails, no solo no leídos
          );

          const emailsFromDB = fallbackResult.emails.map(this.convertDBToEmailMetadata).map(email => ({
            ...email,
            sourceAccount: cuenta.email_gmail,
            sourceAccountId: cuenta.id
          }));

          this.logger.log(`💾 FALLBACK exitoso: ${emailsFromDB.length} emails desde BD`);

          return {
            cuenta: cuenta.email_gmail,
            emails: emailsFromDB,
            total: fallbackResult.total
          };

        } catch (fallbackError) {
          this.logger.error(`❌ FALLBACK falló para cuenta ${cuenta.email_gmail}:`, fallbackError);
          return {
            cuenta: cuenta.email_gmail,
            emails: [],
            total: 0
          };
        }
      }
    });

    // 4️⃣ ESPERAR TODOS LOS RESULTADOS EN PARALELO
    const resultadosPorCuenta = await Promise.all(inboxPromises);

    // 5️⃣ UNIFICAR Y COMBINAR TODOS LOS EMAILS
    const todosLosEmails = resultadosPorCuenta
      .filter(resultado => resultado.emails.length > 0)
      .flatMap(resultado => resultado.emails);

    // 6️⃣ ORDENAR GLOBALMENTE POR FECHA (MÁS RECIENTES PRIMERO)
    todosLosEmails.sort((a, b) => {
      const fechaA = new Date(a.receivedDate).getTime();
      const fechaB = new Date(b.receivedDate).getTime();
      return fechaB - fechaA; // Descendente (más recientes primero)
    });

    // 7️⃣ APLICAR PAGINACIÓN GLOBAL
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const emailsPaginados = todosLosEmails.slice(startIndex, endIndex);

    // 8️⃣ CALCULAR METADATOS DE PAGINACIÓN CON TOTAL REAL
    const totalPages = Math.ceil(totalRealGlobal / limit); // ← 🔥 USANDO TOTAL REAL
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // 9️⃣ OBTENER LISTA DE CUENTAS CARGADAS
    const accountsLoaded = resultadosPorCuenta.map(resultado => resultado.cuenta);

    this.logger.log(`✅ INBOX UNIFICADO COMPLETADO:`);
    this.logger.log(`   🔥 Total REAL global: ${totalRealGlobal} emails`);
    this.logger.log(`   📧 Emails mostrados: ${emailsPaginados.length} de ${todosLosEmails.length} obtenidos`);
    this.logger.log(`   📧 Cuentas cargadas: ${accountsLoaded.join(', ')}`);
    this.logger.log(`   📄 Página ${page}/${totalPages}`);

    return {
      emails: emailsPaginados,
      total: totalRealGlobal, // ← 🔥 TOTAL REAL DE GMAIL API
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPreviousPage,
      accountsLoaded
    };

  } catch (error) {
    this.logger.error('❌ Error en inbox unificado:', error);
    const emailError = error as EmailServiceError;
    throw new Error('Error en inbox unificado: ' + emailError.message);
  }
}

// ================================
// 🔧 MÉTODOS AUXILIARES PARA BÚSQUEDA GLOBAL
// ================================

/**
 * 🔑 Obtener token válido para una cuenta específica
 * 🎯 NUEVO: Helper para obtener tokens por cuenta
 */
private async getValidTokenForAccount(cuentaGmailId: number): Promise<string> {
  try {
    // 🎯 CONSULTAR A MS-AUTH PARA OBTENER TOKEN
    const response = await fetch(`http://localhost:3001/tokens/gmail/${cuentaGmailId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error obteniendo token: ${response.status}`);
    }

    const tokenData = await response.json();

    if (!tokenData.success || !tokenData.accessToken) {
      throw new Error('Token no válido recibido de MS-Auth');
    }

    return tokenData.accessToken;

  } catch (error) {
    this.logger.error(`❌ Error obteniendo token para cuenta ${cuentaGmailId}:`, error);
    throw new Error(`No se pudo obtener token para cuenta Gmail ${cuentaGmailId}`);
  }
}

  // ================================
  // 🔧 MÉTODOS AUXILIARES
  // ================================

  private async getRealEmailCount(gmail: gmail_v1.Gmail, query: string = 'in:inbox'): Promise<number> {
    try {
      this.logger.log(`🔢 Iniciando conteo EXACTO de emails con query: "${query}"`);
      
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
          fields: 'messages/id,nextPageToken' // Solo necesitamos IDs para contar
        });

        const messages = response.data.messages || [];
        totalCount += messages.length;
        
        // Log de progreso cada 5 páginas
        if (pageNumber % 5 === 0) {
          this.logger.log(`📊 Conteo en progreso: ${totalCount} emails encontrados...`);
        }
        
        nextPageToken = response.data.nextPageToken || undefined;
        pageNumber++;

        // Si no hay más mensajes, terminar
        if (messages.length === 0) {
          break;
        }

      } while (nextPageToken); // Continuar mientras haya más páginas

      this.logger.log(`✅ Conteo EXACTO completado: ${totalCount} emails totales`);
      return totalCount;
      
    } catch (error) {
      this.logger.error('❌ Error obteniendo conteo exacto de emails:', error);
      // En caso de error, intentar al menos con resultSizeEstimate
      try {
        const fallbackResponse = await gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: 1
        });
        const estimate = fallbackResponse.data.resultSizeEstimate || 0;
        this.logger.warn(`⚠️ Usando estimado como fallback: ${estimate} emails`);
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
    limit: number
  ): Promise<EmailMetadata[]> {
    let currentPage = 1;
    let nextPageToken: string | undefined = undefined;
    let targetEmails: GmailMessage[] = [];

    while (currentPage <= targetPage) {
      const messagesResponse = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: limit,
        pageToken: nextPageToken
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
            metadataHeaders: ['Subject', 'From', 'Date', 'To']
          });
          
          return this.extractEmailMetadata(emailDetail.data);
        } catch {
          return null;
        }
      })
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

      const fromMatch = RegExp(/^(.+?)\s*<(.+?)>$/).exec(from) || [null, from, from];
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
        hasAttachments: this.hasAttachments(payload)
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

      const fromMatch = RegExp(/^(.+?)\s*<(.+?)>$/).exec(from) || [null, from, from];
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
        hasAttachments: this.hasAttachments(payload)
      };
    } catch {
      return null;
    }
  }

  private getHeader(headers: GmailHeader[], name: string): string {
    const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
    return header?.value || '';
  }

  private extractBody(payload: GmailPayload | null | undefined): EmailBodyData {
    let textBody = '';
    let htmlBody = '';

    if (payload?.body?.data) {
      const mimeType = payload.mimeType || '';
      const bodyData = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      
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
      return payload.parts.some((part: GmailPayload) => 
        part.filename && part.filename.length > 0
      );
    }
    return false;
  }

  /**
   * 💤 Helper para pausas en sync progresivo
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}