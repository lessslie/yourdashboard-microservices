-- =====================================
-- TABLA: events_sincronizados
-- =====================================
-- Archivo: 06_events_sincronizados.sql
-- Descripción: Eventos de Google Calendar sincronizados

CREATE TABLE events_sincronizados (
    google_event_id varchar(255) NOT NULL,
    summary text,
    location text,
    description text,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    attendees text[],
    fecha_sincronizado timestamp with time zone DEFAULT now(),
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    cuenta_gmail_id uuid,
    PRIMARY KEY(id),
    CONSTRAINT events_sincronizados_cuenta_gmail_id_fkey 
        FOREIGN KEY(cuenta_gmail_id) 
        REFERENCES cuentas_gmail_asociadas(id)
);

-- Índices de rendimiento
CREATE INDEX idx_events_start_time 
ON events_sincronizados USING btree (start_time);

CREATE INDEX idx_events_google_id 
ON events_sincronizados USING btree (google_event_id);

CREATE INDEX idx_events_sync_date 
ON events_sincronizados USING btree (fecha_sincronizado);

CREATE INDEX idx_events_text_search 
ON events_sincronizados USING gin (
    to_tsvector('spanish'::regconfig, 
        ((((COALESCE(summary, ''::text) || ' '::text) || 
           COALESCE(description, ''::text)) || ' '::text) || 
           COALESCE(location, ''::text)))
);

CREATE UNIQUE INDEX events_sincronizados_cuenta_gmail_google_event_unique 
ON events_sincronizados USING btree (cuenta_gmail_id, google_event_id);

-- Comentarios de documentación
COMMENT ON TABLE events_sincronizados IS 'Eventos de Google Calendar sincronizados';
COMMENT ON COLUMN events_sincronizados.summary IS 'Título del evento';
COMMENT ON COLUMN events_sincronizados.attendees IS 'Lista de emails de asistentes';
COMMENT ON COLUMN events_sincronizados.start_time IS 'Fecha y hora de inicio (con timezone)';
COMMENT ON COLUMN events_sincronizados.end_time IS 'Fecha y hora de fin (con timezone)';

-- Verificación
SELECT 'Tabla events_sincronizados creada exitosamente' as resultado;
