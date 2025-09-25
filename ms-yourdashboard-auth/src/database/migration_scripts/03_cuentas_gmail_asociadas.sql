-- =====================================
-- TABLA: cuentas_gmail_asociadas
-- =====================================
-- Archivo: 03_cuentas_gmail_asociadas.sql
-- Descripción: Cuentas Gmail conectadas via OAuth por cada usuario

CREATE TABLE cuentas_gmail_asociadas (
    email_gmail varchar(255) NOT NULL,
    nombre_cuenta varchar(255) NOT NULL,
    google_id varchar(255) NOT NULL,
    access_token text,
    refresh_token text,
    token_expira_en timestamp without time zone,
    fecha_conexion timestamp without time zone DEFAULT now(),
    ultima_sincronizacion timestamp without time zone,
    esta_activa boolean DEFAULT true,
    alias_personalizado varchar(100),
    consecutive_zero_syncs integer DEFAULT 0,
    backfill_checkpoint_date date,
    backfill_page_token varchar(255),
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_principal_id uuid,
    PRIMARY KEY(id),
    CONSTRAINT fk_cuentas_gmail_usuario_principal 
        FOREIGN KEY(usuario_principal_id) 
        REFERENCES usuarios_principales(id)
);

-- Índices únicos y de rendimiento
CREATE UNIQUE INDEX cuentas_gmail_asociadas_google_id_key 
ON cuentas_gmail_asociadas USING btree (google_id);

CREATE INDEX idx_cuentas_gmail_email 
ON cuentas_gmail_asociadas USING btree (email_gmail);

CREATE INDEX idx_cuentas_gmail_google_id 
ON cuentas_gmail_asociadas USING btree (google_id);

CREATE INDEX idx_cuentas_gmail_activa 
ON cuentas_gmail_asociadas USING btree (esta_activa);

CREATE UNIQUE INDEX cuentas_gmail_asociadas_usuario_email_unique 
ON cuentas_gmail_asociadas USING btree (usuario_principal_id, email_gmail);

-- Comentarios de documentación
COMMENT ON TABLE cuentas_gmail_asociadas IS 'Cuentas Gmail conectadas via OAuth por cada usuario';
COMMENT ON COLUMN cuentas_gmail_asociadas.consecutive_zero_syncs IS 'Contador para detectar cuando termina el backfill';
COMMENT ON COLUMN cuentas_gmail_asociadas.backfill_page_token IS 'Token de paginación para continuar sincronización masiva';
COMMENT ON COLUMN cuentas_gmail_asociadas.alias_personalizado IS 'Nombre personalizado para la cuenta (ej: Gmail Personal, Trabajo)';

-- Verificación
SELECT 'Tabla cuentas_gmail_asociadas creada exitosamente' as resultado;
