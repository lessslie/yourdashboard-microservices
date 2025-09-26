import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsEmail,
} from 'class-validator';

export class UpdateEventDto {
  @ApiProperty({
    description: 'Título del evento (opcional para actualización)',
    example: 'Reunión de equipo - Sprint Review (ACTUALIZADA)',
    required: false,
  })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({
    description: 'Ubicación del evento (opcional para actualización)',
    example: 'Sala Virtual - Zoom',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Descripción del evento (opcional para actualización)',
    example: 'Presentación de resultados del sprint',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Nueva fecha y hora de inicio (opcional para actualización)',
    example: '2025-08-25T14:00:00-05:00',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDateTime?: string;

  @ApiProperty({
    description: 'Nueva fecha y hora de fin (opcional para actualización)',
    example: '2025-08-25T16:00:00-05:00',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDateTime?: string;

  @ApiProperty({
    description: 'Nueva lista de asistentes (opcional para actualización)',
    example: ['manager@empresa.com', 'team@empresa.com'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  attendees?: string[];
}
