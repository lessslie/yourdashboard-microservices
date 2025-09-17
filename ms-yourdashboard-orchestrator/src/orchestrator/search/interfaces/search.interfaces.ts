// ms-yourdashboard-orchestrator/src/orchestrator/search/interfaces/search.interfaces.ts

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

// 📅 NUEVAS INTERFACES PARA CALENDAR
export interface CalendarSearchResponse {
  success?: boolean;
  source?: string;
  events: CalendarResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  searchTerm: string;
  accountsSearched: string[];
}

export interface CalendarResult {
  id: string;
  summary: string;
  location?: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendees?: string[];
  isAllDay: boolean;
  status: string;
  sourceAccount: string;
  sourceAccountId: number;
}

//*******************************************
// WHATSAPP */
//*******************************************

// Interface para los datos crudos que vienen del microservicio WhatsApp
// 📱 NUEVAS INTERFACES PARA WHATSAPP
export interface WhatsappSearchResponse {
  success?: boolean;
  source?: string;
  results: WhatsappResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  searchTerm: string;
  accountsSearched: string[];
}

export interface WhatsappResult {
  id: string;                  // message_id
  message: string;             // contenido del mensaje
  timestamp: string;           // fecha/hora del mensaje
  respondido: boolean;
  categoria: 'verde' | 'amarillo' | 'rojo';
  conversationId: string;
  name: string;
  phone: string;
  sourceAccount: string;       // whatsapp_account_id
  sourceAccountId: number;     
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