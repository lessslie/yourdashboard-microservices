import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import { 
  EmailSearchResponse, 
  EmailResult,
  GlobalSearchResponse,
  AuthProfileResponse,
  WhatsappSearchResponse,
  WhatsappResult,
  CalendarSearchResponse,
  CalendarResult
} from './interfaces/search.interfaces';

@Injectable()
export class SearchService {
  private readonly msEmailUrl: string;
  private readonly msCalendarUrl: string;
  private readonly msWhatsappUrl: string;

  constructor(
    private readonly configService: ConfigService
  ) {
    this.msEmailUrl = this.configService.get<string>('MS_EMAIL_URL') || 'http://localhost:3002';
    this.msCalendarUrl = this.configService.get<string>('MS_CALENDAR_URL') || 'http://localhost:3005';
    this.msWhatsappUrl = this.configService.get<string>('MS_WHATSAPP_URL') || 'http://localhost:3004';
  }

  /**
   * 🔍 Búsqueda global en todos los microservicios
   */
  async searchGlobal(authHeader: string, query: string, page: string, limit: string): Promise<GlobalSearchResponse> {
    console.log('🔍 SearchService - Params recibidos:', { authHeader: !!authHeader, query, page, limit });
    
    // Validación de parámetros
    if (!query) {
      throw new HttpException(
        'q es un parámetro requerido',
        HttpStatus.BAD_REQUEST
      );
    }

    if (!authHeader) {
      throw new HttpException(
        'Authorization header es requerido',
        HttpStatus.BAD_REQUEST
      );
    }

    // Extraer userId del token JWT
    const userId = await this.extractUserIdFromToken(authHeader);

    // Buscar en los 3 microservicios en paralelo
    const [emailsResult, calendarResult, whatsappResult] = await Promise.allSettled([
      this.searchInEmails(userId, query, page, limit),
      this.searchInCalendar(userId, query, page, limit),
      this.searchInWhatsapp(userId, query, page, limit)
    ]);

    console.log('[SEARCH] Resultados de emails, calendar y whatsapp:', emailsResult, calendarResult, whatsappResult);

    // Procesar resultado de emails
    let emailsTotal = 0;
    let emailsResults: EmailResult[] = [];
    let accountsSearched: string[] = [];

    if (emailsResult.status === 'fulfilled' && emailsResult.value) {
      emailsTotal = emailsResult.value.total || 0;
      emailsResults = emailsResult.value.emails || [];
      accountsSearched = emailsResult.value.accountsSearched || [];
    }

    // Procesar resultado de Calendar
    let calendarTotal = 0;
    let calendarResults: CalendarResult[] = [];
    let calendarAccountsSearched: string[] = [];

    if (calendarResult.status === 'fulfilled' && calendarResult.value) {
      calendarTotal = calendarResult.value.total || 0;
      calendarResults = calendarResult.value.events || [];
      calendarAccountsSearched = calendarResult.value.accountsSearched || [];
    }

    // Procesar resultado de WhatsApp
    let whatsappTotal = 0;
    let whatsappResults: WhatsappResult[] = [];
    let whatsappAccountsSearched: string[] = [];

    if (whatsappResult.status === 'fulfilled' && whatsappResult.value) {
      whatsappTotal = whatsappResult.value.total || 0;
      whatsappResults = whatsappResult.value.results || [];
      whatsappAccountsSearched = whatsappResult.value.accountsSearched || [];
    }

    return {
      success: true,
      source: 'orchestrator-global-search',
      searchTerm: query,
      data: {
        emails: {
          results: emailsResults,
          total: emailsTotal,
          accountsSearched: accountsSearched
        },
        calendar: {
          results: calendarResults,
          total: calendarTotal,
          accountsSearched: calendarAccountsSearched
        },
        whatsapp: {
          results: whatsappResults,
          total: whatsappTotal,
          accountsSearched: whatsappAccountsSearched
        }
      },
      summary: {
        totalResults: emailsTotal + calendarTotal + whatsappTotal,
        resultsPerSource: {
          emails: emailsTotal,
          calendar: calendarTotal,
          whatsapp: whatsappTotal
        }
      }
    };
  }

  /**
   * 🔑 Extraer userId del token JWT
   */
  private async extractUserIdFromToken(authHeader: string): Promise<string> {
    try {
      const msAuthUrl = this.configService.get<string>('MS_AUTH_URL') || 'http://localhost:3001';
      const url = `${msAuthUrl}/auth/me`;
      
      const response: AxiosResponse<AuthProfileResponse> = await axios.get(url, {
        headers: {
          'Authorization': authHeader
        }
      });

      if (response.data?.usuario?.id) {
        return response.data.usuario.id;
      }

      throw new Error('No se pudo obtener el userId del token');
    } catch (error) {
      console.log('Error validando token en MS Auth:', error);
      throw new HttpException('Token inválido o expirado', HttpStatus.UNAUTHORIZED);
    }
  }

  /**
   * 📧 Buscar en microservicio de emails
   */
  private async searchInEmails(userId: string, query: string, page: string, limit: string): Promise<EmailSearchResponse | null> {
    try {
      const url = `${this.msEmailUrl}/emails/search-all-accounts`;
      const params = { userId, q: query, page, limit };
      const response: AxiosResponse<EmailSearchResponse> = await axios.get(url, { params });
      return response.data;
    } catch (error) {
      console.log('Error buscando en emails:', error);
      return null;
    }
  }

  /**
   * 📅 Buscar en microservicio de calendar
   */
  private async searchInCalendar(userId: string, query: string, page: string, limit: string): Promise<CalendarSearchResponse | null> {
    try {
      const url = `${this.msCalendarUrl}/calendar/search-global`;
      const params = { userId, q: query, page, limit };
      const response: AxiosResponse<CalendarSearchResponse> = await axios.get(url, { params });
      return response.data;
    } catch (error) {
      console.log('Error buscando en calendar:', error);
      return null;
    }
  }

  /**
   * 💬 Buscar en microservicio de whatsapp
   */
  private async searchInWhatsapp(userId: string, query: string, page: string, limit: string): Promise<WhatsappSearchResponse | null> {
    try {
      const url = `${this.msWhatsappUrl}/search`;
      const params = { q: query, userId, page, limit };

      const response: AxiosResponse<any[]> = await axios.get(url, { params });

      // Mapear resultados crudos al modelo WhatsappResult
      const results: WhatsappResult[] = response.data.map((msg: any) => ({
        id: msg.message_id,
        message: msg.message,
        timestamp: msg.timestamp,
        respondido: msg.respondido,
        categoria: msg.categoria,
        conversationId: msg.conversation_id,
        name: msg.name,
        phone: msg.phone,
        sourceAccount: msg.whatsapp_account_id,
        sourceAccountId: msg.whatsapp_account_id ? Number(msg.whatsapp_account_id) : 0
      }));

      return {
        success: true,
        source: 'whatsapp',
        results,
        total: results.length,
        page: Number(page) || 1,
        limit: Number(limit) || results.length,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        searchTerm: query,
        accountsSearched: results.map(r => r.sourceAccount)
      };
    } catch (error) {
      console.log('Error buscando en whatsapp:', error);
      return null;
    }
  }
}
