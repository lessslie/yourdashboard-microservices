// src/emails/interfaces/traffic-light.interfaces.ts

// Enum para colores del semáforo
export enum TrafficLightStatus {
  GREEN = 'green',
  YELLOW = 'yellow',
  ORANGE = 'orange',
  RED = 'red'
}

// Extender EmailMetadataDB con campos del semáforo
export interface EmailMetadataDBWithTrafficLight {
  id?: number;
  cuenta_gmail_id: number;
  gmail_message_id: string;
  asunto?: string;
  remitente_email?: string;
  remitente_nombre?: string;
  destinatario_email?: string;
  fecha_recibido?: Date;
  esta_leido: boolean;
  tiene_adjuntos: boolean;
  etiquetas_gmail?: string[];
  tamano_bytes?: number;
  fecha_sincronizado?: Date;
  // CAMPOS DEL SEMÁFORO
  replied_at?: Date;
  days_without_reply: number;
  traffic_light_status: TrafficLightStatus;
}

// Resultado de marcar email como respondido
export interface MarkEmailRepliedResult {
  email_id: number;
  old_status: TrafficLightStatus;
  new_status: TrafficLightStatus;
  days_saved: number;
}

// Resultado de actualización masiva de semáforos
export interface UpdateTrafficLightsResult {
  actualizados: number;
  por_estado: TrafficLightStatusCounts;
  tiempo_ms: number;
}

export interface TrafficLightStatusCounts {
  red?: number;
  orange?: number;
  yellow?: number;
  green?: number;
}

// Response para responder email (extendida con semáforo)
export interface ReplyEmailResponse {
  success: boolean;
  message?: string;
  sentMessageId?: string;
  error?: string;
  traffic_light_updated?: boolean;
}

// Dashboard del semáforo por cuenta
export interface TrafficLightDashboardResponse {
  success: boolean;
  dashboard: TrafficLightAccountStats[];
  ultima_actualizacion: string;
  error?: string;
}

export interface TrafficLightAccountStats {
  cuenta_id: number;
  email_gmail: string;
  nombre_cuenta: string;
  estadisticas: TrafficLightStatusCount[];
  total_sin_responder: number;
}

export interface TrafficLightStatusCount {
  traffic_light_status: TrafficLightStatus;
  count: string; // PostgreSQL COUNT devuelve string
  avg_days: string | null;
}

// Response para obtener emails por color
export interface EmailsByTrafficLightResponse {
  success: boolean;
  status: TrafficLightStatus;
  count: number;
  emails: EmailMetadataDBWithTrafficLight[];
  error?: string;
}

// Request para actualizar semáforos
export interface UpdateTrafficLightsRequest {
  userId?: number; // Opcional, para actualizar solo del usuario
}

// Response de actualización manual
export interface UpdateTrafficLightsResponse {
  success: boolean;
  message?: string;
  estadisticas?: UpdateTrafficLightsResult;
  error?: string;
}

// Para búsqueda de emails con semáforo
export interface EmailSearchResultWithTrafficLight {
  emails: EmailMetadataDBWithTrafficLight[];
  total: number;
}

// Filtros de búsqueda extendidos con semáforo
export interface EmailSearchFiltersWithTrafficLight {
  cuenta_gmail_id?: number;
  esta_leido?: boolean;
  tiene_adjuntos?: boolean;
  remitente_email?: string;
  busqueda_texto?: string;
  fecha_desde?: Date;
  fecha_hasta?: Date;
  // FILTROS DEL SEMÁFORO
  traffic_light_status?: TrafficLightStatus;
  days_without_reply_min?: number;
  days_without_reply_max?: number;
  replied?: boolean; // true = solo respondidos, false = solo no respondidos
}