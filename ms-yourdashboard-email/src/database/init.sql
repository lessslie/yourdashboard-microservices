-- Script de inicialización para Docker PostgreSQL
-- La base de datos ya se crea automáticamente con POSTGRES_DB

-- Crear extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear extensión para búsquedas de texto
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Tabla de usuarios
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

-- Tabla de emails
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

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_from_email ON emails(from_email);
CREATE INDEX IF NOT EXISTS idx_emails_received_date ON emails(received_date DESC);
CREATE INDEX IF NOT EXISTS idx_emails_subject ON emails USING GIN(to_tsvector('spanish', subject));
CREATE INDEX IF NOT EXISTS idx_emails_body ON emails USING GIN(to_tsvector('spanish', body_text));

-- Verificar instalación
SELECT 'Tablas creadas correctamente en Docker' AS status;