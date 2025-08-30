// src/orchestrator/interfaces/traffic-light.interfaces.ts

// Enum para colores del semáforo
export enum TrafficLightStatus {
  GREEN = 'green',
  YELLOW = 'yellow',
  ORANGE = 'orange',
  RED = 'red'
}

// Email extendido con campos del semáforo
export interface EmailWithTrafficLight {
  id?: number;
  cuenta_gmail_id: number;
  gmail_message_id: string;
  asunto?: string;
  remitente_email?: string;
  remitente_nombre?: string;
  destinatario_email?: string;
  fecha_recibido?: string;
  esta_leido: boolean;
  tiene_adjuntos: boolean;
  etiquetas_gmail?: string[];
  tamano_bytes?: number;
  fecha_sincronizado?: string;
  // CAMPOS DEL SEMÁFORO
  replied_at?: string | null;
  days_without_reply: number;
  traffic_light_status: TrafficLightStatus;
}

// Estadísticas por estado del semáforo
export interface TrafficLightStatusCount {
  traffic_light_status: TrafficLightStatus;
  count: string; // PostgreSQL COUNT devuelve string
  avg_days: string | null;
}

// Estadísticas por cuenta Gmail
export interface TrafficLightAccountStats {
  cuenta_id: number;
  email_gmail: string;
  nombre_cuenta: string;
  estadisticas: TrafficLightStatusCount[];
  total_sin_responder: number;
}

// Response del dashboard del semáforo
export interface TrafficLightDashboardResponse {
  success: boolean;
  dashboard: TrafficLightAccountStats[];
  ultima_actualizacion: string;
  error?: string;
}

// Response para obtener emails por color
export interface EmailsByTrafficLightResponse {
  success: boolean;
  status: TrafficLightStatus;
  count: number;
  emails: EmailWithTrafficLight[];
  error?: string;
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

// Response de actualización manual
export interface UpdateTrafficLightsResponse {
  success: boolean;
  message?: string;
  estadisticas?: UpdateTrafficLightsResult;
  error?: string;
}

// Respuestas del orchestrator para semáforos
export interface OrchestratorTrafficLightDashboard {
  success: boolean;
  source: string;
  data: {
    dashboard: TrafficLightAccountStats[];
    ultima_actualizacion: string;
  };
}

export interface OrchestratorEmailsByTrafficLight {
  success: boolean;
  source: string;
  status: TrafficLightStatus;
  data: {
    count: number;
    emails: EmailWithTrafficLight[];
  };
}

export interface OrchestratorUpdateTrafficLights {
  success: boolean;
  source: string;
  data: {
    message: string;
    estadisticas: UpdateTrafficLightsResult;
  };
}