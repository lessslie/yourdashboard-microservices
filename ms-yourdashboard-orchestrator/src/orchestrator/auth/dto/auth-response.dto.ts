
// src/orchestrator/auth/dto/auth-response.dto.ts
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
  @ApiProperty({ example: 1 })
  id: number;

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

export class AuthResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Usuario registrado exitosamente' })
  message: string;

  @ApiProperty({ type: UserDto })
  user: UserDto;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  token: string;
}

export class ProfileResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  usuario: {
    id: number;
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

export class CuentaGmailDto {
  @ApiProperty({ example: 4 })
  id: number;

  @ApiProperty({ example: 'usuario@gmail.com' })
  email_gmail: string;

  @ApiProperty({ example: 'Usuario Gmail' })
  nombre_cuenta: string;

  @ApiProperty({ example: 'Gmail Personal', required: false })
  alias_personalizado?: string;

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

