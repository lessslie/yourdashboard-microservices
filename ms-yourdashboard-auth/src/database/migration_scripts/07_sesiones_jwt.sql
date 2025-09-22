-- =====================================
-- TABLA: sesiones_jwt
-- =====================================
-- Archivo: 07_sesiones_jwt.sql
-- Descripción: Sesiones JWT activas de usuarios principales

CREATE TABLE sesiones_jwt (
    jwt_token text NOT NULL,
    expira_en timestamp without time zone NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT now(),
    esta_activa boolean DEFAULT true,
    ip_origen inet,
    user_agent text,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_principal_id uuid,
    PRIMARY KEY(id),
    CONSTRAINT fk_sesiones_usuario_principal 
        FOREIGN KEY(usuario_principal_id) 
        REFERENCES usuarios_principales(id)
);

-- Índices de rendimiento
CREATE INDEX idx_sesiones_jwt_token 
ON sesiones_jwt USING btree (jwt_token);

CREATE INDEX idx_sesiones_expira_en 
ON sesiones_jwt USING btree (expira_en);

CREATE INDEX idx_sesiones_activa 
ON sesiones_jwt USING btree (esta_activa);

-- Comentarios de documentación
COMMENT ON TABLE sesiones_jwt IS 'Sesiones JWT activas de usuarios autenticados';
COMMENT ON COLUMN sesiones_jwt.ip_origen IS 'Dirección IP desde donde se inició la sesión';
COMMENT ON COLUMN sesiones_jwt.user_agent IS 'Información del navegador/dispositivo';
COMMENT ON COLUMN sesiones_jwt.esta_activa IS 'Permite invalidar sesiones manualmente';

-- Verificación
SELECT 'Tabla sesiones_jwt creada exitosamente' as resultado;
