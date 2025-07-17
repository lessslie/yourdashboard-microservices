import { Injectable, NotFoundException } from '@nestjs/common';
import { google, gmail_v1 } from 'googleapis';
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
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailsService {
  constructor(
    private readonly configService: ConfigService
  ) {}

  /**
   * 📧 INBOX - Lista de emails con paginación
   * ✨ AQUÍ MANEJAS LA PAGINACIÓN
   */
  async getInboxWithToken(
    accessToken: string, 
    userId: string, 
    page: number = 1,
    limit: number = 10
  ): Promise<EmailListResponse> {
    try {
      console.log(`🔵 MS-EMAIL - Obteniendo inbox para usuario ${userId} - Página ${page}, ${limit} por página`);

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Obtener conteo real
      const realTotalEmails = await this.getRealEmailCount(gmail, 'in:inbox');
      
      // Obtener emails de la página específica
      const emailsForPage = await this.getEmailsForPage(gmail, 'in:inbox', page, limit);

      // Calcular paginación
      const totalPages = Math.ceil(realTotalEmails / limit);

      console.log(`✅ MS-EMAIL - Inbox obtenido: ${emailsForPage.length} emails de página ${page}`);

      return {
        emails: emailsForPage,
        total: realTotalEmails,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      };

    } catch (error) {
      console.error('❌ MS-EMAIL - Error al obtener inbox:', error);
      const emailError = error as EmailServiceError;
      throw new Error('Error al consultar Gmail: ' + emailError.message);
    }
  }

  /**
   * 🔍 BÚSQUEDA - Con paginación igual que inbox
   */
  async searchEmailsWithToken(
    accessToken: string, 
    userId: string, 
    searchTerm: string, 
    page: number = 1,
    limit: number = 10
  ): Promise<EmailListResponse> {
    try {
      console.log(`🔵 MS-EMAIL - Buscando "${searchTerm}" - Página ${page}, ${limit} por página`);
      
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const gmailQuery = `in:inbox ${searchTerm}`;
      
      const realTotalEmails = await this.getRealEmailCount(gmail, gmailQuery);
      const emailsForPage = await this.getEmailsForPage(gmail, gmailQuery, page, limit);
      const totalPages = Math.ceil(realTotalEmails / limit);

      console.log(`✅ MS-EMAIL - Búsqueda completada: ${emailsForPage.length} emails encontrados`);

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

    } catch (error) {
      console.error('❌ MS-EMAIL - Error en búsqueda:', error);
      const emailError = error as EmailServiceError;
      throw new Error('Error al buscar en Gmail: ' + emailError.message);
    }
  }

  /**
   * 📊 ESTADÍSTICAS - Totales de emails
   */
  async getInboxStatsWithToken(accessToken: string, userId: string): Promise<EmailStats> {
    try {
      console.log(`🔵 MS-EMAIL - Obteniendo estadísticas para usuario ${userId}`);
      
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const [unreadResponse, totalResponse] = await Promise.all([
        gmail.users.messages.list({
          userId: 'me',
          q: 'in:inbox is:unread'
        }),
        gmail.users.messages.list({
          userId: 'me',
          q: 'in:inbox'
        })
      ]);

      const totalEmails = unreadResponse.data.resultSizeEstimate || 0;
      const unreadEmails = totalResponse.data.resultSizeEstimate || 0;
      const readEmails = totalEmails - unreadEmails;

      console.log(`✅ MS-EMAIL - Estadísticas obtenidas`);

      return {
        totalEmails,
        unreadEmails,
        readEmails
      };

    } catch (error) {
      console.error('❌ MS-EMAIL - Error al obtener estadísticas:', error);
      throw new Error('Error al obtener estadísticas de Gmail');
    }
  }

  /**
   * 📧 EMAIL ESPECÍFICO - Contenido completo
   */
  async getEmailByIdWithToken(
    accessToken: string, 
    userId: string, 
    messageId: string
  ): Promise<EmailDetail> {
    try {
      console.log(`🔵 MS-EMAIL - Obteniendo email ${messageId} para usuario ${userId}`);
      
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const emailDetail = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      console.log(`✅ MS-EMAIL - Email obtenido`);

      const extractedData = this.extractFullEmailData(emailDetail.data);
      
      if (!extractedData) {
        throw new NotFoundException(`Email con ID ${messageId} no pudo ser procesado`);
      }

      return extractedData;

    } catch (error) {
      console.error('❌ MS-EMAIL - Error al obtener email:', error);
      throw new NotFoundException(`Email con ID ${messageId} no encontrado`);
    }
  }

  /**
   * 🔢 Obtener conteo real de emails
   */
  private async getRealEmailCount(gmail: gmail_v1.Gmail, query: string = 'in:inbox'): Promise<number> {
    try {
      console.log(`🔍 Obteniendo conteo REAL de emails con query: "${query}"`);
      
      let totalCount = 0;
      let nextPageToken: string | undefined = undefined;
      let pageNumber = 1;

      do {
        console.log(`📄 Procesando página ${pageNumber}...`);
        
        const response = await gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: 500,
          pageToken: nextPageToken
        });

        const messages = response.data.messages || [];
        totalCount += messages.length;
        nextPageToken = response.data.nextPageToken || undefined;
        
        console.log(`📊 Página ${pageNumber}: ${messages.length} emails (Total: ${totalCount})`);
        pageNumber++;

        if (pageNumber > 10) {
          console.log(`⚠️ Límite alcanzado (10 páginas). Conteo parcial: ${totalCount}`);
          break;
        }

      } while (nextPageToken);

      console.log(`✅ Conteo REAL completado: ${totalCount} emails`);
      return totalCount;

    } catch (error) {
      console.error('❌ Error obteniendo conteo real:', error);
      return 0;
    }
  }

  /**
   * 📄 Obtener emails específicos de una página
   */
  private async getEmailsForPage(
    gmail: gmail_v1.Gmail, 
    query: string, 
    targetPage: number, 
    limit: number
  ): Promise<EmailMetadata[]> {
    try {
      console.log(`📄 Obteniendo emails de la página ${targetPage}...`);

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
          console.log(`✅ Página ${targetPage} encontrada con ${messages.length} emails`);
          break;
        }

        nextPageToken = messagesResponse.data.nextPageToken || undefined;
        if (!nextPageToken) {
          console.log(`⚠️ No hay página ${targetPage}. Última página: ${currentPage - 1}`);
          break;
        }

        currentPage++;
      }

      const emails = await Promise.all(
        targetEmails.map(async (message): Promise<EmailMetadata | null> => {
          try {
            // Validar que el mensaje tenga ID
            if (!message.id) {
              console.error('❌ Mensaje sin ID encontrado');
              return null;
            }

            const emailDetail = await gmail.users.messages.get({
              userId: 'me',
              id: message.id,
              format: 'metadata',
              metadataHeaders: ['Subject', 'From', 'Date', 'To']
            });
            
            return this.extractEmailMetadata(emailDetail.data);
          } catch (error) {
            const emailError = error as EmailServiceError;
            console.error(`❌ Error procesando email ${message.id}:`, emailError.message);
            return null;
          }
        })
      );

      return emails.filter((email): email is EmailMetadata => email !== null);

    } catch (error) {
      console.error('❌ Error obteniendo emails de página:', error);
      return [];
    }
  }

  /**
   * 🔧 Extraer metadata del email (para listados)
   */
  private extractEmailMetadata(emailData: GmailMessage): EmailMetadata | null {
    try {
      // Validar que tenemos un ID
      if (!emailData.id) {
        console.error('Email sin ID encontrado');
        return null;
      }

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
        subject: subject,
        fromEmail: fromEmail,
        fromName: fromName,
        receivedDate: new Date(date),
        isRead: !emailData.labelIds?.includes('UNREAD'),
        hasAttachments: this.hasAttachments(payload)
      };

    } catch (error) {
      console.error('Error extracting email metadata:', error);
      return null;
    }
  }

  /**
   * 🔧 Extraer datos completos del email (para vista detalle)
   */
  private extractFullEmailData(emailData: GmailMessage): EmailDetail | null {
    try {
      // Validar que tenemos un ID
      if (!emailData.id) {
        console.error('Email sin ID encontrado');
        return null;
      }

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
        subject: subject,
        fromEmail: fromEmail,
        fromName: fromName,
        toEmails: [to],
        bodyText: bodyData.text,
        bodyHtml: bodyData.html,
        receivedDate: new Date(date),
        isRead: !emailData.labelIds?.includes('UNREAD'),
        hasAttachments: this.hasAttachments(payload)
      };

    } catch (error) {
      console.error('Error extracting full email data:', error);
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