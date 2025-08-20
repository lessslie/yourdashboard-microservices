export interface Conversation {
  conversation_id: string;
  phone: string;
  name: string;
  last_message: string;
  last_message_date: string;
}

export interface ConversationListItem {
  id: string;
  phone: string;
  name: string;
  last_message: string;
  last_message_date: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  message: string;
  name: string;
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
