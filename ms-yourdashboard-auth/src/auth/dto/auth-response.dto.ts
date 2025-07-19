// src/auth/dto/auth-response.dto.ts
import { ApiProperty } from "@nestjs/swagger";

export class UsuarioPrincipalResponseDto {
  @ApiProperty({
    description: 'ID único del usuario principal',
    example: 1
  })
  id: number;

  @ApiProperty({
    description: 'Email del usuario principal',
    example: 'alonso@example.com'
  })
  email: string;

  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'Alonso González'
  })
  nombre: string;

  @ApiProperty({
    description: 'Fecha de registro',
    example: '2024-01-15T10:30:00Z'
  })
  fecha_registro: string;

  @ApiProperty({
    description: 'Estado de la cuenta',
    example: 'activo',
    enum: ['activo', 'suspendido', 'eliminado']
  })
  estado: string;

  @ApiProperty({
    description: 'Si el email está verificado',
    example: true
  })
  email_verificado: boolean;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'Indica si la operación fue exitosa',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Mensaje descriptivo del resultado',
    example: 'Usuario registrado exitosamente'
  })
  message: string;

  @ApiProperty({
    description: 'Datos del usuario autenticado',
    type: UsuarioPrincipalResponseDto
  })
  usuario: UsuarioPrincipalResponseDto;

  @ApiProperty({
    description: 'Token JWT para autenticación',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  token: string;

  @ApiProperty({
    description: 'ID de la sesión creada',
    example: 1
  })
  sesion_id: number;
}