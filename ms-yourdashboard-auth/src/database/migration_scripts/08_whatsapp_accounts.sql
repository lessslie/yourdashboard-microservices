-- =====================================
-- TABLA: whatsapp_accounts
-- =====================================
-- Archivo: 08_whatsapp_accounts.sql
-- Descripción: Cuentas de WhatsApp Business asociadas a usuarios

CREATE TABLE whatsapp_accounts (
    phone varchar(50) NOT NULL,
    nombre_cuenta varchar(255) NOT NULL,
    token text NOT NULL,
    alias_personalizado varchar(255),
    phone_number_id varchar(255) NOT NULL,
    fecha_creado timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    estado varchar(20) DEFAULT 'activo'::character varying,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_principal_id uuid,
    PRIMARY KEY(id),
    CONSTRAINT fk_whatsapp_usuario 
        FOREIGN KEY(usuario_principal_id) 
        REFERENCES usuarios_principales(id)
);

-- Índices únicos
CREATE UNIQUE INDEX whatsapp_accounts_phone_number_id_key 
ON whatsapp_accounts USING btree (phone_number_id);

-- Comentarios de documentación
COMMENT ON TABLE whatsapp_accounts IS 'Cuentas de WhatsApp Business asociadas a usuarios';
COMMENT ON COLUMN whatsapp_accounts.phone_number_id IS 'ID único de WhatsApp Business API';
COMMENT ON COLUMN whatsapp_accounts.token IS 'Token de acceso a WhatsApp Business API';
COMMENT ON COLUMN whatsapp_accounts.estado IS 'Estado de la cuenta: activo, suspendido, etc.';

-- Verificación
SELECT 'Tabla whatsapp_accounts creada exitosamente' as resultado;
