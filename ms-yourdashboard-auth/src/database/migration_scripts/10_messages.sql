-- =====================================
-- TABLA: messages
-- =====================================
-- Archivo: 10_messages.sql
-- Descripción: Mensajes individuales de WhatsApp

CREATE TABLE messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL,
    phone varchar(20) NOT NULL,
    message text NOT NULL,
    timestamp timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    whatsapp_account_id uuid,
    PRIMARY KEY(id),
    CONSTRAINT fk_messages_conversation 
        FOREIGN KEY(conversation_id) 
        REFERENCES conversations(id),
    CONSTRAINT fk_messages_whatsapp_account 
        FOREIGN KEY(whatsapp_account_id) 
        REFERENCES whatsapp_accounts(id)
);

-- Índices de rendimiento
CREATE INDEX idx_messages_conversation 
ON messages USING btree (conversation_id);

CREATE INDEX idx_messages_timestamp 
ON messages USING btree (timestamp DESC);

CREATE INDEX idx_messages_message_text 
ON messages USING gin (to_tsvector('spanish'::regconfig, message));

-- Comentarios de documentación
COMMENT ON TABLE messages IS 'Mensajes individuales de WhatsApp en cada conversación';
COMMENT ON COLUMN messages.phone IS 'Número de teléfono del remitente';
COMMENT ON COLUMN messages.message IS 'Contenido del mensaje';
COMMENT ON COLUMN messages.timestamp IS 'Fecha y hora real del mensaje';
COMMENT ON COLUMN messages.created_at IS 'Fecha y hora de guardado en BD';

-- Verificación
SELECT 'Tabla messages creada exitosamente' as resultado;
