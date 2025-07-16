import { ApiProperty } from "@nestjs/swagger";

// src/auth/dto/health-response.dto.ts
export class HealthFeaturesDto {
  @ApiProperty({ description: 'Autenticación tradicional disponible', example: true })
  traditional_auth: boolean;

  @ApiProperty({ description: 'OAuth con Google disponible', example: true })
  oauth_google: boolean;

  @ApiProperty({ description: 'Sesiones JWT disponibles', example: true })
  jwt_sessions: boolean;

  @ApiProperty({ description: 'Soporte multi-proveedor', example: true })
  multi_provider_support: boolean;
}

export class HealthResponseDto {
  @ApiProperty({ description: 'Nombre del servicio', example: 'ms-yourdashboard-auth' })
  service: string;

  @ApiProperty({ description: 'Estado del servicio', example: 'OK' })
  status: string;

  @ApiProperty({ description: 'Timestamp actual', example: '2024-01-15T10:30:00Z' })
  timestamp: string;

  @ApiProperty({ description: 'Puerto del servicio', example: 3001 })
  port: string | number;

  @ApiProperty({ description: 'Características disponibles', type: HealthFeaturesDto })
  features: HealthFeaturesDto;
}
