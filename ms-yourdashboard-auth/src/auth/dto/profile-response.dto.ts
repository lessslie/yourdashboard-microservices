import { ApiProperty } from "@nestjs/swagger";
import { UserResponseDto } from "./auth-response.dto";

// src/auth/dto/profile-response.dto.ts
export class OAuthConnectionDto {
  @ApiProperty({
    description: 'Proveedor OAuth',
    example: 'google'
  })
  provider: string;

  @ApiProperty({
    description: 'Si está conectado actualmente',
    example: true
  })
  is_connected: boolean;

  @ApiProperty({
    description: 'Fecha de conexión',
    example: '2024-01-15T10:30:00Z'
  })
  connected_at: Date;

  @ApiProperty({
    description: 'Fecha de expiración',
    example: '2024-01-16T10:30:00Z',
    required: false
  })
  expires_at?: Date | null;
}

export class ProfileResponseDto {
  @ApiProperty({
    description: 'Indica si la operación fue exitosa',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Datos del usuario',
    type: UserResponseDto
  })
  user: UserResponseDto;

  @ApiProperty({
    description: 'Conexiones OAuth del usuario',
    type: [OAuthConnectionDto]
  })
  connections: OAuthConnectionDto[];
}
