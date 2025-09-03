import { ApiProperty } from '@nestjs/swagger';
import { 
  IsEmail, 
  IsNotEmpty, 
  IsString, 
  IsOptional, 
  ArrayNotEmpty, 
  ArrayMaxSize, 
  MaxLength,
  IsArray,
  ValidateNested,
  IsEnum
} from 'class-validator';
import { Type } from 'class-transformer';

// Enum para prioridad
export enum EmailPriority {
  LOW = 'low',
  NORMAL = 'normal', 
  HIGH = 'high'
}

// DTO para archivos adjuntos
export class EmailAttachmentDto {
  @ApiProperty({ description: 'Nombre del archivo', example: 'documento.pdf' })
  @IsNotEmpty()
  @IsString()
  filename: string;

  @ApiProperty({ description: 'Contenido del archivo en base64' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({ description: 'Tipo MIME', example: 'application/pdf' })
  @IsNotEmpty()
  @IsString()
  mimeType: string;
}

export class SendEmailDto {
  @ApiProperty({ 
    description: 'Email remitente (debe ser una cuenta Gmail asociada al usuario)',
    example: 'agata.backend@gmail.com' 
  })
  @IsEmail()
  @IsNotEmpty()
  from: string;

  @ApiProperty({ 
    description: 'Lista de destinatarios principales',
    example: ['cliente@empresa.com', 'socio@negocio.com'],
    type: [String]
  })
  @IsEmail({}, { each: true })
  @ArrayNotEmpty()
  @ArrayMaxSize(50) // Gmail permite hasta 500, ponemos 50
  to: string[];

  @ApiProperty({ 
    description: 'Lista de destinatarios en copia (CC)',
    required: false,
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  @ArrayMaxSize(20)
  cc?: string[];

  @ApiProperty({ 
    description: 'Lista de destinatarios en copia oculta (BCC)',
    required: false,
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  @ArrayMaxSize(20)
  bcc?: string[];

  @ApiProperty({ 
    description: 'Asunto del email',
    example: 'Propuesta comercial - Proyecto ABC' 
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  subject: string;

  @ApiProperty({ 
    description: 'Contenido del email en texto plano',
    example: 'Hola, espero que estés bien...' 
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100000) // 100k caracteres
  body: string;

  @ApiProperty({ 
    description: 'Contenido HTML opcional',
    required: false,
    example: '<p>Hola, <strong>espero que estés bien</strong>...</p>'
  })
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  bodyHtml?: string;

  @ApiProperty({ 
    description: 'Prioridad del email',
    enum: EmailPriority,
    default: EmailPriority.NORMAL,
    required: false
  })
  @IsOptional()
  @IsEnum(EmailPriority)
  priority?: EmailPriority;

  @ApiProperty({ 
    description: 'Solicitar confirmación de lectura',
    default: false,
    required: false
  })
  @IsOptional()
  requestReadReceipt?: boolean;

  @ApiProperty({ 
    description: 'Archivos adjuntos',
    type: [EmailAttachmentDto],
    required: false
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailAttachmentDto)
  @ArrayMaxSize(10) // Máximo 10 archivos
  attachments?: EmailAttachmentDto[];

  @ApiProperty({ 
    description: 'ID del email al que se responde (para mantener hilo)',
    required: false
  })
  @IsOptional()
  @IsString()
  inReplyTo?: string;

  @ApiProperty({ 
    description: 'Referencias de emails previos en el hilo',
    required: false,
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  references?: string[];
}