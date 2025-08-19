import {
  IsString,
  IsArray,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  IsEmail,
} from 'class-validator';

/**
 * @description DTO para la creación de un nuevo evento.
 */
export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  summary: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  startDateTime: string;

  @IsDateString()
  @IsNotEmpty()
  endDateTime: string;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true }) // Valida que cada string en el array sea un email válido
  attendees?: string[];
}
