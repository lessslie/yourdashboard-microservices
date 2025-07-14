-- =====================================
-- SCRIPT DE INICIALIZACIÓN MS-AUTH
-- =====================================

-- 1. Crear la base de datos (ejecutar como superusuario)
-- CREATE DATABASE ms_yourdashboard_auth;

-- 2. Conectar a la base de datos
-- \c ms_yourdashboard_auth;

-- =====================================
-- TABLA: users
-- Almacena información básica de usuarios autenticados
-- =====================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  provider VARCHAR(50) DEFAULT 'google',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================
-- TABLA: user_tokens
-- Almacena tokens de acceso para otros microservicios
-- =====================================
CREATE TABLE user_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT user_tokens_user_id_key UNIQUE (user_id),
  CONSTRAINT user_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX idx_user_tokens_expires_at ON user_tokens(expires_at);

-- =====================================
-- DATOS DE PRUEBA (OPCIONAL)
-- =====================================
-- Uncomment para insertar datos de prueba
/*
INSERT INTO users (google_id, email, name, provider) VALUES 
('test123', 'test@example.com', 'Usuario Test', 'google'),
('test456', 'demo@example.com', 'Usuario Demo', 'google');
*/

-- =====================================
-- VERIFICACIÓN DE TABLAS
-- =====================================
-- Ver estructura de tablas
\d users;
\d user_tokens;

-- Ver datos
SELECT 'users' as tabla, count(*) as registros FROM users
UNION ALL
SELECT 'user_tokens' as tabla, count(*) as registros FROM user_tokens;

-- =====================================
-- COMANDOS ÚTILES PARA DEBUGGING
-- =====================================
-- Ver usuarios con tokens
/*
SELECT 
  u.id,
  u.name,
  u.email,
  u.created_at,
  ut.expires_at,
  CASE 
    WHEN ut.expires_at > NOW() THEN 'VÁLIDO'
    WHEN ut.expires_at <= NOW() THEN 'EXPIRADO'
    ELSE 'SIN TOKEN'
  END as token_status
FROM users u
LEFT JOIN user_tokens ut ON u.id = ut.user_id
ORDER BY u.created_at DESC;
*/

-- Limpiar datos (CUIDADO - BORRA TODO)
/*
TRUNCATE TABLE user_tokens CASCADE;
TRUNCATE TABLE users RESTART IDENTITY CASCADE;
*/

-- =====================================
-- BACKUP Y RESTORE
-- =====================================
-- Crear backup:
-- pg_dump -U postgres -d ms_yourdashboard_auth > backup_ms_auth.sql

-- Restaurar backup:
-- psql -U postgres -d ms_yourdashboard_auth < backup_ms_auth.sql