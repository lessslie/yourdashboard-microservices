-- =====================================
-- FUNCIONES Y PROCEDIMIENTOS
-- =====================================
-- Archivo: 12_functions.sql
-- Descripción: Funciones útiles actualizadas para UUID

-- =====================================
-- FUNCIONES DE LIMPIEZA
-- =====================================

-- Función: Limpiar sesiones expiradas
CREATE OR REPLACE FUNCTION limpiar_sesiones_expiradas()
RETURNS INTEGER AS $$
DECLARE
    sesiones_eliminadas INTEGER;
BEGIN
    DELETE FROM sesiones_jwt WHERE expira_en < NOW();
    GET DIAGNOSTICS sesiones_eliminadas = ROW_COUNT;
    RETURN sesiones_eliminadas;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- FUNCIONES DE ESTADÍSTICAS
-- =====================================

-- Función: Obtener estadísticas del sistema
CREATE OR REPLACE FUNCTION obtener_estadisticas_sistema()
RETURNS TABLE (
    total_usuarios INTEGER,
    usuarios_activos INTEGER,
    total_cuentas_gmail INTEGER,
    cuentas_gmail_activas INTEGER,
    total_emails_sincronizados BIGINT,
    sesiones_activas INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM usuarios_principales) as total_usuarios,
        (SELECT COUNT(*)::INTEGER FROM usuarios_principales WHERE estado = 'activo') as usuarios_activos,
        (SELECT COUNT(*)::INTEGER FROM cuentas_gmail_asociadas) as total_cuentas_gmail,
        (SELECT COUNT(*)::INTEGER FROM cuentas_gmail_asociadas WHERE esta_activa = TRUE) as cuentas_gmail_activas,
        (SELECT COUNT(*) FROM emails_sincronizados) as total_emails_sincronizados,
        (SELECT COUNT(*)::INTEGER FROM sesiones_jwt WHERE esta_activa = TRUE AND expira_en > NOW()) as sesiones_activas;
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener cuentas Gmail de un usuario (UUID)
CREATE OR REPLACE FUNCTION obtener_cuentas_gmail_usuario(p_usuario_id UUID)
RETURNS TABLE (
    cuenta_id UUID,
    email_gmail VARCHAR,
    nombre_cuenta VARCHAR,
    alias_personalizado VARCHAR,
    fecha_conexion TIMESTAMP,
    ultima_sincronizacion TIMESTAMP,
    emails_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cga.id,
        cga.email_gmail,
        cga.nombre_cuenta,
        cga.alias_personalizado,
        cga.fecha_conexion,
        cga.ultima_sincronizacion,
        COALESCE(email_counts.count, 0) as emails_count
    FROM cuentas_gmail_asociadas cga
    LEFT JOIN (
        SELECT cuenta_gmail_id, COUNT(*) as count 
        FROM emails_sincronizados 
        GROUP BY cuenta_gmail_id
    ) email_counts ON cga.id = email_counts.cuenta_gmail_id
    WHERE cga.usuario_principal_id = p_usuario_id 
    AND cga.esta_activa = TRUE
    ORDER BY cga.fecha_conexion DESC;
END;
$$ LANGUAGE plpgsql;

-- Función: Estadísticas de emails por cuenta (UUID)
CREATE OR REPLACE FUNCTION obtener_stats_emails_cuenta(p_cuenta_id UUID)
RETURNS TABLE (
    total_emails BIGINT,
    emails_no_leidos BIGINT,
    emails_leidos BIGINT,
    emails_con_adjuntos BIGINT,
    ultimo_email_fecha TIMESTAMP,
    remitentes_frecuentes JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_emails,
        COUNT(CASE WHEN esta_leido = FALSE THEN 1 END) as emails_no_leidos,
        COUNT(CASE WHEN esta_leido = TRUE THEN 1 END) as emails_leidos,
        COUNT(CASE WHEN tiene_adjuntos = TRUE THEN 1 END) as emails_con_adjuntos,
        MAX(fecha_recibido) as ultimo_email_fecha,
        (
            SELECT json_agg(
                json_build_object(
                    'email', remitente_email,
                    'nombre', remitente_nombre,
                    'count', count
                )
            )
            FROM (
                SELECT 
                    remitente_email,
                    remitente_nombre,
                    COUNT(*) as count
                FROM emails_sincronizados 
                WHERE cuenta_gmail_id = p_cuenta_id 
                AND remitente_email IS NOT NULL
                GROUP BY remitente_email, remitente_nombre
                ORDER BY count DESC
                LIMIT 5
            ) top_remitentes
        ) as remitentes_frecuentes
    FROM emails_sincronizados 
    WHERE cuenta_gmail_id = p_cuenta_id;
END;
$$ LANGUAGE plpgsql;

-- Función: Reporte de emails antiguos (UUID)
CREATE OR REPLACE FUNCTION obtener_reporte_emails_antiguos(
    p_dias_antiguedad INTEGER DEFAULT 365
)
RETURNS TABLE (
    cuenta_gmail_id UUID,
    email_gmail VARCHAR,
    emails_antiguos BIGINT,
    fecha_mas_antigua TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        es.cuenta_gmail_id,
        cga.email_gmail,
        COUNT(*) as emails_antiguos,
        MIN(es.fecha_recibido) as fecha_mas_antigua
    FROM emails_sincronizados es
    JOIN cuentas_gmail_asociadas cga ON es.cuenta_gmail_id = cga.id
    WHERE es.fecha_recibido < NOW() - INTERVAL '1 day' * p_dias_antiguedad
    GROUP BY es.cuenta_gmail_id, cga.email_gmail
    ORDER BY emails_antiguos DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- FUNCIONES DE GESTIÓN
-- =====================================

-- Función: Eliminar cuenta Gmail de forma segura (UUID)
CREATE OR REPLACE FUNCTION eliminar_cuenta_gmail_segura(p_cuenta_id UUID)
RETURNS JSON AS $$
DECLARE
    cuenta_info RECORD;
    emails_count INTEGER;
BEGIN
    -- Obtener info antes de borrar
    SELECT email_gmail, usuario_principal_id 
    INTO cuenta_info
    FROM cuentas_gmail_asociadas 
    WHERE id = p_cuenta_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Cuenta no encontrada');
    END IF;
    
    -- Contar emails que se van a borrar
    SELECT COUNT(*) INTO emails_count 
    FROM emails_sincronizados 
    WHERE cuenta_gmail_id = p_cuenta_id;
    
    -- Borrar (CASCADE hace la magia)
    DELETE FROM cuentas_gmail_asociadas WHERE id = p_cuenta_id;
    
    RETURN json_build_object(
        'success', true,
        'cuenta_eliminada', cuenta_info.email_gmail,
        'emails_eliminados', emails_count
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- FUNCIONES DE SISTEMA DE SEMÁFORO
-- =====================================

-- Función: Calcular estado del semáforo
CREATE OR REPLACE FUNCTION calculate_traffic_light_status(days_elapsed INTEGER)
RETURNS VARCHAR(10) AS $$
BEGIN
    IF days_elapsed >= 5 THEN
        RETURN 'red';
    ELSIF days_elapsed = 4 THEN
        RETURN 'orange';  
    ELSIF days_elapsed = 3 THEN
        RETURN 'yellow';
    ELSE
        RETURN 'green';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Función: Marcar email como respondido (UUID)
CREATE OR REPLACE FUNCTION mark_email_as_replied(gmail_message_id_param VARCHAR(255))
RETURNS TABLE (
    email_id UUID,
    old_status VARCHAR(10),
    new_status VARCHAR(10),
    days_saved INTEGER
) AS $$
DECLARE 
    email_record RECORD;
BEGIN
    SELECT id, days_without_reply, traffic_light_status 
    INTO email_record
    FROM emails_sincronizados 
    WHERE gmail_message_id = gmail_message_id_param;

    IF FOUND THEN
        UPDATE emails_sincronizados 
        SET 
            replied_at = NOW(),
            days_without_reply = 0,
            traffic_light_status = 'green'
        WHERE gmail_message_id = gmail_message_id_param;

        RETURN QUERY
        SELECT 
            email_record.id,
            email_record.traffic_light_status,
            'green'::VARCHAR(10),
            email_record.days_without_reply;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Función: Actualizar todos los semáforos
CREATE OR REPLACE FUNCTION update_all_traffic_lights()
RETURNS TABLE (
    actualizados INTEGER,
    por_estado JSON,
    tiempo_ms INTEGER
) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    updated_count INTEGER;
    status_counts JSON;
BEGIN
    start_time := clock_timestamp();
    
    WITH email_updates AS (
        UPDATE emails_sincronizados 
        SET 
            days_without_reply = CASE 
                WHEN replied_at IS NOT NULL THEN 0
                ELSE EXTRACT(DAY FROM (NOW() - fecha_recibido))::INTEGER
            END,
            traffic_light_status = CASE 
                WHEN replied_at IS NOT NULL THEN 'green'
                ELSE calculate_traffic_light_status(
                    EXTRACT(DAY FROM (NOW() - fecha_recibido))::INTEGER
                )
            END
        WHERE fecha_recibido IS NOT NULL
        RETURNING 1
    )
    SELECT COUNT(*)::INTEGER INTO updated_count FROM email_updates;
    
    SELECT json_build_object(
        'red', COALESCE((SELECT COUNT(*) FROM emails_sincronizados WHERE traffic_light_status = 'red'), 0),
        'orange', COALESCE((SELECT COUNT(*) FROM emails_sincronizados WHERE traffic_light_status = 'orange'), 0),
        'yellow', COALESCE((SELECT COUNT(*) FROM emails_sincronizados WHERE traffic_light_status = 'yellow'), 0),
        'green', COALESCE((SELECT COUNT(*) FROM emails_sincronizados WHERE traffic_light_status = 'green'), 0)
    ) INTO status_counts;
    
    end_time := clock_timestamp();
    
    RETURN QUERY
    SELECT 
        updated_count,
        status_counts,
        EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- TRIGGERS DE AUDITORÍA
-- =====================================

-- Función para trigger: Auditar eliminaciones de cuentas
CREATE OR REPLACE FUNCTION audit_eliminacion_cuenta()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_eliminaciones (tabla, registro_id, datos_eliminados, usuario_bd)
    VALUES (
        'cuentas_gmail_asociadas',
        OLD.id,
        row_to_json(OLD)::jsonb,
        current_user
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS tr_audit_cuenta_eliminada ON cuentas_gmail_asociadas;
CREATE TRIGGER tr_audit_cuenta_eliminada
BEFORE DELETE ON cuentas_gmail_asociadas
FOR EACH ROW EXECUTE FUNCTION audit_eliminacion_cuenta();

-- Verificación
SELECT 'Funciones y triggers creados exitosamente' as resultado;
