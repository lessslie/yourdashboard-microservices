import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsEmail,
} from 'class-validator';

/**
 * @description DTO para actualizar un evento existente.
 * Todos los campos son opcionales para permitir actualizaciones parciales.
 */
export class UpdateEventDto {
  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startDateTime?: string;

  @IsOptional()
  @IsDateString()
  endDateTime?: string;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  attendees?: string[];
}
