import { ApiProperty } from "@nestjs/swagger";

// src/auth/dto/auth-response.dto.ts
export class UserResponseDto {
  @ApiProperty({
    description: 'ID único del usuario',
    example: 1
  })
  id: number;

  @ApiProperty({
    description: 'Email del usuario',
    example: 'usuario@test.com'
  })
  email: string;

  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'Juan Pérez'
  })
  name: string;

  @ApiProperty({
    description: 'Si el email está verificado',
    example: true
  })
  isEmailVerified: boolean;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2024-01-15T10:30:00Z',
    required: false
  })
  createdAt?: string;

  @ApiProperty({
    description: 'URL de foto de perfil',
    example: null,
    required: false
  })
  profilePicture?: string | null;
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
    type: UserResponseDto
  })
  user: UserResponseDto;

  @ApiProperty({
    description: 'Token JWT para autenticación',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  token: string;
}
