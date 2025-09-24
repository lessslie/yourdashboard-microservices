-- =====================================
-- TABLA: usuarios_principales
-- =====================================
-- Archivo: 02_usuarios_principales.sql
-- Descripción: Usuarios principales del sistema (tabla raíz)

CREATE TABLE usuarios_principales (
    email varchar(255) NOT NULL,
    password_hash text NOT NULL,
    nombre varchar(255) NOT NULL,
    fecha_registro timestamp without time zone DEFAULT now(),
    ultima_actualizacion timestamp without time zone DEFAULT now(),
    estado varchar(20) DEFAULT 'activo'::character varying,
    email_verificado boolean DEFAULT false,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    PRIMARY KEY(id)
);

-- Índices únicos y de rendimiento
CREATE UNIQUE INDEX usuarios_principales_email_key 
ON usuarios_principales USING btree (email);

CREATE INDEX idx_usuarios_principales_email 
ON usuarios_principales USING btree (email);

CREATE INDEX idx_usuarios_principales_estado 
ON usuarios_principales USING btree (estado);

-- Comentarios de documentación
COMMENT ON TABLE usuarios_principales IS 'Usuarios principales del sistema con autenticación email/password';
COMMENT ON COLUMN usuarios_principales.estado IS 'Estado de la cuenta: activo, suspendido, eliminado';
COMMENT ON COLUMN usuarios_principales.email_verificado IS 'Indica si el usuario confirmó su email';

-- Verificación
SELECT 'Tabla usuarios_principales creada exitosamente' as resultado;
