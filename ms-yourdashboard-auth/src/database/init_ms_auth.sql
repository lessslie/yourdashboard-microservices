-- =====================================
-- NUEVA ARQUITECTURA - YOURDASHBOARD
-- =====================================
-- Solución al problema: 1 usuario principal → N cuentas Gmail
-- Base de datos: ms_yourdashboard_auth (mantenemos el nombre)

-- =====================================
-- PASO 1: BORRAR TABLAS VIEJAS
-- =====================================

-- Borrar en orden (respetando foreign keys)
DROP TABLE IF EXISTS user_tokens CASCADE;
DROP TABLE IF EXISTS oauth_connections CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;

-- =====================================
-- PASO 2: CREAR NUEVAS TABLAS
-- =====================================

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
  remitente_email VARCHAR(255),
  remitente_nombre VARCHAR(255),
  fecha_recibido TIMESTAMP WITHOUT TIME ZONE,
  esta_leido BOOLEAN DEFAULT FALSE,
  tiene_adjuntos BOOLEAN DEFAULT FALSE,
  etiquetas_gmail TEXT[], -- Array de labels de Gmail
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
-- PASO 6: DATOS DE PRUEBA
-- =====================================

-- Usuario principal de prueba
-- Contraseña: "password123" (hasheada con bcrypt)
INSERT INTO usuarios_principales (email, password_hash, nombre, email_verificado) VALUES 
('alonso@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Alonso González', TRUE),
('admin@test.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin Test', TRUE);

-- Cuentas Gmail asociadas de ejemplo (para usuario Alonso ID=1)
INSERT INTO cuentas_gmail_asociadas (
    usuario_principal_id, email_gmail, nombre_cuenta, google_id, alias_personalizado
) VALUES 
(1, 'alonso@gmail.com', 'Alonso González', 'google_123456', 'Gmail Personal'),
(1, 'alonso.empresa@gmail.com', 'Alonso González Empresa', 'google_789012', 'Gmail Trabajo'),
(1, 'alonsito@gmail.com', 'Alonsito González', 'google_345678', 'Gmail Secundario');

-- =====================================
-- PASO 7: VERIFICACIÓN
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
-- PASO 8: COMANDOS ÚTILES
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
-- ✅ MENSAJE DE ÉXITO
-- =====================================
SELECT '🎯 Nueva arquitectura implementada exitosamente! 
📋 Usuarios principales: Registro tradicional
📧 Cuentas Gmail: Múltiples por usuario  
📨 Emails sincronizados: Metadata para listas
🔐 Sesiones JWT: Autenticación del usuario principal' as estado;