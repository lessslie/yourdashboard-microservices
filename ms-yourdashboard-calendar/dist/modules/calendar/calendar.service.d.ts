import { calendar_v3 } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../core/database/database.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
export interface SyncOptions {
    maxEvents?: number;
    timeMin?: string;
    timeMax?: string | number;
    futureOnly?: boolean;
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
}
export interface CalendarStats {
    totalEvents: number;
    upcomingEvents: number;
    pastEvents: number;
}
export interface CalendarEventDetail extends CalendarEventMetadata {
    creator?: string;
    organizer?: string;
    htmlLink?: string;
    sourceAccount?: string;
    sourceAccountId?: number;
}
export interface CalendarServiceError {
    message: string;
    code?: number;
    status?: number;
}
export declare class CalendarService {
    private readonly configService;
    private readonly databaseService;
    private readonly logger;
    constructor(configService: ConfigService, databaseService: DatabaseService);
    listEventsWithToken(accessToken: string, cuentaGmailId: string, timeMin: string, timeMax?: string | number | Date, page?: number, limit?: number): Promise<CalendarListResponse>;
    searchEventsWithToken(accessToken: string, cuentaGmailId: string, timeMin: string, searchTerm: string, page?: number, limit?: number): Promise<CalendarListResponse>;
    getEventByIdWithToken(accessToken: string, cuentaGmailId: string, eventId: string): Promise<{
        id: string | null | undefined;
        summary: string;
        location: string;
        description: string;
        startTime: string;
        endTime: string;
        attendees: any[];
        isAllDay: boolean;
        status: string;
        sourceAccount: undefined;
        sourceAccountId: number;
        creator: string;
        organizer: string;
        htmlLink: string;
        created: string;
        updated: string;
        transparency: string;
        visibility: string;
        recurrence: string[];
        recurringEventId: string | null;
    }>;
    createEventWithToken(accessToken: string, cuentaGmailId: string, eventBody: any): Promise<calendar_v3.Schema$Event>;
    createPrivateEventWithToken(accessToken: string, cuentaGmailId: string, dto: CreateEventDto): Promise<calendar_v3.Schema$Event>;
    updateEventWithToken(accessToken: string, cuentaGmailId: string, eventId: string, eventBody: UpdateEventDto): Promise<calendar_v3.Schema$Event>;
    deleteEventWithToken(accessToken: string, cuentaGmailId: string, eventId: string): Promise<{
        message: string;
    }>;
    shareCalendarWithToken(accessToken: string, cuentaGmailId: string, calendarId: string, userEmail: string, role: 'reader' | 'writer' | 'owner'): Promise<calendar_v3.Schema$AclRule>;
    getCalendarStatsWithToken(accessToken: string, cuentaGmailId: string): Promise<CalendarStats>;
    syncEventsWithToken(accessToken: string, cuentaGmailId: string, options?: SyncOptions): Promise<{
        success: boolean;
        message: string;
        stats: {
            cuenta_gmail_id: number;
            events_nuevos: number;
            events_actualizados: number;
            tiempo_total_ms: number;
        };
    }>;
    private getEventsFromCalendarAPI;
    private searchEventsFromCalendarAPI;
    private getStatsFromCalendarAPI;
    private convertAPIToEventMetadata;
    private convertDBToEventMetadata;
    private saveEventToDB;
    private updateEventInDB;
    private deleteEventFromDB;
    obtenerCuentasGmailUsuario(userId: number): Promise<{
        id: number;
        email_gmail: string;
        nombre_cuenta: string;
        alias_personalizado?: string;
        fecha_conexion: Date;
        ultima_sincronizacion?: Date;
        esta_activa: boolean;
        events_count: number;
    }[]>;
    getValidTokenForAccount(cuentaGmailId: number): Promise<string>;
}
