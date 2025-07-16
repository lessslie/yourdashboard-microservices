import { ApiProperty } from '@nestjs/swagger';
import { EmailMetadataDto } from './email-metadata.dto';

export class EmailDetailDto extends EmailMetadataDto {
  @ApiProperty({
    description: 'Lista de destinatarios',
    type: [String],
    example: ['destinatario@empresa.com', 'otro@empresa.com']
  })
  toEmails: string[];

  @ApiProperty({
    description: 'Contenido del email en texto plano',
    example: 'Hola equipo,\n\nLes escribo para confirmar la reunión...',
    required: false
  })
  bodyText?: string;

  @ApiProperty({
    description: 'Contenido del email en HTML',
    example: '<p>Hola equipo,</p><p>Les escribo para confirmar la reunión...</p>',
    required: false
  })
  bodyHtml?: string;
}