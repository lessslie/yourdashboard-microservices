// src/orchestrator/dto/send-email.dto.ts
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
  IsEnum,
  IsBoolean
} from 'class-validator';
import { Type } from 'class-transformer';

// Enum para prioridad de email
export enum EmailPriority {
  LOW = 'low',
  NORMAL = 'normal', 
  HIGH = 'high'

}

// DTO para archivos adjuntos
export class EmailAttachmentDto {
  @ApiProperty({ 
    description: 'Nombre del archivo', 
    example: 'documento.pdf',
    maxLength: 100
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100, { message: 'Nombre del archivo no puede exceder 100 caracteres' })
  filename: string;

  @ApiProperty({ 
    description: 'Contenido del archivo codificado en base64',
    example: 'JVBERi0xLjQKJdP...' 
  })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({ 
    description: 'Tipo MIME del archivo', 
    example: 'application/pdf',
    enum: [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'text/csv'
    ]
  })
  @IsNotEmpty()
  @IsString()
  mimeType: string;
}

// DTO principal para enviar email
export class SendEmailDto {
  @ApiProperty({ 
    description: 'Email remitente (debe ser una cuenta Gmail asociada al usuario autenticado)',
    example: 'agata.backend@gmail.com',
    format: 'email'
  })
  @IsEmail({}, { message: 'Email remitente debe tener formato válido' })
  @IsNotEmpty({ message: 'Email remitente es requerido' })
  from: string;

  @ApiProperty({ 
    description: 'Lista de destinatarios principales',
    example: ['cliente@empresa.com', 'socio@negocio.com'],
    type: [String],
    maxItems: 50
  })
  @IsArray({ message: 'Destinatarios (to) debe ser un array' })
  @ArrayNotEmpty({ message: 'Debe especificar al menos un destinatario' })
  @ArrayMaxSize(50, { message: 'Máximo 50 destinatarios principales permitidos' })
  @IsEmail({}, { each: true, message: 'Todos los destinatarios deben tener formato de email válido' })
  to: string[];

  @ApiProperty({ 
    description: 'Lista de destinatarios en copia (CC) - opcional',
    required: false,
    type: [String],
    maxItems: 20,
    example: ['jefe@empresa.com']
  })
  @IsOptional()
  @IsArray({ message: 'CC debe ser un array' })
  @ArrayMaxSize(20, { message: 'Máximo 20 destinatarios en CC permitidos' })
  @IsEmail({}, { each: true, message: 'Todos los emails en CC deben ser válidos' })
  cc?: string[];

  @ApiProperty({ 
    description: 'Lista de destinatarios en copia oculta (BCC) - opcional',
    required: false,
    type: [String],
    maxItems: 20,
    example: ['supervisor@empresa.com']
  })
  @IsOptional()
  @IsArray({ message: 'BCC debe ser un array' })
  @ArrayMaxSize(20, { message: 'Máximo 20 destinatarios en BCC permitidos' })
  @IsEmail({}, { each: true, message: 'Todos los emails en BCC deben ser válidos' })
  bcc?: string[];

  @ApiProperty({ 
    description: 'Asunto del email',
    example: 'Propuesta comercial - Proyecto ABC',
    maxLength: 200
  })
  @IsNotEmpty({ message: 'Asunto del email es requerido' })
  @IsString({ message: 'Asunto debe ser texto válido' })
  @MaxLength(200, { message: 'Asunto no puede exceder 200 caracteres' })
  subject: string;

  @ApiProperty({ 
    description: 'Contenido del email en texto plano',
    example: 'Hola, espero que estés bien...',
    maxLength: 100000
  })
  @IsNotEmpty({ message: 'Contenido del email es requerido' })
  @IsString({ message: 'Contenido debe ser texto válido' })
  @MaxLength(100000, { message: 'Contenido no puede exceder 100,000 caracteres' })
  body: string;

  @ApiProperty({ 
    description: 'Contenido HTML opcional para formato enriquecido',
    required: false,
    example: '<p>Hola, <strong>espero que estés bien</strong>...</p>',
    maxLength: 100000
  })
  @IsOptional()
  @IsString({ message: 'Contenido HTML debe ser texto válido' })
  @MaxLength(100000, { message: 'Contenido HTML no puede exceder 100,000 caracteres' })
  bodyHtml?: string;

  @ApiProperty({ 
    description: 'Prioridad del email',
    enum: EmailPriority,
    default: EmailPriority.NORMAL,
    required: false,
    example: EmailPriority.NORMAL
  })
  @IsOptional()
  @IsEnum(EmailPriority, { message: 'Prioridad debe ser low, normal o high' })
  priority?: EmailPriority;

  @ApiProperty({ 
    description: 'Solicitar confirmación de lectura del destinatario',
    default: false,
    required: false,
    example: false
  })
  @IsOptional()
  @IsBoolean({ message: 'Confirmación de lectura debe ser true o false' })
  requestReadReceipt?: boolean;

  @ApiProperty({ 
    description: 'Archivos adjuntos (máximo 10 archivos, 20MB por archivo)',
    type: [EmailAttachmentDto],
    required: false,
    maxItems: 10
  })
  @IsOptional()
  @IsArray({ message: 'Attachments debe ser un array' })
  @ValidateNested({ each: true })
  @Type(() => EmailAttachmentDto)
  @ArrayMaxSize(10, { message: 'Máximo 10 archivos adjuntos permitidos' })
  attachments?: EmailAttachmentDto[];

  @ApiProperty({ 
    description: 'ID del email al que se responde (para mantener hilo de conversación) - opcional',
    required: false,
    example: '<1234567890.abc@gmail.com>'
  })
  @IsOptional()
  @IsString({ message: 'inReplyTo debe ser un texto válido' })
  inReplyTo?: string;

  @ApiProperty({ 
    description: 'Referencias de emails previos en el hilo de conversación - opcional',
    required: false,
    type: [String],
    example: ['<1234567890.abc@gmail.com>', '<0987654321.def@gmail.com>']
  })
  @IsOptional()
  @IsArray({ message: 'References debe ser un array' })
  @IsString({ each: true, message: 'Cada referencia debe ser texto válido' })
  @ArrayMaxSize(50, { message: 'Máximo 50 referencias permitidas' })
  references?: string[];
}