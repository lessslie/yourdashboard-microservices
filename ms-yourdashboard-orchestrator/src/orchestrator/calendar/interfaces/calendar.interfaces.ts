// ms-yourdashboard-orchestrator/src/orchestrator/calendar/interfaces/calendar.interfaces.ts

// 🎯 TOKEN RESPONSE DE MS-AUTH
export interface CalendarTokenResponse {
  success: boolean;
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    cuentaGmailId: string;
  };
  renewed: boolean;
}

// 🎯 EVENT RESPONSES DE MS-CALENDAR
export interface CalendarEvent {
  id: string;
  summary: string;
  location?: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees?: string[];
  isAllDay: boolean;
  status: string;
}

export interface CalendarEventDetail extends CalendarEvent {
  creator?: string;
  organizer?: string;
  htmlLink?: string;
  sourceAccount?: string;
  sourceAccountId?: number;
}

export interface CalendarListResponse {
  events: CalendarEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  searchTerm?: string;
}

export interface CalendarStats {
  totalEvents: number;
  upcomingEvents: number;
  pastEvents: number;
}

export interface CalendarSyncResponse {
  success: boolean;
  message: string;
  stats: {
    cuenta_gmail_id: number;
    events_nuevos: number;
    events_actualizados: number;
    tiempo_total_ms: number;
  };
}

export interface CalendarShareResponse {
  success: boolean;
  message: string;
  shared_with: string;
  role: string;
}

// 🎯 ORCHESTRATOR RESPONSES
export interface OrchestratorCalendarResponse<T = any> {
  success: boolean;
  source: 'orchestrator' | 'orchestrator-cache' | 'orchestrator-api';
  data: T;
  searchTerm?: string;
  accountsSearched?: string[];
  accountsLoaded?: string[];
}

export interface OrchestratorCalendarSyncResponse {
  success: boolean;
  source: string;
  data: CalendarSyncResponse;
}

// 🎯 ERROR HANDLING
export interface CalendarError {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
  message: string;
}
