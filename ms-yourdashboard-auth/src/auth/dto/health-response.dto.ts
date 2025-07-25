// src/auth/dto/health-response.dto.ts
import { ApiProperty } from "@nestjs/swagger";

export class HealthResponseDto {
  @ApiProperty({
    description: 'Nombre del servicio',
    example: 'ms-yourdashboard-auth'
  })
  service: string;

  @ApiProperty({
    description: 'Estado del servicio',
    example: 'OK',
    enum: ['OK', 'ERROR']
  })
  status: string;

  @ApiProperty({
    description: 'Timestamp actual',
    example: '2024-01-15T10:30:00Z'
  })
  timestamp: string;

  @ApiProperty({
    description: 'Tiempo de funcionamiento en segundos',
    example: 86400
  })
  uptime: number;

  @ApiProperty({
    description: 'Estado de la base de datos',
    type: 'object',
    properties: {
      connected: { type: 'boolean', example: true },
      query_time_ms: { type: 'number', example: 15 }
    }
  })
  database: {
    connected: boolean;
    query_time_ms: number;
  };

  @ApiProperty({
    description: 'Estadísticas generales del sistema',
    type: 'object',
    properties: {
      usuarios_activos: { type: 'number', example: 25 },
      cuentas_gmail_conectadas: { type: 'number', example: 45 },
      sesiones_activas: { type: 'number', example: 12 }
    }
  })
  estadisticas: {
    usuarios_activos: number;
    cuentas_gmail_conectadas: number;
    sesiones_activas: number;
  };
}