import { ApiProperty } from '@nestjs/swagger';

export class EmailMetadataDto {
  @ApiProperty({
    description: 'ID único del email',
    example: '1847a8e123456789'
  })
  id: string;

  @ApiProperty({
    description: 'ID del mensaje de Gmail',
    example: '1847a8e123456789'
  })
  messageId: string;

  @ApiProperty({
    description: 'Asunto del email',
    example: 'Reunión de proyecto - Viernes 10am'
  })
  subject: string;

  @ApiProperty({
    description: 'Email del remitente',
    example: 'jefe@empresa.com'
  })
  fromEmail: string;

  @ApiProperty({
    description: 'Nombre del remitente',
    example: 'Juan Pérez'
  })
  fromName: string;

  @ApiProperty({
    description: 'Fecha de recepción del email',
    example: '2024-01-15T10:30:00Z'
  })
  receivedDate: string;

  @ApiProperty({
    description: 'Si el email ha sido leído',
    example: false
  })
  isRead: boolean;

  @ApiProperty({
    description: 'Si el email tiene archivos adjuntos',
    example: true
  })
  hasAttachments: boolean;
}