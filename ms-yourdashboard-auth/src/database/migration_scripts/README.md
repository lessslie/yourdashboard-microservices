# YourDashboard - Migración UUID

Este directorio contiene los scripts de migración para crear una nueva base de datos con estructura UUID para YourDashboard.

## 📋 Contenido

```
migration_scripts/
├── 00_master.sql                 # Ejecuta todos los scripts en orden
├── 01_create_database.sql        # Crea la base de datos
├── 02_usuarios_principales.sql   # Tabla de usuarios principales
├── 03_cuentas_gmail_asociadas.sql # Cuentas Gmail por usuario
├── 04_emails_sincronizados.sql   # Cache de metadata de emails
├── 05_emails_completos.sql       # Contenido completo de emails
├── 06_events_sincronizados.sql   # Eventos de Google Calendar
├── 07_sesiones_jwt.sql           # Sesiones JWT de usuarios
├── 08_whatsapp_accounts.sql      # Cuentas de WhatsApp Business
├── 09_conversations.sql          # Conversaciones de WhatsApp
├── 10_messages.sql               # Mensajes de WhatsApp
├── 11_audit_eliminaciones.sql    # Tabla de auditoría
├── 12_functions.sql              # Funciones y procedimientos
├── 13_indexes.sql                # Índices optimizados
└── README.md                     # Este archivo
```

## 🚀 Instalación Rápida

### Opción 1: Script Maestro (Recomendado)
```bash
# Ejecutar todo de una vez
psql -U postgres -f 00_master.sql
```

### Opción 2: Scripts Individuales
```bash
# Ejecutar paso a paso (útil para debugging)
psql -U postgres -f 01_create_database.sql
psql -U postgres -d ms_yourdashboard_auth -f 02_usuarios_principales.sql
psql -U postgres -d ms_yourdashboard_auth -f 03_cuentas_gmail_asociadas.sql
# ... continuar con el resto
```

## 📊 Estructura de Base de Datos

### Tablas Principales
- **usuarios_principales**: Usuarios del sistema (tabla raíz)
- **cuentas_gmail_asociadas**: Cuentas Gmail conectadas via OAuth
- **emails_sincronizados**: Cache de metadata de emails
- **emails_completos**: Contenido completo (HTML, attachments)
- **events_sincronizados**: Eventos de Google Calendar
- **sesiones_jwt**: Sesiones activas de usuarios

### Tablas WhatsApp
- **whatsapp_accounts**: Cuentas de WhatsApp Business
- **conversations**: Conversaciones/chats
- **messages**: Mensajes individuales

### Auditoría
- **audit_eliminaciones**: Tracking de eliminaciones

## 🔗 Relaciones entre Tablas

```
usuarios_principales (raíz)
├── cuentas_gmail_asociadas
│   ├── emails_sincronizados
│   │   └── emails_completos
│   └── events_sincronizados
├── sesiones_jwt
└── whatsapp_accounts
    └── conversations
        └── messages
```

## ⚙️ Funciones Disponibles

### Estadísticas
- `obtener_estadisticas_sistema()`: Resumen general del sistema
- `obtener_cuentas_gmail_usuario(uuid)`: Cuentas Gmail de un usuario
- `obtener_stats_emails_cuenta(uuid)`: Estadísticas de una cuenta específica

### Gestión
- `eliminar_cuenta_gmail_segura(uuid)`: Eliminar cuenta con auditoría
- `limpiar_sesiones_expiradas()`: Cleanup de sesiones vencidas

### Sistema de Semáforo
- `update_all_traffic_lights()`: Actualizar estados de respuesta
- `mark_email_as_replied(gmail_id)`: Marcar email como respondido

## 🔧 Verificación Post-Instalación

```sql
-- Conectar a la base de datos
\c ms_yourdashboard_auth

-- Ver todas las tablas
\dt

-- Ver funciones disponibles
\df

-- Estadísticas del sistema
SELECT * FROM obtener_estadisticas_sistema();

-- Verificar estructura de una tabla
\d usuarios_principales
```

## 📝 Diferencias Clave con Versión Anterior

### Cambios de Tipo
- Todos los IDs: `SERIAL/INTEGER` → `UUID`
- Primary Keys: Ahora usan `gen_random_uuid()`
- Foreign Keys: Actualizadas para referenciar UUIDs

### Nuevas Tablas
- `emails_completos`: Contenido HTML/attachments de emails
- `events_sincronizados`: Eventos de Google Calendar

### Funciones Actualizadas
- Todos los parámetros cambiados de `INTEGER` → `UUID`
- Nuevas funciones para el sistema de semáforo

## 🛠️ Para Desarrolladores Frontend

### Cambios en Types/Interfaces
```typescript
// Antes
interface Usuario {
  id: number;  // ❌
  email: string;
}

// Ahora
interface Usuario {
  id: string;  // ✅ UUID como string
  email: string;
}
```

### Actualizar Requests
```javascript
// Antes
const response = await api.get(`/usuarios/${123}`);  // ❌

// Ahora  
const response = await api.get(`/usuarios/${uuid}`); // ✅
```

## ⚠️ Notas Importantes

1. **Esta es una BD nueva**: No migra datos existentes automáticamente
2. **UUIDs son strings**: En frontend, manejarlos como `string`, no `number`
3. **Foreign Keys**: Todas las relaciones usan UUIDs ahora
4. **Performance**: Los índices están optimizados para UUIDs
5. **Compatibilidad**: El frontend debe actualizar todos los types a `string`

## 🔍 Troubleshooting

### Error: "relation does not exist"
```bash
# Verificar que estás conectado a la BD correcta
\c ms_yourdashboard_auth
```

### Error: "function does not exist" 
```bash
# Ejecutar el script de funciones
psql -U postgres -d ms_yourdashboard_auth -f 12_functions.sql
```

### Error: "permission denied"
```bash
# Verificar permisos de usuario
GRANT ALL PRIVILEGES ON DATABASE ms_yourdashboard_auth TO tu_usuario;
```

## 📞 Soporte

Si encuentras problemas durante la migración:

1. Verificar logs de PostgreSQL
2. Ejecutar scripts uno por uno para identificar el problema
3. Revisar que PostgreSQL tenga la extensión `gen_random_uuid()` habilitada
4. Contactar al equipo de backend

## 🎯 Próximos Pasos

Después de ejecutar estos scripts:

1. ✅ Verificar que todas las tablas están creadas
2. ✅ Probar las funciones principales
3. ✅ Actualizar la configuración de conexión en el backend
4. ✅ Actualizar los types/interfaces en el frontend
5. ✅ Ejecutar tests de integración
6. ✅ Migrar datos de producción si es necesario

---
**Generado para el equipo YourDashboard - Base de datos con estructura UUID**
