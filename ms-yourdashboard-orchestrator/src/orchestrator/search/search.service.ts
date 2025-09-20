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
  WhatsappConversationRaw,
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
    console.log('[SEARCH] Procesando resultado de emails:', {
      hasEmails: !!emailsResult.value.emails,
      totalEmails: emailsResult.value.total,
      emailCount: emailsResult.value.emails?.length
    });
    
    emailsTotal = emailsResult.value.total || 0;
    emailsResults = emailsResult.value.emails || [];
    accountsSearched = emailsResult.value.accountsSearched || [];
  } else {
    console.error('[SEARCH] Error en emails (continuando con otros servicios):', 
      emailsResult.status === 'rejected' ? emailsResult.reason : 'Unknown error');
  }

  // Procesar resultado de Calendar
  let calendarTotal = 0;
  let calendarResults: CalendarResult[] = [];
  let calendarAccountsSearched: string[] = [];

  if (calendarResult.status === 'fulfilled' && calendarResult.value) {
    console.log('[SEARCH] Procesando resultado de calendar:', {
      hasEvents: !!calendarResult.value.events,
      totalEvents: calendarResult.value.total,
      eventsCount: calendarResult.value.events?.length
    });
    
    calendarTotal = calendarResult.value.total || 0;
    calendarResults = calendarResult.value.events || [];
    calendarAccountsSearched = calendarResult.value.accountsSearched || [];
  } else {
    console.error('[SEARCH] Error en calendar (continuando con otros servicios):', 
      calendarResult.status === 'rejected' ? calendarResult.reason : 'Unknown error');
  }

  // Procesar resultado de WhatsApp
  let whatsappTotal = 0;
  let whatsappResults: WhatsappResult[] = [];

  if (whatsappResult.status === 'fulfilled' && whatsappResult.value) {
    console.log('[SEARCH] Procesando resultado de whatsapp:', {
      hasResults: !!whatsappResult.value.results,
      totalResults: whatsappResult.value.total,
      resultsCount: whatsappResult.value.results?.length
    });
    
    whatsappTotal = whatsappResult.value.total || 0;
    whatsappResults = whatsappResult.value.results || [];
  } else if (whatsappResult.status === 'rejected') {
    console.error('[SEARCH] Error en whatsapp (continuando con otros servicios):', whatsappResult.reason);
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
        accountsSearched: []
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
      // Llamar a ms-auth para validar el token y obtener el perfil
      const msAuthUrl = this.configService.get<string>('MS_AUTH_URL') || 'http://localhost:3001';
      const url = `${msAuthUrl}/auth/me`;
      
      console.log('📞 Llamando a ms-auth:', {
        url,
        authHeader: authHeader.substring(0, 50) + '...'
      });

      const response: AxiosResponse<AuthProfileResponse> = await axios.get(url, {
        headers: {
          'Authorization': authHeader
        }
      });

      console.log('✅ Respuesta de ms-auth:', {
        status: response.status,
        hasData: !!response.data,
        hasUsuario: !!response.data?.usuario,
        usuarioId: response.data?.usuario?.id
      });

      if (response.data?.usuario?.id) {
        return response.data.usuario.id;
      }

      throw new Error('No se pudo obtener el userId del token');
    } catch (error) {
      console.error('[SEARCH] Error extrayendo userId del token:', error);
      
      if (axios.isAxiosError(error)) {
        console.error('Detalles del error:', {
          status: error.response?.status,
          message: error.message
        });
      }
      
      throw new HttpException('Token inválido o expirado', HttpStatus.UNAUTHORIZED);
    }
  }

  /**
   * 📧 Buscar en microservicio de emails
   */
  private async searchInEmails(userId: string, query: string, page: string, limit: string): Promise<EmailSearchResponse | null> {
    try {
      const url = `${this.msEmailUrl}/emails/search-all-accounts`;
      const params = {
        userId,
        q: query,
        page,
        limit
      };

      console.log(`[SEARCH-EMAILS] Llamando a: ${url}`, params);
      
      const response: AxiosResponse<EmailSearchResponse> = await axios.get(url, { params });
      
      console.log('[SEARCH-EMAILS] Respuesta recibida:', {
        status: response.status,
        dataKeys: Object.keys(response.data || {}),
        hasData: !!response.data,
        dataPreview: JSON.stringify(response.data).substring(0, 200) + '...'
      });

      return response.data;
    } catch (error) {
      console.error('[SEARCH-EMAILS] Error completo:', error);
      if (axios.isAxiosError(error)) {
        console.error('[SEARCH-EMAILS] Detalles del error Axios:', {
          status: error.response?.status,
          message: error.message
        });
      }
      return null;
    }
  }

  /**
 * 📅 Buscar en microservicio de calendar
 */
private async searchInCalendar(userId: string, query: string, page: string, limit: string): Promise<CalendarSearchResponse | null> {
  try {
    const url = `${this.msCalendarUrl}/calendar/search-global`;
    const params = {
      userId,
      q: query,
      timeMin: '2025-08-01T00:00:00Z',  // Fecha desde donde buscar
      page,
      limit
    };

    console.log(`[SEARCH-CALENDAR] Llamando a: ${url}`, params);
    
    const response: AxiosResponse<CalendarSearchResponse> = await axios.get(url, { params });
    
    console.log('[SEARCH-CALENDAR] Respuesta recibida:', {
      status: response.status,
      hasData: !!response.data,
      eventsCount: response.data?.events?.length || 0
    });

    return response.data;
  } catch (error) {
    console.error('[SEARCH-CALENDAR] Error completo:', error);
    if (axios.isAxiosError(error)) {
      console.error('[SEARCH-CALENDAR] Detalles del error Axios:', {
        status: error.response?.status,
        message: error.message
      });
    }
    return null;
  }
}

  /**
   * 💬 Buscar en microservicio de whatsapp (PENDIENTE de completar por userId)
   */
private async searchInWhatsapp(
  userId: string,
  query: string,
  page: string,
  limit: string
): Promise<WhatsappSearchResponse | null> {
  try {
    const msWhatsappUrl = this.configService.get<string>('MS_WHATSAPP_URL') || 'http://localhost:3004';
    const url = `${msWhatsappUrl}/search`;
    const params = {
      q: query,
      userId: userId
    };
    
    console.log(page, limit);
    console.log(`[SEARCH-WHATSAPP] Llamando a: ${url}`, params);
    
    const response: AxiosResponse<WhatsappConversationRaw[]> = await axios.get(url, { params });
    
    console.log('[SEARCH-WHATSAPP] Respuesta recibida:', {
      status: response.status,
      resultCount: response.data?.length || 0,
      dataPreview: JSON.stringify(response.data).substring(0, 200) + '...'
    });

    return {
      results: response.data.map((conversation: WhatsappConversationRaw): WhatsappResult => ({
        id: conversation.conversation_id || conversation.id || '',
        message: conversation.last_message || conversation.message || '',
        from: conversation.name || conversation.phone || 'Unknown',
        timestamp: conversation.last_message_date || conversation.timestamp || new Date().toISOString(),
        chatId: conversation.conversation_id || conversation.id,
        type: 'conversation'
      })),
      total: response.data.length
    };
  } catch (error) {
    console.error('[SEARCH-WHATSAPP] Error completo:', error);
    if (axios.isAxiosError(error)) {
      console.error('[SEARCH-WHATSAPP] Detalles del error Axios:', {
        status: error.response?.status,
        message: error.message
      });
    }
    return null;
  }
}
}