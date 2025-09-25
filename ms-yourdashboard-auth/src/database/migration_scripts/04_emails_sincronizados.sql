-- =====================================
-- TABLA: emails_sincronizados
-- =====================================
-- Archivo: 04_emails_sincronizados.sql
-- Descripción: Cache de metadata de emails - NO contiene contenido sensible completo

CREATE TABLE emails_sincronizados (
    gmail_message_id varchar(255) NOT NULL,
    asunto text,
    remitente_email text,
    remitente_nombre text,
    destinatario_email text,
    fecha_recibido timestamp without time zone,
    esta_leido boolean DEFAULT false,
    tiene_adjuntos boolean DEFAULT false,
    etiquetas_gmail text[],
    tamano_bytes integer,
    fecha_sincronizado timestamp without time zone DEFAULT now(),
    replied_at timestamp without time zone,
    days_without_reply integer DEFAULT 0,
    traffic_light_status varchar(10) DEFAULT 'green'::character varying,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    cuenta_gmail_id uuid,
    PRIMARY KEY(id),
    CONSTRAINT fk_emails_cuenta_gmail 
        FOREIGN KEY(cuenta_gmail_id) 
        REFERENCES cuentas_gmail_asociadas(id)
);

-- Índices de rendimiento
CREATE INDEX idx_emails_fecha_recibido 
ON emails_sincronizados USING btree (fecha_recibido DESC);

CREATE INDEX idx_emails_gmail_message_id 
ON emails_sincronizados USING btree (gmail_message_id);

CREATE INDEX idx_emails_esta_leido 
ON emails_sincronizados USING btree (esta_leido);

CREATE INDEX idx_emails_remitente 
ON emails_sincronizados USING btree (remitente_email);

CREATE INDEX idx_emails_traffic_light 
ON emails_sincronizados USING btree (traffic_light_status, days_without_reply);

CREATE UNIQUE INDEX emails_sincronizados_cuenta_gmail_message_unique 
ON emails_sincronizados USING btree (cuenta_gmail_id, gmail_message_id);

-- Comentarios de documentación
COMMENT ON TABLE emails_sincronizados IS 'Cache de metadata de emails - NO contiene contenido sensible';
COMMENT ON COLUMN emails_sincronizados.destinatario_email IS 'Email del destinatario principal (primer TO)';
COMMENT ON COLUMN emails_sincronizados.tamano_bytes IS 'Tamaño del email en bytes (incluye adjuntos)';
COMMENT ON COLUMN emails_sincronizados.replied_at IS 'Fecha y hora cuando se respondió el email (NULL = no respondido)';
COMMENT ON COLUMN emails_sincronizados.days_without_reply IS 'Días transcurridos sin respuesta desde fecha_recibido';
COMMENT ON COLUMN emails_sincronizados.traffic_light_status IS 'Estado del semáforo: green, yellow, orange, red';

-- Verificación
SELECT 'Tabla emails_sincronizados creada exitosamente' as resultado;
