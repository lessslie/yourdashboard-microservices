export interface Account {
  id: string;
  usuario_principal_id: number;
  phone: string;
  nombre_cuenta: string;
  token: string;
  fecha_conexion: string;
  esta_activa: boolean;
  alias_personalizado: string | null;
  phone_number_id: string;
  token_updated_at: string;
  token_expires_at: string | null;
}
export interface Conversation {
  conversation_id: string;
  phone: string;
  name: string;
  last_message: string;
  last_message_date: string;
  whatsapp_account_id: string;
  matched_message?: string; // Mensaje que coincide con la búsqueda
  matched_messages_id?: string; // IDs de mensajes que coinciden con la búsqueda
}

export interface ConversationListItem {
  conversation_id: string,
  name: string,
  phone: string,
  last_message: string;
  last_message_date: string;
  whatsapp_account_id: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  message: string;
  name: string;
  from?: 'me' | 'other';
  timestamp: string;
  phone: string;
}

export interface ChatItem {
  id: string;
  name: string;
  avatar?: string;
  lastText: string;
  lastTime: string;
}

export interface SearchResultProps {
  conversations: Conversation[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
}

// Mensaje crudo del backend
export interface ServerMessage {
  phone: string;
  message: string;
  name: string;
  timestamp: string;
}

// Mensaje que usamos en el componente UI
export interface UIMessage {
  from: "me" | "other";
  name: string;
  phone: string;
  text: string;
  time: string;
}

export interface Props {
  accountId: string;
  selectedChatId: string;
  onSelectChat: (chatId: string) => void;
  searchResults?: Conversation[];
}
