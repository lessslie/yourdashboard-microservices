import { ApiProperty } from '@nestjs/swagger';

export class EmailErrorResponseDto {
  @ApiProperty({
    description: 'Indica que hubo un error',
    example: false
  })
  success: boolean;

  @ApiProperty({
    description: 'Mensaje de error',
    example: 'Usuario no tiene tokens configurados'
  })
  message: string;

  @ApiProperty({
    description: 'Código de error HTTP',
    example: 404
  })
  statusCode: number;

  @ApiProperty({
    description: 'Timestamp del error',
    example: '2024-01-15T10:30:00Z'
  })
  timestamp: string;
}

export class EmailHealthResponseDto {
  @ApiProperty({
    description: 'Nombre del servicio',
    example: 'ms-yourdashboard-email'
  })
  service: string;

  @ApiProperty({
    description: 'Estado del servicio',
    example: 'OK'
  })
  status: string;

  @ApiProperty({
    description: 'Timestamp actual',
    example: '2024-01-15T10:30:00Z'
  })
  timestamp: string;

  @ApiProperty({
    description: 'Puerto del servicio',
    example: 3002
  })
  port: string | number;

  @ApiProperty({
    description: 'Modo de operación',
    example: 'microservices'
  })
  mode: string;
}