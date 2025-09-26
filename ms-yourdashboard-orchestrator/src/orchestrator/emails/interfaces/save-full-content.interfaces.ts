// En src/orchestrator/interfaces/save-full-content.interfaces.ts

export interface SaveFullContentResponse {
  success: boolean;
  source: string;
  data: {
    emailId: string;
    savedAt: string;
    contentSize: number;
    attachmentsCount: number;
    hasFullContent: boolean;
    wasAlreadySaved: boolean;
  };
}

export interface SaveFullContentError {
  success: false;
  source: string;
  error: string;
  message: string;
  emailId?: string;
  timestamp: string;
}
