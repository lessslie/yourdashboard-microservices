// src/auth/dto/error-response.dto.ts
import { ApiProperty } from "@nestjs/swagger";

export class ErrorResponseDto {
  @ApiProperty({
    description: 'Indica que hubo un error',
    example: false
  })
  success: boolean;

  @ApiProperty({
    description: 'Código del error',
    example: 'EMAIL_YA_EXISTE'
  })
  codigo: string;

  @ApiProperty({
    description: 'Mensaje de error',
    example: 'El email ya está registrado'
  })
  mensaje: string;

  @ApiProperty({
    description: 'Timestamp del error',
    example: '2024-01-15T10:30:00Z'
  })
  timestamp: string;

  @ApiProperty({
    description: 'Detalles adicionales del error',
    required: false
  })
  detalles?: any;
}