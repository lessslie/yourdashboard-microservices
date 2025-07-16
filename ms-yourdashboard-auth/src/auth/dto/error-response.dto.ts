import { ApiProperty } from "@nestjs/swagger";

// src/auth/dto/error-response.dto.ts
export class ErrorResponseDto {
  @ApiProperty({
    description: 'Indica que hubo un error',
    example: false
  })
  success: boolean;

  @ApiProperty({
    description: 'Mensaje de error',
    example: 'Email ya está registrado'
  })
  message: string;

  @ApiProperty({
    description: 'Código de error HTTP',
    example: 409
  })
  statusCode: number;

  @ApiProperty({
    description: 'Timestamp del error',
    example: '2024-01-15T10:30:00Z'
  })
  timestamp: string;
}