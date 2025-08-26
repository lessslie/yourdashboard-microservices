import { CalendarService } from './calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { ShareCalendarDto } from './dto/share-calendar.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ConfigService } from '@nestjs/config';
export declare class CalendarController {
    private readonly calendarService;
    private readonly configService;
    private readonly logger;
    constructor(calendarService: CalendarService, configService: ConfigService);
    getHealth(): {
        service: string;
        status: string;
        timestamp: string;
        port: string | number;
        mode: string;
    };
    listEvents(authHeader: string, cuentaGmailId: string, timeMin: string, timeMax?: string, page?: string, limit?: string): Promise<import("./calendar.service").CalendarListResponse>;
    searchEvents(authHeader: string, cuentaGmailId: string, timeMin: string, searchTerm: string, page?: string, limit?: string): Promise<import("./calendar.service").CalendarListResponse>;
    getEventById(authHeader: string, eventId: string, cuentaGmailId: string): Promise<{
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
    createEvent(authHeader: string, cuentaGmailId: string, eventBody: any): Promise<import("googleapis").calendar_v3.Schema$Event>;
    createPrivateEvent(authHeader: string, cuentaGmailId: string, dto: CreateEventDto): Promise<import("googleapis").calendar_v3.Schema$Event>;
    shareCalendar(authHeader: string, cuentaGmailId: string, body: ShareCalendarDto): Promise<import("googleapis").calendar_v3.Schema$AclRule>;
    getCalendarStats(authHeader: string, cuentaGmailId: string): Promise<import("./calendar.service").CalendarStats>;
    syncEvents(authHeader: string, cuentaGmailId: string, maxEvents?: string): Promise<{
        success: boolean;
        message: string;
        stats: {
            cuenta_gmail_id: number;
            events_nuevos: number;
            events_actualizados: number;
            tiempo_total_ms: number;
        };
    }>;
    updateEvent(authHeader: string, cuentaGmailId: string, eventId: string, eventBody: UpdateEventDto): Promise<import("googleapis").calendar_v3.Schema$Event>;
    deleteEvent(authHeader: string, cuentaGmailId: string, eventId: string): Promise<{
        message: string;
    }>;
    getEventsUnified(userId: string, timeMin: string, timeMax?: string, page?: string, limit?: string): Promise<{
        events: {
            sourceAccount: string;
            sourceAccountId: number;
            id: string;
            summary: string;
            location?: string;
            description?: string;
            startTime: Date;
            endTime: Date;
            attendees?: string[];
            isAllDay: boolean;
            status: string;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        accountsLoaded: string[];
    }>;
    searchEventsGlobal(userId: string, timeMin: string, searchTerm: string, page?: string, limit?: string): Promise<{
        events: {
            sourceAccount: string;
            sourceAccountId: number;
            id: string;
            summary: string;
            location?: string;
            description?: string;
            startTime: Date;
            endTime: Date;
            attendees?: string[];
            isAllDay: boolean;
            status: string;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        searchTerm: string;
        accountsSearched: string[];
    }>;
}
