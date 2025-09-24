// src/orchestrator/interfaces/orchestrator.interfaces.ts

// Interfaces específicas para evitar `any` en responder emails
export interface ReplyEmailRequest {
  body: string;
  bodyHtml?: string;
}

export interface ReplyEmailResponse {
  success: boolean;
  message: string;
  sentMessageId: string;
}

// Respuestas de MS-Auth
export interface TokenResponse {
  success: boolean;
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  renewed: boolean;
}

// Respuestas de MS-Email
export interface EmailListResponse {
  emails: Email[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  searchTerm?: string;
}

export interface Email {
  id: string;
  messageId: string;
  subject: string;
  fromEmail: string;
  fromName: string;
  receivedDate: string;
  isRead: boolean;
  hasAttachments: boolean;
}

export interface EmailDetail extends Email {
  toEmails: string[];
  bodyText?: string;
  bodyHtml?: string;
  sourceAccount?: string;  // Cuenta Gmail de origen
  sourceAccountId?: string;  // ID de la cuenta Gmail de origen
}

export interface EmailStats {
  totalEmails: number;
  unreadEmails: number;
  readEmails: number;
}

// Respuestas del Orchestrator
export interface OrchestratorResponse<T = any> {
  success: boolean;
  source: 'orchestrator';
  data: T;
  searchTerm?: string;
}

export interface DashboardSummary {
  stats: EmailStats;
  recentEmails: Email[];
  lastUpdated: string;
}

export interface HealthCheck {
  service: string;
  status: 'OK' | 'ERROR';
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  dependencies: {
    'ms-auth': string;
    'ms-email': string;
  };
}

export interface ServiceInfo {
  service: string;
  status: 'OK' | 'ERROR';
  description: string;
  timestamp: string;
  port: string | number;
  endpoints: {
    auth: string;
    emails: {
      inbox: string;
      search: string;
      stats: string;
      detail: string;
    };
    dashboard: string;
  };
}

export interface AuthStartResponse {
  success: boolean;
  message: string;
  authUrl: string;
  instructions: string;
}

// Tipos para respuestas de Axios
export interface AxiosResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  config: any;
  request?: any;
}

// Tipos para manejo de errores
export interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
  message: string;
}