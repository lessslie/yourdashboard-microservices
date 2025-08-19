// src/orchestrator/search/interfaces/search.interfaces.ts

export interface EmailSearchResponse {
  success?: boolean;
  source?: string;
  emails: EmailResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  searchTerm: string;
  accountsSearched: string[];
}

export interface EmailResult {
  id: string;
  messageId: string;
  subject: string;
  fromEmail: string;
  fromName: string;
  receivedDate: string;
  isRead: boolean;
  hasAttachments: boolean;
  sourceAccount: string;
  sourceAccountId: number;
}

export interface CalendarSearchResponse {
  results: CalendarResult[];
  total: number;
}

export interface CalendarResult {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
}

export interface WhatsappSearchResponse {
  results: WhatsappResult[];
  total: number;
}

export interface WhatsappResult {
  id: string;
  message: string;
  from: string;
  timestamp: string;
  chatId?: string;
  type?: string;
}

export interface GlobalSearchResponse {
  success: boolean;
  source: string;
  searchTerm: string;
  data: {
    emails: {
      results: EmailResult[];
      total: number;
      accountsSearched: string[];
    };
    calendar: {
      results: CalendarResult[];
      total: number;
      accountsSearched: string[];
    };
    whatsapp: {
      results: WhatsappResult[];
      total: number;
      accountsSearched: string[];
    };
  };
  summary: {
    totalResults: number;
    resultsPerSource: {
      emails: number;
      calendar: number;
      whatsapp: number;
    };
  };
}

// Interface para la respuesta de ms-auth/auth/me
export interface AuthProfileResponse {
  success: boolean;
  usuario: {
    id: number;
    email: string;
    nombre: string;
    fecha_registro: string;
    estado: string;
    email_verificado: boolean;
  };
  cuentas_gmail: Array<{
    id: number;
    email_gmail: string;
    alias: string | null;
    fecha_conectado: string;
    ultima_sincronizacion: string | null;
  }>;
  sesiones_activas: any[];
  estadisticas: {
    total_cuentas_gmail: number;
    cuentas_gmail_activas: number;
    total_emails_sincronizados: number;
    emails_no_leidos: number;
    ultima_sincronizacion: string;
    cuenta_mas_activa: any;
  };
}