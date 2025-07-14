import { Injectable, NotFoundException } from '@nestjs/common';
import { google } from 'googleapis';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class EmailsService {
  constructor(private databaseService: DatabaseService) {}

  // ✅ ESTOS 4 MÉTODOS SON LOS QUE USA EL ORCHESTRATOR:

  /**
   * 📧 INBOX - Lista de emails con paginación
   * ✨ AQUÍ MANEJAS LA PAGINACIÓN PARA SOFI
   */
  async getInboxWithToken(
    accessToken: string, 
    userId: string, 
    page: number = 1,      // 👈 Si Sofi no manda página, usa 1
    limit: number = 10     // 👈 Si Sofi no manda limit, usa 10
  ) {
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
        page,                    // 👈 Le devuelves la página que pidió
        limit,                   // 👈 Le devuelves cuántos por página pidió  
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      };

    } catch (error) {
      console.error('❌ MS-EMAIL - Error al obtener inbox:', error);
      throw new Error('Error al consultar Gmail: ' + error.message);
    }
  }

  /**
   * 🔍 BÚSQUEDA - Con paginación igual que inbox
   * ✨ AQUÍ TAMBIÉN MANEJAS LA PAGINACIÓN
   */
  async searchEmailsWithToken(
    accessToken: string, 
    userId: string, 
    searchTerm: string, 
    page: number = 1,      // 👈 Página por defecto
    limit: number = 10     // 👈 Cantidad por defecto
  ) {
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
        page,                    // 👈 Página solicitada
        limit,                   // 👈 Cantidad solicitada
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        searchTerm
      };

    } catch (error) {
      console.error('❌ MS-EMAIL - Error en búsqueda:', error);
      throw new Error('Error al buscar en Gmail: ' + error.message);
    }
  }

  /**
   * 📊 ESTADÍSTICAS - Totales de emails
   */
  async getInboxStatsWithToken(accessToken: string, userId: string) {
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

      const totalEmails = totalResponse.data.resultSizeEstimate || 0;
      const unreadEmails = unreadResponse.data.resultSizeEstimate || 0;
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
  async getEmailByIdWithToken(accessToken: string, userId: string, messageId: string) {
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

      return this.extractFullEmailData(emailDetail.data);

    } catch (error) {
      console.error('❌ MS-EMAIL - Error al obtener email:', error);
      throw new NotFoundException(`Email con ID ${messageId} no encontrado`);
    }
  }

  // 🔧 MÉTODOS AUXILIARES (los necesitas):

  /**
   * 🔢 Obtener conteo real de emails
   */
  private async getRealEmailCount(gmail: any, query: string = 'in:inbox'): Promise<number> {
    try {
      console.log(`🔍 Obteniendo conteo REAL de emails con query: "${query}"`);
      
      let totalCount = 0;
      let nextPageToken = undefined;
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
        nextPageToken = response.data.nextPageToken;
        
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
  private async getEmailsForPage(gmail: any, query: string, targetPage: number, limit: number): Promise<any[]> {
    try {
      console.log(`📄 Obteniendo emails de la página ${targetPage}...`);

      let currentPage = 1;
      let nextPageToken = undefined;
      let targetEmails: any[] = [];

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

        nextPageToken = messagesResponse.data.nextPageToken;
        if (!nextPageToken) {
          console.log(`⚠️ No hay página ${targetPage}. Última página: ${currentPage - 1}`);
          break;
        }

        currentPage++;
      }

      const emails = await Promise.all(
        targetEmails.map(async (message) => {
          try {
            const emailDetail = await gmail.users.messages.get({
              userId: 'me',
              id: message.id!,
              format: 'metadata',
              metadataHeaders: ['Subject', 'From', 'Date', 'To']
            });
            
            return this.extractEmailMetadata(emailDetail.data);
          } catch (error) {
            console.error(`❌ Error procesando email ${message.id}:`, error.message);
            return null;
          }
        })
      );

      return emails.filter(email => email !== null);

    } catch (error) {
      console.error('❌ Error obteniendo emails de página:', error);
      return [];
    }
  }

  /**
   * 🔧 Extraer metadata del email (para listados)
   */
  private extractEmailMetadata(emailData: any) {
    try {
      const payload = emailData.payload;
      const headers = payload.headers || [];

      const subject = this.getHeader(headers, 'Subject') || 'Sin asunto';
      const from = this.getHeader(headers, 'From') || '';
      const date = this.getHeader(headers, 'Date') || new Date().toISOString();

      const fromMatch = from.match(/^(.+?)\s*<(.+?)>$/) || [null, from, from];
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
  private extractFullEmailData(emailData: any) {
    try {
      const payload = emailData.payload;
      const headers = payload.headers || [];

      const subject = this.getHeader(headers, 'Subject') || 'Sin asunto';
      const from = this.getHeader(headers, 'From') || '';
      const to = this.getHeader(headers, 'To') || '';
      const date = this.getHeader(headers, 'Date') || new Date().toISOString();

      const fromMatch = from.match(/^(.+?)\s*<(.+?)>$/) || [null, from, from];
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

  private getHeader(headers: any[], name: string): string {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header?.value || '';
  }

  private extractBody(payload: any): { text: string; html: string } {
    let textBody = '';
    let htmlBody = '';

    if (payload.body?.data) {
      const mimeType = payload.mimeType || '';
      const bodyData = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      
      if (mimeType.includes('text/plain')) {
        textBody = bodyData;
      } else if (mimeType.includes('text/html')) {
        htmlBody = bodyData;
      }
    } else if (payload.parts) {
      payload.parts.forEach((part: any) => {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          textBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/html' && part.body?.data) {
          htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      });
    }

    return { text: textBody, html: htmlBody };
  }

  private hasAttachments(payload: any): boolean {
    if (payload.parts) {
      return payload.parts.some((part: any) => 
        part.filename && part.filename.length > 0
      );
    }
    return false;
  }
}