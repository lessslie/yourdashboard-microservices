-- =====================================
-- NUEVA ARQUITECTURA - YOURDASHBOARD
-- =====================================
CREATE DATABASE ms_yourdashboard_auth;

-- 📋 TABLA 1: usuarios_principales
-- Un registro por usuario que se registra con email/password
CREATE TABLE usuarios_principales (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  fecha_registro TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  ultima_actualizacion TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  estado VARCHAR(20) DEFAULT 'activo', -- activo, suspendido, eliminado
  email_verificado BOOLEAN DEFAULT FALSE
);

-- 📧 TABLA 2: cuentas_gmail_asociadas  
-- Múltiples cuentas Gmail por usuario principal
CREATE TABLE cuentas_gmail_asociadas (
  id SERIAL PRIMARY KEY,
  usuario_principal_id INTEGER NOT NULL,
  email_gmail VARCHAR(255) NOT NULL,
  nombre_cuenta VARCHAR(255) NOT NULL, -- Nombre del titular de la cuenta Gmail
  google_id VARCHAR(255) UNIQUE NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expira_en TIMESTAMP WITHOUT TIME ZONE,
  fecha_conexion TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  ultima_sincronizacion TIMESTAMP WITHOUT TIME ZONE,
  esta_activa BOOLEAN DEFAULT TRUE,
  alias_personalizado VARCHAR(100), -- "Gmail Personal", "Trabajo", etc.
  UNIQUE(usuario_principal_id, email_gmail)
);
  -- Constraint: Un usuario no puede conectar la misma cuenta Gmail dos veces

-- 📨 TABLA 3: emails_sincronizados
-- Metadata de emails para listas rápidas (NO contenido completo)
CREATE TABLE emails_sincronizados (
  id SERIAL PRIMARY KEY,
  cuenta_gmail_id INTEGER NOT NULL,
  gmail_message_id VARCHAR(255) NOT NULL, -- ID del mensaje en Gmail
  asunto TEXT,
  remitente_email TEXT,
  remitente_nombre TEXT,
  destinatario_email TEXT,
  fecha_recibido TIMESTAMP WITHOUT TIME ZONE,
  esta_leido BOOLEAN DEFAULT FALSE,
  tiene_adjuntos BOOLEAN DEFAULT FALSE,
  etiquetas_gmail TEXT[], -- Array de labels de Gmail
  tamano_bytes INTEGER, 
  fecha_sincronizado TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  -- Constraint: Un mensaje de Gmail no se puede duplicar por cuenta
  UNIQUE(cuenta_gmail_id, gmail_message_id)
);

-- 🔐 TABLA 4: sesiones_jwt
-- Sesiones de los usuarios principales (JWT tradicional)
CREATE TABLE sesiones_jwt (
  id SERIAL PRIMARY KEY,
  usuario_principal_id INTEGER NOT NULL,
  jwt_token TEXT NOT NULL,
  expira_en TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  fecha_creacion TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  esta_activa BOOLEAN DEFAULT TRUE,
  ip_origen INET,
  user_agent TEXT
);

-- =====================================
-- PASO 3: FOREIGN KEYS
-- =====================================

-- FK: cuentas_gmail_asociadas → usuarios_principales
ALTER TABLE cuentas_gmail_asociadas 
ADD CONSTRAINT fk_cuentas_gmail_usuario_principal 
FOREIGN KEY (usuario_principal_id) 
REFERENCES usuarios_principales(id) 
ON DELETE CASCADE;

-- FK: emails_sincronizados → cuentas_gmail_asociadas
ALTER TABLE emails_sincronizados 
ADD CONSTRAINT fk_emails_cuenta_gmail 
FOREIGN KEY (cuenta_gmail_id) 
REFERENCES cuentas_gmail_asociadas(id) 
ON DELETE CASCADE;

-- FK: sesiones_jwt → usuarios_principales
ALTER TABLE sesiones_jwt 
ADD CONSTRAINT fk_sesiones_usuario_principal 
FOREIGN KEY (usuario_principal_id) 
REFERENCES usuarios_principales(id) 
ON DELETE CASCADE;

-- =====================================
-- PASO 4: ÍNDICES PARA RENDIMIENTO
-- =====================================

-- Índices para usuarios_principales
CREATE INDEX idx_usuarios_principales_email ON usuarios_principales(email);
CREATE INDEX idx_usuarios_principales_estado ON usuarios_principales(estado);

-- Índices para cuentas_gmail_asociadas
CREATE INDEX idx_cuentas_gmail_usuario_principal ON cuentas_gmail_asociadas(usuario_principal_id);
CREATE INDEX idx_cuentas_gmail_email ON cuentas_gmail_asociadas(email_gmail);
CREATE INDEX idx_cuentas_gmail_google_id ON cuentas_gmail_asociadas(google_id);
CREATE INDEX idx_cuentas_gmail_activa ON cuentas_gmail_asociadas(esta_activa);

-- Índices para emails_sincronizados  
CREATE INDEX idx_emails_cuenta_gmail ON emails_sincronizados(cuenta_gmail_id);
CREATE INDEX idx_emails_fecha_recibido ON emails_sincronizados(fecha_recibido DESC);
CREATE INDEX idx_emails_gmail_message_id ON emails_sincronizados(gmail_message_id);
CREATE INDEX idx_emails_esta_leido ON emails_sincronizados(esta_leido);
CREATE INDEX idx_emails_remitente ON emails_sincronizados(remitente_email);

-- Índices para sesiones_jwt
CREATE INDEX idx_sesiones_usuario_principal ON sesiones_jwt(usuario_principal_id);
CREATE INDEX idx_sesiones_jwt_token ON sesiones_jwt(jwt_token);
CREATE INDEX idx_sesiones_expira_en ON sesiones_jwt(expira_en);
CREATE INDEX idx_sesiones_activa ON sesiones_jwt(esta_activa);

-- =====================================
-- PASO 5: FUNCIONES ÚTILES
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

-- Función: Obtener cuentas Gmail de un usuario
CREATE OR REPLACE FUNCTION obtener_cuentas_gmail_usuario(p_usuario_id INTEGER)
RETURNS TABLE (
    cuenta_id INTEGER,
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

-- =====================================

-- =====================================
-- PASO 6: VERIFICACIÓN
-- =====================================

-- Mostrar todas las tablas
\dt

-- Mostrar estadísticas del sistema
SELECT * FROM obtener_estadisticas_sistema();

-- Mostrar cuentas Gmail del usuario Alonso (ID=1)
SELECT * FROM obtener_cuentas_gmail_usuario(1);

-- Verificar estructura de las tablas principales
\d usuarios_principales
\d cuentas_gmail_asociadas  
\d emails_sincronizados
\d sesiones_jwt

-- =====================================
-- PASO 7: COMANDOS ÚTILES
-- =====================================

-- Limpiar sesiones expiradas
-- SELECT limpiar_sesiones_expiradas();

-- Ver relaciones entre tablas
-- SELECT 
--     tc.table_name, 
--     kcu.column_name, 
--     ccu.table_name AS foreign_table_name,
--     ccu.column_name AS foreign_column_name 
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
-- WHERE constraint_type = 'FOREIGN KEY';
-- =====================================
-- OPTIMIZACIONES PARA METADATA DE EMAILS
-- =====================================

-- 🔍 Índices optimizados para búsqueda rápida

-- Índice para búsqueda por texto (asunto, remitente, destinatario)
CREATE INDEX idx_emails_search_text 
ON emails_sincronizados 
USING gin(to_tsvector('spanish', 
  COALESCE(asunto, '') || ' ' || 
  COALESCE(remitente_email, '') || ' ' || 
  COALESCE(remitente_nombre, '') || ' ' || 
  COALESCE(destinatario_email, '')
));

-- Índice compuesto para filtros comunes
CREATE INDEX idx_emails_filters 
ON emails_sincronizados(cuenta_gmail_id, esta_leido, tiene_adjuntos, fecha_recibido DESC);

-- Índice para búsqueda por remitente específico
CREATE INDEX idx_emails_remitente_specific 
ON emails_sincronizados(cuenta_gmail_id, remitente_email) 
WHERE remitente_email IS NOT NULL;

-- Índice para emails no leídos (consulta frecuente)
CREATE INDEX idx_emails_unread 
ON emails_sincronizados(cuenta_gmail_id, fecha_recibido DESC) 
WHERE esta_leido = FALSE;

-- =====================================
-- 📊 FUNCIONES DE ESTADÍSTICAS Y BÚSQUEDA
-- =====================================

-- Función para estadísticas rápidas por cuenta
CREATE OR REPLACE FUNCTION obtener_stats_emails_cuenta(p_cuenta_id INTEGER)
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

-- Función para limpieza automática (GDPR compliance)
CREATE OR REPLACE FUNCTION limpiar_emails_viejos(
    p_dias_antiguedad INTEGER DEFAULT 90
)
RETURNS TABLE (
    cuenta_gmail_id INTEGER,
    emails_eliminados BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH deleted AS (
        DELETE FROM emails_sincronizados 
        WHERE fecha_recibido < NOW() - INTERVAL '1 day' * p_dias_antiguedad
        RETURNING cuenta_gmail_id
    )
    SELECT 
        d.cuenta_gmail_id,
        COUNT(*) as emails_eliminados
    FROM deleted d
    GROUP BY d.cuenta_gmail_id;
    
    RAISE NOTICE 'Limpieza completada para emails anteriores a % días', p_dias_antiguedad;
END;
$$ LANGUAGE plpgsql;

-- INTEGRACIÓN WHATSAPP MULTICUENTA
-- =====================================

-- 📱 TABLA: whatsapp_accounts
-- Cada cuenta de WhatsApp conectada por un usuario
CREATE TABLE whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_principal_id INTEGER NOT NULL, -- Referencia al usuario principal
  phone VARCHAR(20) UNIQUE NOT NULL,
  nombre_cuenta VARCHAR(100),
  token TEXT,
  fecha_conexion TIMESTAMP DEFAULT NOW(),
  esta_activa BOOLEAN DEFAULT TRUE,
  alias_personalizado VARCHAR(100), -- Ej: "Soporte", "Ventas", etc.
  CONSTRAINT fk_whatsapp_usuario FOREIGN KEY (usuario_principal_id) 
    REFERENCES usuarios_principales(id)
    ON DELETE CASCADE
);

ALTER TABLE whatsapp_accounts
ADD COLUMN phone_number_id VARCHAR(100) UNIQUE; -- Asegura que cada cuenta de WhatsApp tenga un ID de número único

-- 💬 TABLA: conversations
-- Conversaciones por cuenta de WhatsApp
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_account_id UUID NOT NULL,
  phone VARCHAR(20),
  name VARCHAR(100),
  last_message TEXT,
  last_message_date TIMESTAMP,
  CONSTRAINT fk_conversation_whatsapp FOREIGN KEY (whatsapp_account_id) -- Referencia a la cuenta de WhatsApp 
    REFERENCES whatsapp_accounts(id) 
    ON DELETE CASCADE -- Asegura que si se elimina la cuenta, se eliminan las conversaciones
);

-- 💬 TABLA: messages
-- Mensajes de cada conversación
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  whatsapp_account_id UUID NOT NULL,
  phone VARCHAR(20),
  message TEXT,
  timestamp TIMESTAMP,
  CONSTRAINT fk_message_conversation FOREIGN KEY (conversation_id)
    REFERENCES conversations(id)
    ON DELETE CASCADE, -- Asegura que si se elimina la conversación, se eliminan los mensajes
  CONSTRAINT fk_message_whatsapp FOREIGN KEY (whatsapp_account_id)
    REFERENCES whatsapp_accounts(id)
    ON DELETE CASCADE
);

-- =====================================
-- ÍNDICES PARA WHATSAPP
-- =====================================

CREATE INDEX idx_whatsapp_accounts_usuario ON whatsapp_accounts(usuario_principal_id);
CREATE INDEX idx_conversations_account ON conversations(whatsapp_account_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_account ON messages(whatsapp_account_id);

-- =====================================
-- 📝 DOCUMENTACIÓN
-- =====================================

COMMENT ON TABLE emails_sincronizados IS 'Cache de metadata de emails - NO contiene contenido sensible';
COMMENT ON COLUMN emails_sincronizados.destinatario_email IS 'Email del destinatario principal (primer TO)';
COMMENT ON COLUMN emails_sincronizados.tamano_bytes IS 'Tamaño del email en bytes (incluye adjuntos)';
COMMENT ON FUNCTION obtener_stats_emails_cuenta IS 'Estadísticas rápidas por cuenta Gmail';
COMMENT ON FUNCTION limpiar_emails_viejos IS 'Limpieza automática de emails antiguos (GDPR compliance)';
-- =====================================
-- ✅ MENSAJE DE ÉXITO
-- =====================================
SELECT '🎯 Nueva arquitectura implementada exitosamente! 
📋 Usuarios principales: Registro tradicional
📧 Cuentas Gmail: Múltiples por usuario  
📨 Emails sincronizados: Metadata para listas
🔐 Sesiones JWT: Autenticación del usuario principal
✅ Tablas de WhatsApp multicuenta creadas correctamente!' as estado;