-- =====================================
-- SCRIPT COMPLETO DE INICIALIZACIÓN MS-AUTH
-- Para replicar la base de datos exactamente como funciona
-- =====================================

-- =====================================
-- PASO 1: CREAR LA BASE DE DATOS
-- =====================================
-- Ejecutar PRIMERO como usuario postgres:
-- psql -U postgres

-- Crear la base de datos
CREATE DATABASE ms_yourdashboard_auth;

-- Conectar a la base de datos
\c ms_yourdashboard_auth;

-- =====================================
-- PASO 2: CREAR LAS TABLAS
-- =====================================

-- TABLA: users (para OAuth Google)
-- Almacena información de usuarios autenticados con Google
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITHOUT TIME ZONE,
  provider VARCHAR(50) DEFAULT 'google'::character varying,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- TABLA: accounts (para autenticación tradicional)
-- Almacena cuentas con email/password
CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- TABLA: sessions (para JWT tradicional)
-- Almacena sesiones activas de usuarios tradicionales
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  account_id INTEGER,
  jwt_token TEXT NOT NULL,
  expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITHOUT TIME ZONE
);

-- TABLA: oauth_connections (para conectar providers)
-- Almacena conexiones OAuth de cuentas tradicionales
CREATE TABLE oauth_connections (
  id SERIAL PRIMARY KEY,
  account_id INTEGER,
  provider VARCHAR(50) NOT NULL,
  provider_user_id VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITHOUT TIME ZONE,
  is_connected BOOLEAN DEFAULT TRUE,
  connected_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- TABLA: user_tokens (para tokens OAuth Google)
-- Almacena tokens de acceso para usuarios de Google
CREATE TABLE user_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- =====================================
-- PASO 3: CREAR ÍNDICES
-- =====================================

-- Índices para users
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);

-- Índices para accounts
CREATE INDEX idx_accounts_email ON accounts(email);

-- Índices para sessions
CREATE INDEX idx_sessions_account_id ON sessions(account_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_jwt_token ON sessions(jwt_token);

-- Índices para oauth_connections
CREATE INDEX idx_oauth_connections_account_id ON oauth_connections(account_id);
CREATE INDEX idx_oauth_connections_provider ON oauth_connections(provider);
CREATE INDEX idx_oauth_connections_provider_user_id ON oauth_connections(provider_user_id);

-- Índices para user_tokens
-- (ya tiene índice automático por PRIMARY KEY)

-- =====================================
-- PASO 4: CREAR CONSTRAINTS
-- =====================================

-- Constraints para oauth_connections
ALTER TABLE oauth_connections 
ADD CONSTRAINT oauth_connections_account_id_provider_key UNIQUE (account_id, provider);

-- Constraints para user_tokens
ALTER TABLE user_tokens 
ADD CONSTRAINT user_tokens_user_id_key UNIQUE (user_id);

-- =====================================
-- PASO 5: CREAR FOREIGN KEYS
-- =====================================

-- Foreign keys para sessions
ALTER TABLE sessions 
ADD CONSTRAINT sessions_account_id_fkey 
FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

-- Foreign keys para oauth_connections
ALTER TABLE oauth_connections 
ADD CONSTRAINT oauth_connections_account_id_fkey 
FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

-- Foreign keys para user_tokens
ALTER TABLE user_tokens 
ADD CONSTRAINT user_tokens_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id);

-- =====================================
-- PASO 6: DATOS DE PRUEBA (OPCIONAL)
-- =====================================

-- Usuarios de prueba para autenticación tradicional
-- Contraseña: "password123" (hasheada con bcrypt)
INSERT INTO accounts (email, password_hash, name, is_email_verified) VALUES 
('admin@test.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin Test', TRUE),
('user@test.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'User Test', FALSE);

-- Usuarios de prueba para OAuth Google
INSERT INTO users (google_id, email, name, provider) VALUES 
('google_test_123', 'oauth@test.com', 'OAuth Test User', 'google'),
('google_test_456', 'demo@test.com', 'Demo OAuth User', 'google');

-- =====================================
-- PASO 7: FUNCIONES ÚTILES
-- =====================================

-- Función para limpiar sesiones expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas de usuarios
CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS TABLE (
    total_accounts INTEGER,
    verified_accounts INTEGER,
    oauth_users INTEGER,
    active_sessions INTEGER,
    total_tokens INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM accounts) as total_accounts,
        (SELECT COUNT(*)::INTEGER FROM accounts WHERE is_email_verified = TRUE) as verified_accounts,
        (SELECT COUNT(*)::INTEGER FROM users) as oauth_users,
        (SELECT COUNT(*)::INTEGER FROM sessions WHERE is_active = TRUE AND expires_at > NOW()) as active_sessions,
        (SELECT COUNT(*)::INTEGER FROM user_tokens) as total_tokens;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- PASO 8: VERIFICACIÓN
-- =====================================

-- Mostrar todas las tablas creadas
\dt

-- Mostrar estadísticas
SELECT * FROM get_user_stats();

-- Mostrar estructura de tablas principales
\d users
\d accounts
\d sessions
\d oauth_connections
\d user_tokens

-- =====================================
-- INSTRUCCIONES DE USO:
-- =====================================
-- 
-- PARA DESARROLLADORES:
-- 1. Tener PostgreSQL instalado
-- 2. Ejecutar: psql -U postgres -f init_ms_auth.sql
-- 3. Configurar variables de entorno en .env:
--    DB_HOST=localhost
--    DB_PORT=5432
--    DB_NAME=ms_yourdashboard_auth
--    DB_USER=postgres
--    DB_PASSWORD=tu_password
--    JWT_SECRET=tu_jwt_secret_largo_y_seguro
--    GOOGLE_CLIENT_ID=tu_google_client_id
--    GOOGLE_CLIENT_SECRET=tu_google_client_secret
--
-- CREDENCIALES DE PRUEBA:
-- Email: admin@test.com o user@test.com
-- Contraseña: password123
--
-- COMANDOS ÚTILES:
-- - Ver estadísticas: SELECT * FROM get_user_stats();
-- - Limpiar sesiones: SELECT cleanup_expired_sessions();
-- - Ver tablas: \dt
-- - Ver estructura: \d nombre_tabla
-- =====================================

-- Mensaje de éxito
SELECT 'Base de datos ms_yourdashboard_auth configurada correctamente ✅' as status;