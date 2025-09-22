-- =====================================
-- TABLA: conversations
-- =====================================
-- Archivo: 09_conversations.sql
-- Descripción: Conversaciones de WhatsApp por cuenta

CREATE TABLE conversations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    phone varchar(20) NOT NULL,
    name varchar(100),
    last_message text,
    last_message_date timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    whatsapp_account_id uuid,
    PRIMARY KEY(id),
    CONSTRAINT fk_conversations_whatsapp_account 
        FOREIGN KEY(whatsapp_account_id) 
        REFERENCES whatsapp_accounts(id)
);

-- Índices de rendimiento
CREATE INDEX idx_conversations_phone 
ON conversations USING btree (phone);

CREATE INDEX idx_conversations_last_message_date 
ON conversations USING btree (last_message_date DESC);

CREATE INDEX idx_conversations_name_text 
ON conversations USING gin (to_tsvector('spanish'::regconfig, (name)::text));

-- Comentarios de documentación
COMMENT ON TABLE conversations IS 'Conversaciones de WhatsApp asociadas a cuentas Business';
COMMENT ON COLUMN conversations.phone IS 'Número de teléfono del contacto';
COMMENT ON COLUMN conversations.name IS 'Nombre del contacto (opcional)';
COMMENT ON COLUMN conversations.last_message IS 'Último mensaje de la conversación';
COMMENT ON COLUMN conversations.last_message_date IS 'Fecha del último mensaje';

-- Verificación
SELECT 'Tabla conversations creada exitosamente' as resultado;
