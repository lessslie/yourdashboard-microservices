// ms-yourdashboard-calendar/src/modules/calendar/utils/conversion.utils.ts

import { 
  GoogleCalendarEvent, 
  CalendarEventMetadata,
  CreateEventRequestBody,
  UpdateEventRequestBody 
} from '../interfaces/calendar-types';
import { EventMetadataDB } from '../../../core/database/database.service';

// ================================
// 🔄 CONVERSION UTILITIES
// ================================

/**
 * Convierte un evento de Google Calendar API a EventMetadata tipado
 */
export function convertAPIToEventMetadata(apiEvent: GoogleCalendarEvent): CalendarEventMetadata {
  return {
    id: apiEvent.id || '',
    summary: apiEvent.summary || 'Sin título',
    location: apiEvent.location || undefined,
    description: apiEvent.description || undefined,
    startTime: new Date(apiEvent.start?.dateTime || apiEvent.start?.date || ''),
    endTime: new Date(apiEvent.end?.dateTime || apiEvent.end?.date || ''),
    attendees: apiEvent.attendees?.map(a => a.email || '').filter(Boolean) || [],
    isAllDay: !!apiEvent.start?.date, // Si tiene date en lugar de dateTime, es toddo el día
    status: apiEvent.status || 'confirmed'
  };
}

/**
 * Convierte un evento de BD a EventMetadata tipado
 */
export function convertDBToEventMetadata(dbEvent: EventMetadataDB): CalendarEventMetadata {
  return {
    id: dbEvent.google_event_id,
    summary: dbEvent.summary || 'Sin título',
    location: dbEvent.location,
    description: dbEvent.description,
    startTime: dbEvent.start_time || new Date(),
    endTime: dbEvent.end_time || new Date(),
    attendees: dbEvent.attendees || [],
    isAllDay: false, // Por ahora asumimos que no son de toddo el día
    status: 'confirmed'
  };
}

/**
 * Convierte CreateEventRequestBody a objeto para Google Calendar API
 */
export function convertCreateEventToGoogleFormat(eventBody: CreateEventRequestBody): GoogleCalendarEvent {
  const googleEvent: GoogleCalendarEvent = {
    summary: eventBody.summary,
    start: {
      dateTime: eventBody.startDateTime
    },
    end: {
      dateTime: eventBody.endDateTime
    }
  };

  // Campos opcionales
  if (eventBody.location && eventBody.location.trim()) {
    googleEvent.location = eventBody.location.trim();
  }

  if (eventBody.description && eventBody.description.trim()) {
    googleEvent.description = eventBody.description.trim();
  }

  // Asistentes (si existen y son válidos)
  if (eventBody.attendees && Array.isArray(eventBody.attendees) && eventBody.attendees.length > 0) {
    const validAttendees = eventBody.attendees
      .filter((email: string) => email && email.trim() && email.includes('@'))
      .map((email: string) => ({ email: email.trim() }));
    
    if (validAttendees.length > 0) {
      googleEvent.attendees = validAttendees;
    }
  }

  return googleEvent;
}

/**
 * Convierte UpdateEventRequestBody a objeto para Google Calendar API
 */
export function convertUpdateEventToGoogleFormat(eventBody: UpdateEventRequestBody): Partial<GoogleCalendarEvent> {
  const updateData: Partial<GoogleCalendarEvent> = {};
  
  if (eventBody.summary) updateData.summary = eventBody.summary;
  if (eventBody.location) updateData.location = eventBody.location;
  if (eventBody.description) updateData.description = eventBody.description;
  if (eventBody.startDateTime) updateData.start = { dateTime: eventBody.startDateTime };
  if (eventBody.endDateTime) updateData.end = { dateTime: eventBody.endDateTime };
  if (eventBody.attendees) updateData.attendees = eventBody.attendees.map(email => ({ email }));

  return updateData;
}

// ================================
// 🔍 VALIDATION UTILITIES  
// ================================

/**
 * Valida que un objeto tenga la estructura básica de un evento de Google Calendar
 */
export function isValidGoogleCalendarEvent(obj: unknown): obj is GoogleCalendarEvent {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  const event = obj as Record<string, unknown>;
  return typeof event.id === 'string' || typeof event.summary === 'string';
}

/**
 * Valida que un request body tenga los campos requeridos para crear evento
 */
export function isValidCreateEventBody(body: unknown): body is CreateEventRequestBody {
  if (typeof body !== 'object' || body === null) {
    return false;
  }
  
  const eventBody = body as Record<string, unknown>;
  return typeof eventBody.summary === 'string' && 
         typeof eventBody.startDateTime === 'string' && 
         typeof eventBody.endDateTime === 'string';
}

/**
 * Extrae email seguro de un aclRuleId
 */
export function extractEmailFromAclRuleId(aclRuleId: string): string {
  return aclRuleId.startsWith('user:') ? aclRuleId.substring(5) : aclRuleId;
}

/**
 * Obtiene título seguro de un evento para logging
 */
export function getSafeEventTitle(eventBody: unknown): string {
  if (typeof eventBody === 'object' && eventBody !== null) {
    const body = eventBody as Record<string, unknown>;
    if (typeof body.summary === 'string') {
      return body.summary;
    }
  }
  return 'Evento sin título';
}