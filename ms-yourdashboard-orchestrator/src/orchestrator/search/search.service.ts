import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import { 
  EmailSearchResponse, 
  EmailResult,
  GlobalSearchResponse,
  AuthProfileResponse 
} from './interfaces/search.interfaces';

@Injectable()
export class SearchService {
  private readonly msEmailUrl: string;

  constructor(
    private readonly configService: ConfigService
  ) {
    this.msEmailUrl = this.configService.get<string>('MS_EMAIL_URL') || 'http://localhost:3002';
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

    // Por ahora solo ejecutamos búsqueda en emails
    const emailsResult = await this.searchInEmails(userId, query, page, limit);

    // TODO: Cuando estén listos los otros microservicios, cambiar a:
    // const [emailsResult, calendarResult, whatsappResult] = await Promise.allSettled([
    //   this.searchInEmails(userId, query, page, limit),
    //   this.searchInCalendar(userId, query, page, limit),
    //   this.searchInWhatsapp(userId, query, page, limit)
    // ]);

    // Procesar resultado de emails
    let emailsTotal = 0;
    let emailsResults: EmailResult[] = [];
    let accountsSearched: string[] = [];

    if (emailsResult) {
      console.log('[SEARCH] Procesando resultado de emails:', {
        hasEmails: !!emailsResult.emails,
        totalEmails: emailsResult.total,
        emailCount: emailsResult.emails?.length
      });
      
      // Los datos están directamente en emailsResult, no en emailsResult.data
      emailsTotal = emailsResult.total || 0;
      emailsResults = emailsResult.emails || [];
      accountsSearched = emailsResult.accountsSearched || [];
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
          results: [],
          total: 0,
          accountsSearched: []
        },
        whatsapp: {
          results: [],
          total: 0,
          accountsSearched: []
        }
      },
      summary: {
        totalResults: emailsTotal, // + calendarTotal + whatsappTotal
        resultsPerSource: {
          emails: emailsTotal,
          calendar: 0, // calendarTotal
          whatsapp: 0  // whatsappTotal
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
        return response.data.usuario.id.toString();
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
   * 📅 Buscar en microservicio de calendar (PENDIENTE)
   */
  // private async searchInCalendar(userId: string, query: string, page: string, limit: string): Promise<CalendarSearchResponse | null> {
  //   try {
  //     const url = `${this.msCalendarUrl}/calendar/search`;
  //     const params = { userId, q: query, page, limit };
  //     
  //     console.log(`[SEARCH-CALENDAR] Llamando a: ${url}`, params);
  //     
  //     const response: AxiosResponse<CalendarSearchResponse> = await axios.get(url, { params });
  //     
  //     return response.data;
  //   } catch (error) {
  //     console.error('[SEARCH-CALENDAR] Error:', error instanceof Error ? error.message : 'Error desconocido');
  //     return null;
  //   }
  // }

  /**
   * 💬 Buscar en microservicio de whatsapp (PENDIENTE)
   */
  // private async searchInWhatsapp(userId: string, query: string, page: string, limit: string): Promise<WhatsappSearchResponse | null> {
  //   try {
  //     const url = `${this.msWhatsappUrl}/whatsapp/search`;
  //     const params = { userId, q: query, page, limit };
  //     
  //     console.log(`[SEARCH-WHATSAPP] Llamando a: ${url}`, params);
  //     
  //     const response: AxiosResponse<WhatsappSearchResponse> = await axios.get(url, { params });
  //     
  //     return response.data;
  //   } catch (error) {
  //     console.error('[SEARCH-WHATSAPP] Error:', error instanceof Error ? error.message : 'Error desconocido');
  //     return null;
  //   }
  // }
}