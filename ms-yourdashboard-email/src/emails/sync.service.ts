// ms-yourdashboard-email/src/emails/sync.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, gmail_v1 } from 'googleapis';
import { DatabaseService, EmailMetadataDB } from '../database/database.service';
import { 
  GmailMessage, 
  GmailHeader, 
  EmailServiceError 
} from './interfaces/email.interfaces';

export interface SyncOptions {
  maxEmails?: number;        // Máximo emails a sincronizar (sin tope default: 10000)
  onlyUnread?: boolean;      // Solo emails no leídos (default: false)  
  sinceDate?: Date;          // Solo emails desde esta fecha
  fullSync?: boolean;        // Sincronización completa (default: false)
}

export interface SyncStats {
  cuenta_gmail_id: number;
  emails_procesados: number;
  emails_nuevos: number;
  emails_actualizados: number;
  tiempo_total_ms: number;
  errores: string[];
  ultimo_email_fecha?: Date;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService
  ) {}

  /**
   * 🔄 SINCRONIZAR EMAILS - El método principal
   */
  async syncEmailsFromGmail(
    accessToken: string,
    cuentaGmailId: number,
    options: SyncOptions = {}
  ): Promise<SyncStats> {
    const startTime = Date.now();
    const errores: string[] = [];
    
    try {
      this.logger.log(`🔄 🎉 INICIANDO SYNC para cuenta Gmail ID ${cuentaGmailId}`);

      // 1️⃣ Configurar cliente OAuth
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // 2️⃣ Construir query de Gmail según opciones
      const gmailQuery = this.buildGmailQuery(options);
      this.logger.log(`🔍 Query Gmail: "${gmailQuery}"`);

      // 3️⃣ Obtener lista de mensajes de Gmail
      const messagesList = await this.getGmailMessagesList(gmail, gmailQuery, options.maxEmails || 10000);
      this.logger.log(`📧 ¡Encontrados ${messagesList.length} emails en Gmail!`);

      if (messagesList.length === 0) {
        this.logger.log(`📭 No hay emails nuevos para sincronizar`);
        return {
          cuenta_gmail_id: cuentaGmailId,
          emails_procesados: 0,
          emails_nuevos: 0,
          emails_actualizados: 0,
          tiempo_total_ms: Date.now() - startTime,
          errores: []
        };
      }

      // 4️⃣ Procesar emails en lotes (para no saturar)
      const BATCH_SIZE = 25; // Procesar de a 10 emails
      const emailsMetadata: EmailMetadataDB[] = [];
      let ultimaFechaEmail: Date | undefined;

      for (let i = 0; i < messagesList.length; i += BATCH_SIZE) {
        const batch = messagesList.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i/BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(messagesList.length/BATCH_SIZE);
        
        this.logger.log(`📦 Procesando lote ${batchNumber}/${totalBatches} (${batch.length} emails)`);

        // Obtener detalles de cada email en paralelo
        const batchPromises = batch.map(msg => 
          this.getEmailMetadata(gmail, msg.id, cuentaGmailId)
        );
        const batchResults = await Promise.allSettled(batchPromises);

        // Procesar resultados del lote
        for (const result of batchResults) {
          if (result.status === 'fulfilled' && result.value) {
            emailsMetadata.push(result.value);
            
            // Tracking de fecha más reciente
            if (result.value.fecha_recibido && (!ultimaFechaEmail || result.value.fecha_recibido > ultimaFechaEmail)) {
              ultimaFechaEmail = result.value.fecha_recibido;
            }
          } else if (result.status === 'rejected') {
            errores.push(`Error procesando email: ${result.reason}`);
            this.logger.warn(`⚠️ Error en email del lote: ${result.reason}`);
          }
        }

        // Pequeña pausa para no saturar la API de Gmail
        if (i + BATCH_SIZE < messagesList.length) {
          await this.sleep(200); // 200ms entre lotes
        }
      }

      this.logger.log(`✅ Procesados ${emailsMetadata.length} emails, guardando en BD...`);

      // 5️⃣ Guardar tod en base de datos (UPSERT masivo)
      const syncResult = await this.databaseService.syncEmailsMetadata(emailsMetadata);

      const tiempoTotal = Date.now() - startTime;
      const stats: SyncStats = {
        cuenta_gmail_id: cuentaGmailId,
        emails_procesados: emailsMetadata.length,
        emails_nuevos: syncResult.emails_nuevos,
        emails_actualizados: syncResult.emails_actualizados,
        tiempo_total_ms: tiempoTotal,
        errores,
        ultimo_email_fecha: ultimaFechaEmail
      };

      this.logger.log(`🎉 🔥 SYNC COMPLETADO! ${stats.emails_nuevos} nuevos, ${stats.emails_actualizados} actualizados (${tiempoTotal}ms)`);

      return stats;

    } catch (error) {
      const emailError = error as EmailServiceError;
      this.logger.error(`❌ Error crítico en sincronización:`, emailError);
      
      return {
        cuenta_gmail_id: cuentaGmailId,
        emails_procesados: 0,
        emails_nuevos: 0,
        emails_actualizados: 0,
        tiempo_total_ms: Date.now() - startTime,
        errores: [`Error crítico: ${emailError.message}`]
      };
    }
  }

  /**
   * 🔍 Construir query de Gmail según opciones
   */
  private buildGmailQuery(options: SyncOptions): string {
    const queryParts: string[] = ['in:inbox'];

    if (options.onlyUnread) {
      queryParts.push('is:unread');
    }

    if (options.sinceDate) {
      const dateStr = options.sinceDate.toISOString().split('T')[0]; // YYYY-MM-DD
      queryParts.push(`after:${dateStr}`);
    }

    // Si es fullSync, no agregamos limitaciones adicionales
  if (!options.fullSync) {
  // Emails de los últimos 6 meses (balance entre rendimiento y cantidad real)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const defaultSinceDate = sixMonthsAgo.toISOString().split('T')[0];
  
  if (!options.sinceDate) {
    queryParts.push(`after:${defaultSinceDate}`);
  }
}

    const finalQuery = queryParts.join(' ');
    return finalQuery;
  }

  /**
   * 📧 Obtener lista de mensajes de Gmail
   */
  private async getGmailMessagesList(
    gmail: gmail_v1.Gmail,
    query: string,
    maxResults: number
  ): Promise<{ id: string }[]> {
    try {
      const messages: { id: string }[] = [];
      let nextPageToken: string | undefined = undefined;

      this.logger.log(`📡 Consultando Gmail API con query: "${query}"`);

      do {
        const response = await gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: Math.min(500, maxResults - messages.length), // Gmail API limit es 500
          pageToken: nextPageToken
        });

        const pageMessages = response.data.messages || [];
        
        // Filtrar solo los que tienen ID válido
        const validMessages = pageMessages.filter(msg => msg.id) as { id: string }[];
        messages.push(...validMessages);

        nextPageToken = response.data.nextPageToken || undefined;

        this.logger.debug(`📄 Página obtenida: ${pageMessages.length} emails (total: ${messages.length}/${maxResults})`);

      } while (nextPageToken && messages.length < maxResults);

      return messages.slice(0, maxResults);

    } catch (error) {
      this.logger.error(`❌ Error obteniendo lista de Gmail:`, error);
      throw error;
    }
  }

  /**
   * 📝 Extraer metadata de un email específico
   */
  private async getEmailMetadata(
    gmail: gmail_v1.Gmail,
    messageId: string,
    cuentaGmailId: number
  ): Promise<EmailMetadataDB | null> {
    try {
      const emailDetail = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'metadata', // Obtener todos los datos del email
        metadataHeaders: ['Subject', 'From', 'To', 'Date']
      });

      const message = emailDetail.data;
      if (!message || !message.id) {
        return null;
      }

      const headers = message.payload?.headers || [];
      
      // 📧 Extraer información de headers
      const subject = this.getHeader(headers, 'Subject') || '';
      const from = this.getHeader(headers, 'From') || '';
      const to = this.getHeader(headers, 'To') || '';
      const dateStr = this.getHeader(headers, 'Date');

      // 👤 Parsear remitente (formato: "Nombre <email@domain.com>")
      const fromMatch = RegExp(/^(.+?)\s*<(.+?)>$/).exec(from) || [null, from, from];
      const remitenteNombre = fromMatch[1]?.trim().replace(/"/g, '') || '';
      const remitenteEmail = fromMatch[2]?.trim() || from;

      // 📬 Parsear destinatario (tomar el primer email si hay múltiples)
      const toMatch = RegExp(/<(.+?)>/).exec(to) || [null, to];
      const destinatarioEmail = toMatch[1]?.trim() || to.split(',')[0]?.trim() || '';

      // 📅 Parsear fecha
      let fechaRecibido: Date | undefined;
      if (dateStr) {
        try {
          fechaRecibido = new Date(dateStr);
          // Validar que la fecha sea válida
          if (isNaN(fechaRecibido.getTime())) {
            fechaRecibido = undefined;
          }
        } catch {
          fechaRecibido = undefined;
        }
      }

      // 🏗️ Construir objeto de metadata
      const emailMetadata: EmailMetadataDB = {
        cuenta_gmail_id: cuentaGmailId,
        gmail_message_id: message.id,
        asunto: subject || undefined,
        remitente_email: remitenteEmail || undefined,
        remitente_nombre: remitenteNombre || undefined,
        destinatario_email: destinatarioEmail || undefined,
        fecha_recibido: fechaRecibido,
        esta_leido: !message.labelIds?.includes('UNREAD'),
        tiene_adjuntos: this.hasAttachments(message),
        etiquetas_gmail: message.labelIds || [],
        tamano_bytes: message.sizeEstimate || undefined
      };

      return emailMetadata;

    } catch (error) {
      this.logger.error(`❌ Error extrayendo metadata del email ${messageId}:`, error);
      return null;
    }
  }

  /**
   * 🔄 Sync incremental (solo emails nuevos)
   */
  async syncIncrementalEmails(
    accessToken: string,
    cuentaGmailId: number,
    maxEmails: number = 10000
  ): Promise<SyncStats> {
    try {
      this.logger.log(`🔄 ⚡ INICIANDO SYNC INCREMENTAL para cuenta ${cuentaGmailId}`);

      // Obtener último email sincronizado para saber desde cuándo sincronizar
      const lastSyncedEmail = await this.databaseService.getLastSyncedEmail(cuentaGmailId);
      
      const options: SyncOptions = {
        maxEmails,
        sinceDate: lastSyncedEmail?.fecha_sincronizado ? new Date(lastSyncedEmail.fecha_sincronizado) : undefined
      };

      this.logger.log(`📅 Sincronizando desde: ${options.sinceDate?.toISOString() || 'inicio de los tiempos'}`);

      return await this.syncEmailsFromGmail(accessToken, cuentaGmailId, options);

    } catch (error) {
      this.logger.error(`❌ Error en sync incremental:`, error);
      throw error;
    }
  }

  /**
   * 📊 Obtener estadísticas de sincronización
   */
  async getSyncStats(cuentaGmailId: number): Promise<{
    total_emails_bd: number;
    ultimo_sync?: Date;
    stats_detalladas: any;
  }> {
    try {
      const [lastSync, statsDetalladas] = await Promise.all([
        this.databaseService.getLastSyncedEmail(cuentaGmailId),
        this.databaseService.getEmailStatsFromDB(cuentaGmailId)
      ]);

      return {
        total_emails_bd: statsDetalladas.total_emails,
        ultimo_sync: lastSync?.fecha_sincronizado,
        stats_detalladas: statsDetalladas
      };

    } catch (error) {
      this.logger.error(`❌ Error obteniendo stats de sync:`, error);
      throw error;
    }
  }

  // ================================
  // 🔧 MÉTODOS AUXILIARES PRIVADOS
  // ================================

  private getHeader(headers: GmailHeader[], name: string): string {
    const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
    return header?.value || '';
  }

  private hasAttachments(message: GmailMessage): boolean {
    const payload = message.payload;
    
    if (payload?.parts) {
      return payload.parts.some((part: any) => 
        part.filename && part.filename.length > 0
      );
    }
    
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}