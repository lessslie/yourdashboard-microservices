// src/emails/interfaces/email.interfaces.ts

// Tipos para Gmail API (compatibles con googleapis)
export interface GmailMessage {
  id?: string | null;
  threadId?: string | null;
  labelIds?: string[] | null;
  snippet?: string | null;
  payload?: GmailPayload | null;
  sizeEstimate?: number | null;
  historyId?: string | null;
  internalDate?: string | null;
}

export interface GmailPayload {
  partId?: string | null;
  mimeType?: string | null;
  filename?: string | null;
  headers?: GmailHeader[] | null;
  body?: GmailBody | null;
  parts?: GmailPayload[] | null;
}

export interface GmailHeader {
  name?: string | null;
  value?: string | null;
}

export interface GmailBody {
  attachmentId?: string | null;
  size?: number | null;
  data?: string | null;
}

export interface GmailListResponse {
  messages?: GmailMessage[] | null;
  nextPageToken?: string | null;
  resultSizeEstimate?: number | null;
}

export interface GmailMessageResponse {
  data: GmailMessage;
}

// Tipos para respuestas del servicio
export interface EmailMetadata {
  id: string;
  messageId: string;
  subject: string;
  fromEmail: string;
  fromName: string;
  receivedDate: Date;
  isRead: boolean;
  hasAttachments: boolean;
  ///extras para la busqueda de emails global
  sourceAccount?: string;      
  sourceAccountId?: number;
  // ✅ CAMPOS PARA SEMÁFORO:
  trafficLightStatus?: string;
  daysWithoutReply?: number;
  repliedAt?: Date | null;
}

export interface EmailDetail extends EmailMetadata {
  toEmails: string[];
  bodyText?: string;
  bodyHtml?: string;
  

}

export interface EmailListResponse {
  emails: EmailMetadata[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  searchTerm?: string;
  
  // 🎯 NUEVO CAMPO PARA BÚSQUEDA GLOBAL
  accountsSearched?: string[];
}
// 🎯 INTERFACE ESPECÍFICA PARA BÚSQUEDA GLOBAL
export interface GlobalSearchResponse extends EmailListResponse {
  accountsSearched: string[]; // Obligatorio para búsqueda global
}

export interface EmailStats {
  totalEmails: number;
  unreadEmails: number;
  readEmails: number;
}

export interface EmailBodyData {
  text: string;
  html: string;
}

// Tipos para base de datos
export interface DatabaseEmailData {
  userId: string;
  messageId: string;
  subject: string;
  fromEmail: string;
  fromName?: string;
  toEmails: string[];
  bodyText?: string;
  bodyHtml?: string;
  receivedDate: Date;
  isRead: boolean;
  hasAttachments: boolean;
}

export interface DatabaseUserData {
  googleId: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
}

// Tipos para respuestas de servicios externos
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Tipos para autenticación
export interface AuthData {
  googleId: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string;
}

export interface CallbackResult {
  user: {
    id: string;
    email: string;
    name: string;
  };
  emailsCount: number;
  status: 'success' | 'error';
}

// Tipos para manejo de errores
export interface EmailServiceError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

// Tipos para health check
export interface HealthResponse {
  service: string;
  status: 'OK' | 'ERROR';
  timestamp: string;
  port: string | number;
  mode: string;
}