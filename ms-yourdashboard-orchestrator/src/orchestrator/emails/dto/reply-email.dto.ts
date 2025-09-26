// reply-email.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';

export class ReplyEmailDto {
  @ApiProperty({
    description: 'Contenido de la respuesta en texto plano',
    example:
      'Gracias por tu mensaje. Te respondo que estamos de acuerdo con la propuesta.',
    maxLength: 10000,
  })
  @IsNotEmpty({ message: 'El contenido de la respuesta es requerido' })
  @IsString({ message: 'El contenido debe ser un texto válido' })
  @MaxLength(10000, {
    message: 'El contenido no puede exceder 10,000 caracteres',
  })
  body: string;

  @ApiProperty({
    description: 'Contenido de la respuesta en HTML (opcional)',
    example:
      '<p>Gracias por tu mensaje.</p><p>Te respondo que estamos de acuerdo con la propuesta.</p>',
    required: false,
    maxLength: 20000,
  })
  @IsOptional()
  @IsString({ message: 'El contenido HTML debe ser un texto válido' })
  @MaxLength(20000, {
    message: 'El contenido HTML no puede exceder 20,000 caracteres',
  })
  bodyHtml?: string;
}

// reply-response.dto.ts
export class ReplyResponseDto {
  @ApiProperty({
    description: 'Indica si la respuesta fue enviada exitosamente',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Mensaje descriptivo del resultado',
    example: 'Respuesta enviada exitosamente desde juan.trabajo@gmail.com',
  })
  message: string;

  @ApiProperty({
    description: 'ID del mensaje enviado en Gmail',
    example: '1847a8e987654321',
  })
  sentMessageId: string;
}
