-- =====================================
-- ÍNDICES ADICIONALES OPTIMIZADOS
-- =====================================
-- Archivo: 13_indexes.sql
-- Descripción: Índices adicionales para optimizar rendimiento

-- =====================================
-- ÍNDICES PARA EMAILS_SINCRONIZADOS
-- =====================================

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

-- Índice para búsqueda de texto completo en español
CREATE INDEX idx_emails_search_text 
ON emails_sincronizados 
USING gin(to_tsvector('spanish', 
  COALESCE(asunto, '') || ' ' || 
  COALESCE(remitente_email, '') || ' ' || 
  COALESCE(remitente_nombre, '') || ' ' || 
  COALESCE(destinatario_email, '')
));

-- =====================================
-- ÍNDICES PARA SISTEMA DE SEMÁFORO
-- =====================================

-- Índice para estado del semáforo
CREATE INDEX idx_emails_traffic_light_status 
ON emails_sincronizados(traffic_light_status);

-- Índice compuesto para cuenta + estado del semáforo
CREATE INDEX idx_emails_account_traffic_status 
ON emails_sincronizados(cuenta_gmail_id, traffic_light_status);

-- Índice para días sin respuesta (solo emails pendientes)
CREATE INDEX idx_emails_days_without_reply 
ON emails_sincronizados(cuenta_gmail_id, days_without_reply DESC, fecha_recibido ASC)
WHERE replied_at IS NULL;

-- Índice para emails respondidos recientemente
CREATE INDEX idx_emails_replied_recent 
ON emails_sincronizados(cuenta_gmail_id, replied_at DESC)
WHERE replied_at IS NOT NULL;

-- =====================================
-- ÍNDICES PARA CUENTAS_GMAIL_ASOCIADAS
-- =====================================

-- Índice para estado de sincronización
CREATE INDEX idx_cuentas_gmail_sync_status 
ON cuentas_gmail_asociadas(consecutive_zero_syncs) 
WHERE consecutive_zero_syncs < 2;

-- Índice por usuario principal
CREATE INDEX idx_cuentas_gmail_usuario_principal 
ON cuentas_gmail_asociadas(usuario_principal_id);

-- =====================================
-- ÍNDICES PARA SESIONES_JWT
-- =====================================

-- Índice por usuario principal
CREATE INDEX idx_sesiones_usuario_principal 
ON sesiones_jwt(usuario_principal_id);

-- =====================================
-- ÍNDICES PARA WHATSAPP
-- =====================================

-- Índices para whatsapp_accounts
CREATE INDEX idx_whatsapp_accounts_usuario 
ON whatsapp_accounts(usuario_principal_id);

CREATE INDEX idx_whatsapp_accounts_estado 
ON whatsapp_accounts(estado);

-- Índices para conversations
CREATE INDEX idx_conversations_account 
ON conversations(whatsapp_account_id);

-- Índices para messages
CREATE INDEX idx_messages_account 
ON messages(whatsapp_account_id);

-- =====================================
-- ÍNDICES PARA EVENTS_SINCRONIZADOS
-- =====================================

-- Índice por cuenta Gmail
CREATE INDEX idx_events_cuenta_gmail 
ON events_sincronizados(cuenta_gmail_id);

-- =====================================
-- ÍNDICES PARA EMAILS_COMPLETOS
-- =====================================

-- Índice por cuenta Gmail
CREATE INDEX idx_emails_completos_cuenta 
ON emails_completos(cuenta_gmail_id);

-- Índice por usuario principal
CREATE INDEX idx_emails_completos_usuario 
ON emails_completos(usuario_principal_id);

-- Índice por thread_id para agrupar conversaciones
CREATE INDEX idx_emails_completos_thread 
ON emails_completos(thread_id);

-- =====================================
-- VERIFICACIÓN DE ÍNDICES
-- =====================================

-- Mostrar todos los índices creados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Verificación
SELECT 'Índices adicionales creados exitosamente' as resultado;
