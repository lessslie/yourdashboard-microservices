// ms-yourdashboard-email/src/emails/interfaces/email.interfaces-send.ts
// ✅ MIGRADO A UUID - userId y cuentaGmailId cambiados a string

// ================================
// 🎯 ATTACHMENT INTERFACES
// ================================

export interface EmailAttachment {
  filename: string; // Nombre del archivo
  content: string; // Contenido en Base64
  contentType?: string; // MIME type (opcional, se detecta automáticamente)
  size?: number; // Tamaño en bytes (opcional)
  encoding?: 'base64' | 'binary'; // Por defecto base64
  contentDisposition?: 'attachment' | 'inline'; // Por defecto attachment
  contentId?: string; // Para attachments inline (CID)
}

// ================================
// 🎯 EMAIL COMPOSITION TYPES
// ================================

export type EmailPriority = 'high' | 'normal' | 'low';

export interface EmailMessage {
  to: string[]; // Destinatarios principales
  cc?: string[]; // Copia
  bcc?: string[]; // Copia oculta
  subject: string; // Asunto
  body: string; // Cuerpo en texto plano
  bodyHtml?: string; // Cuerpo en HTML (opcional)
  attachments?: EmailAttachment[]; // Archivos adjuntos
  priority?: EmailPriority; // Prioridad del email
  replyTo?: string; // Email de respuesta alternativo
  inReplyTo?: string; // ID del mensaje al que responde (para hilos)
  references?: string[]; // IDs de mensajes en el hilo
  requestReadReceipt?: boolean; // Solicitar confirmación de lectura
}

// ================================
// 🎯 GMAIL API TYPES
// ================================

export interface GmailSendRequest {
  raw: string; // Email codificado en Base64url
}

export interface GmailSendResponse {
  id: string; // ID del mensaje enviado
  threadId: string; // ID del hilo
}

export interface GmailApiError {
  error: {
    code: number; // Código HTTP
    message: string; // Mensaje de error
    status: string; // Estado del error
    details?: any; // Detalles adicionales
  };
}

// ================================
// 🎯 QUOTA & RATE LIMITING
// ================================

export interface SendEmailQuotaCheck {
  canSend: boolean; // Si puede enviar el email
  quotaRemaining: number; // Cuota restante
  resetTime?: Date; // Cuándo se resetea la cuota
  reason?: string; // Razón por la que no puede enviar
}

export interface GmailQuotaInfo {
  messagesPerDay: number; // Límite diario
  messagesSentToday: number; // Enviados hoy
  attachmentSizeLimit: number; // Límite de archivos adjuntos
  rateLimitPerSecond: number; // Límite por segundo
}

// ================================
// 🎯 EMAIL HEADERS
// ================================

export interface EmailHeaders {
  // Headers básicos
  'From'?: string;
  'To'?: string;
  'Cc'?: string;
  'Bcc'?: string;
  'Subject'?: string;
  'Date'?: string;
  // Headers de prioridad
  'Priority'?: string; // 1=High, 3=Normal, 5=Low
  'X-Priority'?: string; // 1=High, 3=Normal, 5=Low
  'X-MSMail-Priority'?: string; // High, Normal, Low  
  'Importance'?: string; // high, normal, low
  // Headers para mantener hilo
  'In-Reply-To'?: string; // ID del mensaje al que responde
  'References'?: string; // Cadena de IDs de mensajes previos
  // Header de confirmación de lectura
  'Disposition-Notification-To'?: string; // Email para confirmación
}

// ================================
// 🎯 SERVICE RESPONSE TYPES
// ================================

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

export interface SendEmailRequest {
  // Datos del DTO transformados para el service
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  priority: EmailPriority;
  requestReadReceipt?: boolean;
  attachments?: EmailAttachment[];
  inReplyTo?: string;
  references?: string[];
  // Datos adicionales del contexto
  userId: string; // ✅ CAMBIADO: number → string (UUID)
  accessToken: string;
  cuentaGmailId: string; // ✅ CAMBIADO: number → string (UUID)
}

// ================================
// 🎯 ERROR HANDLING
// ================================

export interface SendEmailError {
  code: string; // Código interno del error
  message: string; // Mensaje descriptivo
  details?: any; // Detalles adicionales del error
  gmailApiError?: GmailApiError; // Error original de Gmail API
  timestamp: string; // Cuándo ocurrió el error
}

export interface SendEmailValidationError {
  field: string; // Campo que causó el error
  value: any; // Valor inválido
  reason: string; // Por qué es inválido
  code: 'INVALID_EMAIL' | 'TOO_MANY_RECIPIENTS' | 'INVALID_ACCOUNT' | 'QUOTA_EXCEEDED';
}

// ================================
// 🎯 LOGGING & DEBUGGING
// ================================

export interface SendEmailLog {
  requestId: string; // ID único para tracking
  userId: string; // ✅ CAMBIADO: number → string (UUID)
  fromEmail: string;
  toCount: number;
  ccCount?: number;
  bccCount?: number;
  hasAttachments: boolean;
  priority: EmailPriority;
  startTime: number; // Timestamp de inicio
  endTime?: number; // Timestamp de fin
  duration?: number; // Duración en ms
  success: boolean;
  errorCode?: string;
  messageId?: string; // Si fue exitoso
  threadId?: string; // Si fue exitoso
}

// ================================
// 🎯 METRICS & ANALYTICS
// ================================

export interface SendEmailMetrics {
  userId: string; // ✅ CAMBIADO: number → string (UUID)
  date: Date;
  emailsSent: number;
  emailsFailed: number;
  totalRecipients: number;
  averageSize: number;
  attachmentCount: number;
  priorityBreakdown: {
    high: number;
    normal: number;
    low: number;
  };
}