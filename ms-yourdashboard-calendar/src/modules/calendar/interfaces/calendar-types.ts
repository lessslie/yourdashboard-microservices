

// ================================
// 🎯 GOOGLE CALENDAR API TYPES
// ================================

export interface GoogleCalendarEvent {
  id?: string;
  summary?: string;
  location?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email?: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  status?: string;
  creator?: {
    email?: string;
    displayName?: string;
  };
  organizer?: {
    email?: string;
    displayName?: string;
  };
  htmlLink?: string;
  created?: string;
  updated?: string;
  transparency?: string;
  visibility?: string;
  recurrence?: string[];
  recurringEventId?: string;
}

export interface GoogleCalendarError {
  code?: number;
  message?: string;
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
    status?: number;
  };
}

export interface CreateEventRequestBody {
  summary?: string;
  location?: string;
  description?: string;
  startDateTime?: string;
  endDateTime?: string;
  attendees?: string[];
}

export interface UpdateEventRequestBody {
  summary?: string;
  location?: string;
  description?: string;
  startDateTime?: string;
  endDateTime?: string;
  attendees?: string[];
}

// ================================
// 🎯 INTERNAL SERVICE TYPES
// ================================

export interface CalendarEventMetadata {
  id: string;
  summary: string;
  location?: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees?: string[];
  isAllDay: boolean;
  status: string;
  sourceAccount?: string;
  sourceAccountId?: string;
}

export interface CalendarListResponse {
  events: CalendarEventMetadata[];
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
    cuenta_gmail_id: string;
    events_nuevos: number;
    events_actualizados: number;
    tiempo_ms: number;
  };
}

export interface ShareCalendarResponse {
  success: boolean;
  message: string;
  shared_with: string;
  role: string;
  calendar_id: string;
}

export interface UnshareCalendarResponse {
  success: boolean;
  message: string;
  revoked_from: string;
  calendar_id: string;
}

// ================================
// 🎯 DTO INTERFACES (importadas desde otras partes)
// ================================

export interface CreateEventDto {
  summary: string;
  location?: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  attendees?: string[];
}

export interface EventSearchFilters {
  search_text?: string;
  start_date?: Date;
  end_date?: Date;
}

export interface EventMetadataDB {
  cuenta_gmail_id: string;
  google_event_id: string;
  summary?: string;
  location?: string;
  description?: string;
  start_time?: Date;
  end_time?: Date;
  attendees?: string[];
}

// ================================
// 🎯 ERROR HANDLING TYPES
// ================================

export interface CalendarServiceError extends Error {
  code?: number;
  status?: number;
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
    status?: number;
  };
}

// ================================
// 🎯 TYPE GUARDS
// ================================

export function isGoogleCalendarError(error: unknown): error is GoogleCalendarError {
  return typeof error === 'object' && error !== null && 
         ('code' in error || 'message' in error || 'response' in error);
}

export function isCalendarServiceError(error: unknown): error is CalendarServiceError {
  return error instanceof Error;
}

export function hasErrorCode(error: unknown): error is { code: number } {
  return typeof error === 'object' && error !== null && 
         'code' in error && typeof (error as { code: unknown }).code === 'number';
}

export function hasErrorMessage(error: unknown): error is { message: string } {
  return typeof error === 'object' && error !== null && 
         'message' in error && typeof (error as { message: unknown }).message === 'string';
}

// ================================
// 🎯 UTILITY FUNCTIONS
// ================================

export function safeGetErrorMessage(error: unknown): string {
  if (hasErrorMessage(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Error desconocido';
}

export function safeGetErrorCode(error: unknown): number | undefined {
  if (hasErrorCode(error)) {
    return error.code;
  }
  return undefined;
}