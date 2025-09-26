// src/orchestrator/dto/send-email-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { EmailPriority } from './send-email.dto';

// Response básica de envío de email
export interface SendEmailResponse {
  success: boolean;
  messageId: string; // ID retornado por Gmail API
  threadId: string; // ID del hilo de conversación
  sentAt: string; // Timestamp ISO cuando se envió
  fromEmail: string; // Email remitente confirmado
  toEmails: string[]; // Destinatarios principales
  ccEmails?: string[]; // Destinatarios en copia
  bccEmails?: string[]; // Destinatarios en copia oculta
  subject: string; // Asunto del email
  priority: EmailPriority; // Prioridad aplicada
  hasAttachments: boolean; // Si tiene archivos adjuntos
  attachmentCount?: number; // Número de archivos adjuntos
  sizeEstimate?: number; // Tamaño aproximado del email
}

// Response del orchestrator para envío de emails
export class OrchestratorSendEmailResponseDto {
  @ApiProperty({
    description: 'Indica si el email fue enviado exitosamente',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Fuente que procesó la solicitud',
    example: 'orchestrator',
  })
  source: string;

  @ApiProperty({
    description: 'Datos del email enviado',
    type: 'object',
    properties: {
      messageId: {
        type: 'string',
        example: '1847a8e123456789',
        description: 'ID único del mensaje en Gmail',
      },
      threadId: {
        type: 'string',
        example: '1847a8e123456789',
        description: 'ID del hilo de conversación',
      },
      sentAt: {
        type: 'string',
        example: '2024-01-15T10:30:00Z',
        description: 'Timestamp de cuándo se envió el email',
      },
      fromEmail: {
        type: 'string',
        example: 'agata.backend@gmail.com',
        description: 'Email remitente confirmado',
      },
      toEmails: {
        type: 'array',
        items: { type: 'string' },
        example: ['cliente@empresa.com', 'socio@empresa.com'],
        description: 'Lista de destinatarios principales',
      },
      ccEmails: {
        type: 'array',
        items: { type: 'string' },
        example: ['jefe@empresa.com'],
        description: 'Lista de destinatarios en copia',
      },
      bccEmails: {
        type: 'array',
        items: { type: 'string' },
        example: ['supervisor@empresa.com'],
        description: 'Lista de destinatarios en copia oculta',
      },
      subject: {
        type: 'string',
        example: 'Propuesta comercial - Proyecto ABC',
        description: 'Asunto del email enviado',
      },
      priority: {
        type: 'string',
        enum: ['low', 'normal', 'high'],
        example: 'normal',
        description: 'Prioridad del email',
      },
      hasAttachments: {
        type: 'boolean',
        example: true,
        description: 'Si el email incluye archivos adjuntos',
      },
      attachmentCount: {
        type: 'number',
        example: 2,
        description: 'Número de archivos adjuntos',
      },
      sizeEstimate: {
        type: 'number',
        example: 2048000,
        description: 'Tamaño aproximado del email en bytes',
      },
    },
  })
  data: {
    messageId: string;
    threadId: string;
    sentAt: string;
    fromEmail: string;
    toEmails: string[];
    ccEmails?: string[];
    bccEmails?: string[];
    subject: string;
    priority: EmailPriority;
    hasAttachments: boolean;
    attachmentCount?: number;
    sizeEstimate?: number;
  };
}

// DTO para respuestas de error específicas de SEND
export class SendEmailErrorResponseDto {
  @ApiProperty({
    description: 'Indica que ocurrió un error',
    example: false,
  })
  success: boolean;

  @ApiProperty({
    description: 'Código de error específico',
    example: 'INVALID_RECIPIENTS',
    enum: [
      'INVALID_EMAIL',
      'INVALID_RECIPIENTS',
      'TOO_MANY_RECIPIENTS',
      'INVALID_ACCOUNT',
      'ACCOUNT_NOT_AUTHORIZED',
      'QUOTA_EXCEEDED',
      'EMAIL_TOO_LARGE',
      'INVALID_ATTACHMENT',
      'SEND_FAILED',
      'TOKEN_EXPIRED',
    ],
  })
  error: string;

  @ApiProperty({
    description: 'Mensaje descriptivo del error',
    example: 'El email cliente@empresa..com tiene formato inválido',
  })
  message: string;

  @ApiProperty({
    description: 'Campo específico que causó el error (si aplica)',
    example: 'to[0]',
    required: false,
  })
  field?: string;

  @ApiProperty({
    description: 'Tiempo de espera antes de reintentar (en segundos)',
    example: 3600,
    required: false,
  })
  retryAfter?: number;

  @ApiProperty({
    description: 'Detalles adicionales del error',
    required: false,
  })
  details?: any;

  @ApiProperty({
    description: 'Timestamp del error',
    example: '2024-01-15T10:30:00Z',
  })
  timestamp: string;
}

// Interface para respuestas internas del orchestrator
export interface OrchestratorSendEmailResponse {
  success: boolean;
  source: string;
  data?: SendEmailResponse;
  error?: string;
  message?: string;
}
