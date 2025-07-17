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