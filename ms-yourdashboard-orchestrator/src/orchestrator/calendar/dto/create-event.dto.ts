import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsEmail,
  IsNotEmpty,
} from 'class-validator';

export class CreateEventDto {
  @ApiProperty({
    description: 'Título del evento',
    example: 'Reunión de equipo - Sprint Planning',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  summary: string;

  @ApiProperty({
    description: 'Ubicación del evento',
    example: 'Sala de Juntas 2',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Descripción detallada del evento',
    example: 'Revisión de objetivos del sprint y asignación de tareas',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Fecha y hora de inicio (ISO format)',
    example: '2025-08-20T10:00:00-05:00',
    required: true,
  })
  @IsDateString()
  @IsNotEmpty()
  startDateTime: string;

  @ApiProperty({
    description: 'Fecha y hora de fin (ISO format)',
    example: '2025-08-20T11:30:00-05:00',
    required: true,
  })
  @IsDateString()
  @IsNotEmpty()
  endDateTime: string;

  @ApiProperty({
    description: 'Lista de emails de asistentes',
    example: ['compañero1@empresa.com', 'compañero2@empresa.com'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  attendees?: string[];
}
