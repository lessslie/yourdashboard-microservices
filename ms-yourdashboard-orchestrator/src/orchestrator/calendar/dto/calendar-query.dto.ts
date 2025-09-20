// ms-yourdashboard-orchestrator/src/orchestrator/calendar/dto/calendar-query.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CalendarQueryDto {
  @ApiProperty({
    description: 'ID de la cuenta Gmail específica',
    example: 'abc123def456ghi789',
    required: true
  })
  @IsString()
  cuentaGmailId: string;

  @ApiProperty({
    description: 'Fecha mínima (ISO)',
    example: '2025-08-01T00:00:00Z',
    required: true
  })
  @IsDateString()
  timeMin: string;

  @ApiProperty({
    description: 'Fecha máxima (ISO)',
    example: '2025-08-31T23:59:59Z',
    required: false
  })
  @IsOptional()
  @IsDateString()
  timeMax?: string;

  @ApiProperty({
    description: 'Número de página',
    example: 1,
    default: 1,
    minimum: 1,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Eventos por página (máximo 50)',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 50,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export class CalendarSearchQueryDto extends CalendarQueryDto {
  @ApiProperty({
    description: 'Término de búsqueda en eventos',
    example: 'reunión proyecto',
    required: true
  })
  @IsString()
  q: string;
}

export class CalendarStatsQueryDto {
  @ApiProperty({
    description: 'ID de la cuenta Gmail específica',
    example: 'abc123def456ghi789',
    required: true
  })
  @IsString()
  cuentaGmailId: string;
}

export class CalendarSyncQueryDto {
  @ApiProperty({
    description: 'ID de la cuenta Gmail específica',
    example: '4',
    required: true
  })
  @IsString()
  cuentaGmailId: string;

  @ApiProperty({
    description: 'Máximo eventos a sincronizar',
    example: 100,
    default: 100,
    minimum: 1,
    maximum: 250,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(250)
  maxEvents?: number = 100;
}

// 🎯 PARA ENDPOINTS UNIFICADOS (CON JWT)
export class CalendarJWTQueryDto {
  @ApiProperty({
    description: 'ID del usuario principal (extraído del JWT)',
    example: 'abc123def456ghi789',
    required: true
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Fecha mínima (ISO)',
    example: '2025-08-01T00:00:00Z',
    required: true
  })
  @IsDateString()
  timeMin: string;

  @ApiProperty({
    description: 'Fecha máxima (ISO)',
    example: '2025-08-31T23:59:59Z',
    required: false
  })
  @IsOptional()
  @IsDateString()
  timeMax?: string;

  @ApiProperty({
    description: 'Número de página',
    example: 1,
    default: 1,
    minimum: 1,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Eventos por página (máximo 50)',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 50,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export class CalendarJWTSearchQueryDto extends CalendarJWTQueryDto {
  @ApiProperty({
    description: 'Término de búsqueda global en eventos',
    example: 'reunión proyecto',
    required: true
  })
  @IsString()
  q: string;
}