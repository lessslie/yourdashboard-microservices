-- =====================================
-- TABLA: emails_completos
-- =====================================
-- Archivo: 05_emails_completos.sql
-- Descripción: Contenido completo de emails (HTML, attachments, headers)

CREATE TABLE emails_completos (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    cuerpo_texto text,
    cuerpo_html text,
    fecha_guardado timestamp without time zone DEFAULT now(),
    gmail_message_id varchar(255) NOT NULL,
    headers_completos jsonb,
    adjuntos jsonb,
    thread_id varchar(255),
    labels_completos jsonb,
    email_sincronizado_id uuid,
    cuenta_gmail_id uuid,
    usuario_principal_id uuid,
    PRIMARY KEY(id),
    CONSTRAINT fk_emails_completos_sincronizados 
        FOREIGN KEY(email_sincronizado_id) 
        REFERENCES emails_sincronizados(id),
    CONSTRAINT emails_completos_cuenta_gmail_id_fkey 
        FOREIGN KEY(cuenta_gmail_id) 
        REFERENCES cuentas_gmail_asociadas(id),
    CONSTRAINT emails_completos_usuario_principal_id_fkey 
        FOREIGN KEY(usuario_principal_id) 
        REFERENCES usuarios_principales(id)
);

-- Índices de rendimiento
CREATE INDEX idx_emails_completos_gmail_id 
ON emails_completos USING btree (gmail_message_id);

-- Comentarios de documentación
COMMENT ON TABLE emails_completos IS 'Contenido completo de emails con HTML, attachments y headers';
COMMENT ON COLUMN emails_completos.cuerpo_texto IS 'Versión texto plano del email';
COMMENT ON COLUMN emails_completos.cuerpo_html IS 'Versión HTML del email';
COMMENT ON COLUMN emails_completos.headers_completos IS 'Headers completos del email en formato JSON';
COMMENT ON COLUMN emails_completos.adjuntos IS 'Información de attachments en formato JSON';
COMMENT ON COLUMN emails_completos.thread_id IS 'ID del hilo/conversación de Gmail';

-- Verificación
SELECT 'Tabla emails_completos creada exitosamente' as resultado;
