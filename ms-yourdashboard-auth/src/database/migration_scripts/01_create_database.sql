-- =====================================
-- CREAR BASE DE DATOS
-- =====================================
-- Archivo: 01_create_database.sql

-- Crear la base de datos
CREATE DATABASE ms_yourdashboard_auth;

-- Conectar a la base de datos recién creada
\c ms_yourdashboard_auth;

-- Mensaje de confirmación
SELECT 
    'Base de datos ms_yourdashboard_auth creada exitosamente' as resultado,
    NOW() as timestamp;
