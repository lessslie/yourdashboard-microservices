import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueryResultRow } from 'pg';
export interface EventMetadataDB {
    id?: number;
    cuenta_gmail_id: number;
    google_event_id: string;
    summary?: string;
    location?: string;
    description?: string;
    start_time?: Date;
    end_time?: Date;
    attendees?: string[];
    created_at?: Date;
    updated_at?: Date;
}
export interface EventSearchFilters {
    cuenta_gmail_id?: number;
    search_text?: string;
    start_date?: Date;
    end_date?: Date;
}
export interface EventSearchResult {
    events: EventMetadataDB[];
    total: number;
}
export interface SyncResult {
    events_nuevos: number;
    events_actualizados: number;
    total_procesados: number;
    tiempo_ms: number;
}
export declare class DatabaseService implements OnModuleDestroy {
    private readonly configService;
    private readonly logger;
    private readonly pool;
    constructor(configService: ConfigService);
    onModuleDestroy(): Promise<void>;
    getActiveGmailAccounts(activeDays?: number, limit?: number): Promise<Array<{
        id: number;
        email_gmail: string;
        access_token: string;
        usuario_principal_id: number;
    }>>;
    query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<{
        rows: T[];
        rowCount: number;
    }>;
    syncEventsMetadata(events: EventMetadataDB[]): Promise<SyncResult>;
    getEventsPaginated(cuentaGmailId: number, page?: number, limit?: number, futureOnly?: boolean): Promise<EventSearchResult>;
    searchEventsInDB(cuentaGmailId: number, filters: EventSearchFilters, page?: number, limit?: number): Promise<EventSearchResult>;
    obtenerCuentasGmailUsuario(usuarioId: number): Promise<Array<{
        id: number;
        email_gmail: string;
        nombre_cuenta: string;
        alias_personalizado?: string;
        fecha_conexion: Date;
        ultima_sincronizacion?: Date;
        esta_activa: boolean;
        events_count: number;
    }>>;
    getEventStatsFromDB(cuentaGmailId: number): Promise<{
        total_events: number;
        upcoming_events: number;
        past_events: number;
        next_event_date?: Date;
    }>;
    getLastSyncedEvent(cuentaGmailId: number): Promise<EventMetadataDB | null>;
    healthCheck(): Promise<{
        connected: boolean;
        query_time_ms: number;
    }>;
    getGmailAccountById(cuentaGmailId: number): Promise<{
        id: number;
        email_gmail: string;
        access_token: string;
        refresh_token?: string;
        token_expira_en?: Date;
        usuario_principal_id: number;
    } | null>;
    refreshGoogleToken(cuentaGmailId: number): Promise<string | null>;
    getValidAccessToken(cuentaGmailId: number): Promise<string>;
    getGmailAccountByUserId(userId: number): Promise<{
        id: number;
        google_token: string;
        refresh_token?: string;
    } | null>;
    query_old(text: string, params?: any[]): Promise<any>;
}
