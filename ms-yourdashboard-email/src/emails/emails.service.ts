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

  /**
   * 🔄 Auto-sync inteligente (ejecuta en background si es necesario) - ACTUALIZADO
   */
  private async autoSyncIfNeeded(accessToken: string, cuentaGmailId: number): Promise<void> {
    try {
      const syncStats = await this.syncService.getSyncStats(cuentaGmailId);
      
      // ⏰ Verificar si necesita sync: no hay emails O último sync fue hace más de 1 hora
      const unaHoraAtras = new Date(Date.now() - 60 * 60 * 1000);
      const necesitaSync = !syncStats.ultimo_sync || syncStats.ultimo_sync < unaHoraAtras;
      
      if (necesitaSync && syncStats.total_emails_bd < 200) { // Solo si no hay muchos emails ya
        this.logger.log(`🔄 ⚡ AUTO-SYNC activado para cuenta Gmail ${cuentaGmailId}`);
        
        // 🎯 Sync incremental en background (no await para no bloquear)
        this.syncService.syncIncrementalEmails(accessToken, cuentaGmailId, 30)
          .then(result => {
            this.logger.log(`✅ Auto-sync completado: ${result.emails_nuevos} nuevos`);
          })
          .catch(error => {
            this.logger.error('❌ Error en auto-sync:', error);
          });
      }
      
    } catch  {
      this.logger.debug('⚠️ Auto-sync check failed, continuando sin sincronizar');
    }
  }

  // ================================
  // 📧 INBOX - MÉTODO HÍBRIDO INTELIGENTE - ACTUALIZADO
  // ================================

  /**
   * 📧 INBOX HÍBRIDO - BD local primero, Gmail API como fallback - ACTUALIZADO
   */
  async getInboxWithToken(
    accessToken: string, 
    cuentaGmailId: string, // 🎯 Cambio: cuentaGmailId en lugar de userId
    page: number = 1,
    limit: number = 10
  ): Promise<EmailListResponse> {
    try {
      this.logger.log(`📧 🎯 INBOX HÍBRIDO para cuenta Gmail ${cuentaGmailId} - Página ${page}`);

      const cuentaGmailIdNum = parseInt(cuentaGmailId);
      
      if (isNaN(cuentaGmailIdNum)) {
        throw new Error('cuentaGmailId debe ser un número válido');
      }

      // 1️⃣ INTENTAR DESDE BD LOCAL PRIMERO (súper rápido)
      try {
        const dbResult = await this.databaseService.getEmailsPaginated(
          cuentaGmailIdNum, 
          page, 
          limit
        );

        // ✅ Si tenemos emails en BD, usarlos
        if (dbResult.total > 0) {
          this.logger.log(`⚡ 🎉 INBOX desde BD LOCAL: ${dbResult.emails.length} emails (total: ${dbResult.total})`);
          
          // 🔄 Auto-sync en background si es necesario (no bloquea)
          void this.autoSyncIfNeeded(accessToken, cuentaGmailIdNum);

          // 🔄 Convertir formato BD → formato API
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
          this.logger.log(`📭 BD local vacía, intentando sync inicial...`);
          
          // 🔄 Si BD está vacía, hacer sync inicial (bloquea esta vez)
          await this.syncService.syncIncrementalEmails(accessToken, cuentaGmailIdNum, 50);
          
          // 🔄 Intentar de nuevo desde BD
          const dbResultAfterSync = await this.databaseService.getEmailsPaginated(
            cuentaGmailIdNum, 
            page, 
            limit
          );
          
          if (dbResultAfterSync.total > 0) {
            this.logger.log(`🎉 Sync inicial exitoso: ${dbResultAfterSync.total} emails`);
            
            const emails = dbResultAfterSync.emails.map(this.convertDBToEmailMetadata);
            const totalPages = Math.ceil(dbResultAfterSync.total / limit);
            
            return {
              emails,
              total: dbResultAfterSync.total,
              page,
              limit,
              totalPages,
              hasNextPage: page < totalPages,
              hasPreviousPage: page > 1
            };
          }
        }
      } catch (dbError) {
        this.logger.warn(`⚠️ Error consultando BD, fallback a Gmail API:`, dbError);
      }

      // 2️⃣ FALLBACK: GMAIL API (método original)
      this.logger.log(`📡 INBOX desde Gmail API (fallback)`);
      return await this.getInboxFromGmailAPI(accessToken, cuentaGmailId, page, limit);

    } catch (error) {
      this.logger.error('❌ Error obteniendo inbox:', error);
      const emailError = error as EmailServiceError;
      throw new Error('Error al consultar Gmail: ' + emailError.message);
    }
  }

  // ================================
  // 🔍 BÚSQUEDA - DESDE BD LOCAL (SÚPER RÁPIDA) - ACTUALIZADA
  // ================================

  /**
   * 🔍 BÚSQUEDA HÍBRIDA - BD local primero (súper rápida) - ACTUALIZADA
   */
  async searchEmailsWithToken(
    accessToken: string,
    cuentaGmailId: string, // 🎯 Cambio: cuentaGmailId en lugar de userId
    searchTerm: string,
    page: number = 1,
    limit: number = 10
  ): Promise<EmailListResponse> {
    try {
      this.logger.log(`🔍 🎯 BÚSQUEDA HÍBRIDA "${searchTerm}" para cuenta Gmail ${cuentaGmailId}`);

      const cuentaGmailIdNum = parseInt(cuentaGmailId);

      if (isNaN(cuentaGmailIdNum)) {
        throw new Error('cuentaGmailId debe ser un número válido');
      }

      // 1️⃣ BÚSQUEDA EN BD LOCAL (súper rápida con índices full-text)
      try {
        const filters: EmailSearchFilters = {
          busqueda_texto: searchTerm.trim()
        };

        const searchResult = await this.databaseService.searchEmailsInDB(
          cuentaGmailIdNum,
          filters,
          page,
          limit
        );

        this.logger.log(`⚡ 🎉 BÚSQUEDA desde BD: ${searchResult.emails.length} resultados (total: ${searchResult.total})`);

        // 🔄 Convertir formato BD → formato API
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

      } catch (dbError) {
        this.logger.warn(`⚠️ Error en búsqueda BD, fallback a Gmail:`, dbError);
      }

      // 2️⃣ FALLBACK: GMAIL API (método original)
      this.logger.log(`📡 BÚSQUEDA desde Gmail API (fallback)`);
      return await this.searchEmailsFromGmailAPI(accessToken, cuentaGmailId, searchTerm, page, limit);

    } catch (error) {
      this.logger.error('❌ Error en búsqueda:', error);
      const emailError = error as EmailServiceError;
      throw new Error('Error al buscar en Gmail: ' + emailError.message);
    }
  }

  // ================================
  // 📊 ESTADÍSTICAS - DESDE BD LOCAL (SÚPER RÁPIDO) - ACTUALIZADA
  // ================================

  /**
   * 📊 ESTADÍSTICAS HÍBRIDAS - BD local súper rápido - ACTUALIZADA
   */
  async getInboxStatsWithToken(accessToken: string, cuentaGmailId: string): Promise<EmailStats> {
    try {
      this.logger.log(`📊 🎯 ESTADÍSTICAS HÍBRIDAS para cuenta Gmail ${cuentaGmailId}`);
      
      const cuentaGmailIdNum = parseInt(cuentaGmailId);

      if (isNaN(cuentaGmailIdNum)) {
        throw new Error('cuentaGmailId debe ser un número válido');
      }

      // 1️⃣ INTENTAR DESDE BD LOCAL (súper rápido)
      try {
        const dbStats = await this.databaseService.getEmailStatsFromDB(cuentaGmailIdNum);
        
        if (dbStats.total_emails > 0) {
          this.logger.log(`⚡ 🎉 STATS desde BD: ${dbStats.total_emails} emails total`);
          
          return {
            totalEmails: dbStats.total_emails,
            unreadEmails: dbStats.emails_no_leidos,
            readEmails: dbStats.emails_leidos
          };
        }
      } catch (dbError) {
        this.logger.warn(`⚠️ Error en stats BD, fallback a Gmail:`, dbError);
      }

      // 2️⃣ FALLBACK: GMAIL API
      this.logger.log(`📡 STATS desde Gmail API (fallback)`);
      return await this.getStatsFromGmailAPI(accessToken, cuentaGmailId);

    } catch (error) {
      this.logger.error('❌ Error obteniendo estadísticas:', error);
      throw new Error('Error al obtener estadísticas de Gmail');
    }
  }

  // ================================
  // 📧 EMAIL ESPECÍFICO - SIEMPRE GMAIL API (para contenido completo) - ACTUALIZADO
  // ================================

  /**
   * 📧 EMAIL ESPECÍFICO - Gmail API (necesitamos el contenido completo) - ACTUALIZADO
   */
  async getEmailByIdWithToken(
    accessToken: string, 
    cuentaGmailId: string, // 🎯 Cambio: cuentaGmailId en lugar de userId
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
   * 📧 Método original de inbox (Gmail API) - CONSERVADO pero actualizado
   */
  private async getInboxFromGmailAPI(
    accessToken: string,
    cuentaGmailId: string, // 🎯 Cambio: cuentaGmailId en lugar de userId
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
   * 🔍 Método original de búsqueda (Gmail API) - CONSERVADO pero actualizado
   */
  private async searchEmailsFromGmailAPI(
    accessToken: string,
    cuentaGmailId: string, // 🎯 Cambio: cuentaGmailId en lugar de userId
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
   * 📊 Método original de stats (Gmail API) - CONSERVADO pero actualizado
   */
  private async getStatsFromGmailAPI(accessToken: string, cuentaGmailId: string): Promise<EmailStats> {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const [unreadResponse, totalResponse] = await Promise.all([
      gmail.users.messages.list({ userId: 'me', q: 'in:inbox is:unread' }),
      gmail.users.messages.list({ userId: 'me', q: 'in:inbox' })
    ]);

    const totalEmails = totalResponse.data.resultSizeEstimate || 0;
    const unreadEmails = unreadResponse.data.resultSizeEstimate || 0;

    return {
      totalEmails,
      unreadEmails,
      readEmails: totalEmails - unreadEmails
    };
  }

  /**
   * 📧 Obtener email específico desde Gmail API - CONSERVADO
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

  // ================================
  // 🔧 MÉTODOS AUXILIARES (CONSERVADOS) - SIN CAMBIOS
  // ================================

  private async getRealEmailCount(gmail: gmail_v1.Gmail, query: string = 'in:inbox'): Promise<number> {
    try {
      let totalCount = 0;
      let nextPageToken: string | undefined = undefined;
      let pageNumber = 1;

      do {
        const response = await gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: 500,
          pageToken: nextPageToken
        });

        const messages = response.data.messages || [];
        totalCount += messages.length;
        nextPageToken = response.data.nextPageToken || undefined;
        
        pageNumber++;
        if (pageNumber > 10) break; // Límite de seguridad

      } while (nextPageToken);

      return totalCount;
    } catch {
      return 0;
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
}