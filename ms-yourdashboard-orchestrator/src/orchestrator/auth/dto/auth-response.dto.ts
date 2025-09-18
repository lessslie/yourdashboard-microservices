// ms-yourdashboard-orchestrator/src/orchestrator/auth/dto/auth-response.dto.ts
//SERIAL → UUID (number → string)

import { ApiProperty } from '@nestjs/swagger';

export class AuthStartResponseDto {
  @ApiProperty({
    description: 'Indica si la operación fue exitosa',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Mensaje descriptivo',
    example: 'Usar /auth/google para iniciar OAuth'
  })
  message: string;

  @ApiProperty({
    description: 'URL directa del MS-Auth',
    example: 'http://localhost:3001/auth/google'
  })
  authUrl: string;

  @ApiProperty({
    description: 'URL del orquestador (recomendada)',
    example: 'http://localhost:3003/auth/google'
  })
  orchestratorUrl: string;

  @ApiProperty({
    description: 'Instrucciones para el frontend',
    example: 'Recomendado: usar /auth/google del orquestador'
  })
  instructions: string;
}

export class AuthErrorResponseDto {
  @ApiProperty({
    description: 'Indica que hubo un error',
    example: false
  })
  success: boolean;

  @ApiProperty({
    description: 'Mensaje de error',
    example: 'Error en autenticación OAuth'
  })
  message: string;

  @ApiProperty({
    description: 'Código de estado HTTP',
    example: 500
  })
  statusCode: number;

  @ApiProperty({
    description: 'Timestamp del error',
    example: '2024-01-15T10:30:00Z'
  })
  timestamp: string;
}

export class UserDto {
  @ApiProperty({ 
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID del usuario'
  })
  id: string; // ✅ MIGRADO: number → string (UUID)

  @ApiProperty({ example: 'usuario@example.com' })
  email: string;

  @ApiProperty({ example: 'Juan Pérez' })
  name: string;

  @ApiProperty({ example: true })
  isEmailVerified: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: string;

  @ApiProperty({ example: null, nullable: true })
  profilePicture: string | null;
}

// 🆕 NUEVOS DTOs PARA EL PERFIL COMPLETO
export class UsuarioDto {
  @ApiProperty({ 
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID del usuario'
  })
  id: string; // ✅ MIGRADO: number → string (UUID)

  @ApiProperty({ example: 'usuario@example.com' })
  email: string;

  @ApiProperty({ example: 'Juan Pérez' })
  nombre: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  fecha_registro: string;

  @ApiProperty({ example: 'activo' })
  estado: string;

  @ApiProperty({ example: false })
  email_verificado: boolean;
}

export class CuentaGmailCompleteDto {
  @ApiProperty({ 
    example: '650e8400-e29b-41d4-a716-446655440001',
    description: 'UUID de la cuenta Gmail'
  })
  id: string; // ✅ MIGRADO: number → string (UUID)

  @ApiProperty({ example: 'usuario@gmail.com' })
  email_gmail: string;

  @ApiProperty({ example: 'Usuario Gmail' })
  nombre_cuenta: string;

  @ApiProperty({ example: 'Gmail Personal', nullable: true })
  alias_personalizado: string | null;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  fecha_conexion: string;

  @ApiProperty({ example: '2024-01-15T11:30:00Z', nullable: true })
  ultima_sincronizacion: string | null;

  @ApiProperty({ example: true })
  esta_activa: boolean;

  @ApiProperty({ example: 150 })
  emails_count: number;

  @ApiProperty({ example: 25 })
  events_count: number;
}

export class SesionActivaDto {
  @ApiProperty({ 
    example: '750e8400-e29b-41d4-a716-446655440002',
    description: 'UUID de la sesión'
  })
  id: string; // ✅ MIGRADO: number → string (UUID)

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  fecha_creacion: string;

  @ApiProperty({ example: '2024-01-16T10:30:00Z' })
  expira_en: string;

  @ApiProperty({ example: '192.168.1.1', nullable: true })
  ip_origen: string | null;

  @ApiProperty({ example: 'Mozilla/5.0...', nullable: true })
  user_agent: string | null;

  @ApiProperty({ example: true })
  esta_activa: boolean;
}

export class EstadisticasDto {
  @ApiProperty({ example: 3 })
  total_cuentas_gmail: number;

  @ApiProperty({ example: 3 })
  cuentas_gmail_activas: number;

  @ApiProperty({ example: 23593 })
  total_emails_sincronizados: number;

  @ApiProperty({ example: 20374 })
  emails_no_leidos: number;

  @ApiProperty({ example: 265 })
  total_eventos_sincronizados: number;

  @ApiProperty({ example: 137 })
  eventos_proximos: number;

  @ApiProperty({ example: 98 })
  eventos_pasados: number;

  @ApiProperty({ example: '2024-01-15T14:45:05.157Z' })
  ultima_sincronizacion: string;

  @ApiProperty({ 
    example: { 
      email_gmail: 'usuario@gmail.com', 
      emails_count: 16696 
    },
    nullable: true 
  })
  cuenta_mas_activa: {
    email_gmail: string;
    emails_count: number;
  } | null;
}

// 🚀 AUTHRESPONSEDTO ACTUALIZADO CON PERFIL COMPLETO
export class AuthResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Login exitoso' })
  message: string;

  @ApiProperty({ 
    type: UserDto,
    description: 'Datos básicos del usuario (compatibilidad)' 
  })
  user: UserDto;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  token: string;

  // 🆕 NUEVOS CAMPOS DEL PERFIL
  @ApiProperty({ 
    type: UsuarioDto,
    description: 'Datos completos del usuario (formato igual a /auth/me)' 
  })
  usuario: UsuarioDto;

  @ApiProperty({ 
    type: [CuentaGmailCompleteDto],
    description: 'Cuentas Gmail conectadas con estadísticas completas' 
  })
  cuentas_gmail: CuentaGmailCompleteDto[];

  @ApiProperty({ 
    type: [SesionActivaDto],
    description: 'Sesiones activas del usuario' 
  })
  sesiones_activas: SesionActivaDto[];

  @ApiProperty({ 
    type: EstadisticasDto,
    description: 'Estadísticas completas del usuario' 
  })
  estadisticas: EstadisticasDto;
}

// ✅ CLASES PARA ENDPOINTS DE CUENTAS GMAIL CORREGIDAS
export class CuentaGmailDto {
  @ApiProperty({ 
    example: '650e8400-e29b-41d4-a716-446655440001',
    description: 'UUID de la cuenta Gmail'
  })
  id: string; // ✅ MIGRADO: number → string (UUID)

  @ApiProperty({ example: 'usuario@gmail.com' })
  email_gmail: string;

  @ApiProperty({ example: 'Usuario Gmail' })
  nombre_cuenta: string;

  @ApiProperty({ example: 'Gmail Personal', required: false })
  alias_personalizado?: string | null;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  fecha_conexion: string;

  @ApiProperty({ example: true })
  esta_activa: boolean;

  @ApiProperty({ example: 150 })
  emails_count: number;
}

export class CuentasGmailResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [CuentaGmailDto] })
  cuentas: CuentaGmailDto[];

  @ApiProperty({ example: 2 })
  total: number;
}

export class CuentaGmailResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: CuentaGmailDto })
  cuenta: CuentaGmailDto;
}

export class ProfileResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  usuario: {
    id: string; // ✅ MIGRADO: number → string (UUID)
    email: string;
    nombre: string;
    fecha_registro: string;
    estado: string;
    email_verificado: boolean;
  };

  @ApiProperty({ type: [Object] })
  cuentas_gmail: any[];

  @ApiProperty({ type: [Object] })
  sesiones_activas: any[];

  @ApiProperty()
  estadisticas: any;
}