// ms-yourdashboard-email/src/emails/interfaces/save-full-content.interfaces.ts
// ✅ MIGRADO A UUID - emailSincronizadoId y otros IDs cambiados según corresponda

export interface SaveFullContentResponse {
  success: boolean;
  message: string;
  emailId: string;
  savedAt: string;
  contentSize: number;
  attachmentsCount: number;
  hasFullContent: boolean;
  wasAlreadySaved: boolean;
}

export interface SaveFullContentError {
  success: false;
  error: string;
  message: string;
  emailId?: string;
}

export interface EmailCompleteContent {
  emailSincronizadoId: number; // Mantiene number ya que es un ID interno de secuencia, no user/cuenta
  cuerpoTexto: string | null;
  cuerpoHtml: string | null;
  headersCompletos: Record<string, string>;
  adjuntos: EmailAttachmentComplete[];
  labelsCompletos: EmailLabelsComplete;
  threadId: string | null;
}

export interface EmailAttachmentComplete {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
  content: string; // Base64
  disposition?: 'attachment' | 'inline';
  contentId?: string;
}

export interface EmailLabelsComplete {
  systemLabels: string[];
  userLabels: string[];
  gmailCategories: string[];
  labelDetails: EmailLabelDetail[];
}

export interface EmailLabelDetail {
  id: string;
  name: string;
  type: 'system' | 'user';
  color?: string;
}