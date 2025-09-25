-- =====================================
-- TABLA: audit_eliminaciones
-- =====================================
-- Archivo: 11_audit_eliminaciones.sql
-- Descripción: Auditoría de eliminaciones para tracking y compliance

CREATE TABLE audit_eliminaciones (
    tabla varchar(50),
    registro_id uuid,
    datos_eliminados jsonb,
    usuario_bd varchar(50),
    fecha_eliminacion timestamp without time zone DEFAULT now(),
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    PRIMARY KEY(id)
);

-- Índices de rendimiento
CREATE INDEX idx_audit_tabla 
ON audit_eliminaciones USING btree (tabla);

CREATE INDEX idx_audit_fecha 
ON audit_eliminaciones USING btree (fecha_eliminacion DESC);

CREATE INDEX idx_audit_usuario 
ON audit_eliminaciones USING btree (usuario_bd);

-- Comentarios de documentación
COMMENT ON TABLE audit_eliminaciones IS 'Auditoría de eliminaciones para compliance y debugging';
COMMENT ON COLUMN audit_eliminaciones.tabla IS 'Nombre de la tabla donde se eliminó el registro';
COMMENT ON COLUMN audit_eliminaciones.registro_id IS 'UUID del registro eliminado';
COMMENT ON COLUMN audit_eliminaciones.datos_eliminados IS 'Copia completa del registro eliminado en JSON';
COMMENT ON COLUMN audit_eliminaciones.usuario_bd IS 'Usuario de base de datos que realizó la eliminación';

-- Verificación
SELECT 'Tabla audit_eliminaciones creada exitosamente' as resultado;
