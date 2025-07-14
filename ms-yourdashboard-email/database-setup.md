# Database Setup - MS YourDashboard Email

```sql
-- ========================================
-- MS-YOURDASHBOARD-EMAIL DATABASE SETUP
-- Script para configuración manual (sin Docker)
-- ========================================

-- 1. Crear la base de datos (ejecutar como postgres user)
CREATE DATABASE ms_yourdashboard_email;

-- 2. Conectarse a la base de datos
\c ms_yourdashboard_email;

-- 3. Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 4. Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    provider VARCHAR(50) DEFAULT 'google',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Crear tabla de emails
CREATE TABLE IF NOT EXISTS emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    message_id VARCHAR(255) UNIQUE NOT NULL,
    subject TEXT,
    from_email VARCHAR(255),
    from_name VARCHAR(255),
    to_emails TEXT[],
    body_text TEXT,
    body_html TEXT,
    received_date TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    has_attachments BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Crear índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_from_email ON emails(from_email);
CREATE INDEX IF NOT EXISTS idx_emails_received_date ON emails(received_date DESC);
CREATE INDEX IF NOT EXISTS idx_emails_subject ON emails USING GIN(to_tsvector('spanish', subject));
CREATE INDEX IF NOT EXISTS idx_emails_body ON emails USING GIN(to_tsvector('spanish', body_text));

-- 7. Verificar instalación
SELECT 'Base de datos configurada correctamente' AS status;

-- 8. Mostrar tablas creadas
\dt

-- 9. Mostrar información de tablas
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public';

-- 10. Verificar extensiones instaladas
SELECT 
    extname as "Extension",
    extversion as "Version"
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pg_trgm');

-- ========================================
-- INSTRUCCIONES DE USO:
-- ========================================
-- 
-- 1. Instalar PostgreSQL en tu sistema
-- 
-- 2. Ejecutar este script:
--    psql -U postgres -f database-setup.sql
-- 
-- 3. O ejecutar manualmente:
--    psql -U postgres
--    \i database-setup.sql
--
-- 4. Configurar variables de entorno en .env:
--    DB_HOST=localhost
--    DB_PORT=5432
--    DB_USER=postgres
--    DB_PASSWORD=tu_password
--    DB_NAME=ms_yourdashboard_email
--
-- ========================================
```