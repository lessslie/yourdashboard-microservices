import {ConversationListItem, Message } from "@/interfaces/interfacesWhatsapp";

export const accounts = [
  { id: '1', name: 'Juan' },
  { id: '2', name: 'María' },
  { id: '3', name: 'Pedro' },
];

export const mockConversations: { [key: string]: ConversationListItem[] } = {
  '2': [
    {
      id: 'chat1',
      name: 'Carlos',
      phone: '+34 612 345 678',
      last_message: 'nos hablamos luego',
      last_message_date: '2025-08-19T09:15:00',
    },
    {
      id: 'chat2',
      name: 'Ana',
      phone: '+34 612 987 654',
      last_message: '¿Cómo estás?',
      last_message_date: '2025-08-19T11:00:00',
    },
  ],
  '3': [
    {
      id: 'chat3',
      name: 'Teresa',
      phone: '+34 611 123 456',
      last_message: 'Sí, Pedro, nos hablamos luego',
      last_message_date: '2025-08-18T08:40:00',
    },
  ],
};


export const mockMessages: { [chatId: string]: Message[] } = {
  chat1: [
    {
      id: "1",
      conversation_id: "chat1",
      phone: "+34 600 111 111",
      name: "Maria",
      message: "Hola Carlos!",
      timestamp: new Date().toISOString(),
    },
    {
      id: "2",
      conversation_id: "chat1",
      phone: "+34 612 222 222",
      name: "Carlos",
      message: "¡Hey Maria! ¿Qué tal?",
      timestamp: new Date().toISOString(),
    },
  ],
  chat2: [
    {
      id: "3",
      conversation_id: "chat2",
      phone: "+34 600 111 111",
      name: "María",
      message: "Hola Ana",
      timestamp: new Date().toISOString(),
    },
    {
      id: "4",
      conversation_id: "chat2",
      phone: "+34 613 333 333",
      name: "Ana",
      message: "¿Cómo estás?",
      timestamp: new Date().toISOString(),
    },
  ],
  chat3: [
    {
      id: "5",
      conversation_id: "chat3",
      phone: "+34 600 111 111",
      name: "pedro",
      message: "Hola Pedro",
      timestamp: new Date().toISOString(),
    },
    {
      id: "6",
      conversation_id: "chat3",
      phone: "+34 611 123 456",
      name: "Teresa",
      message: "Sí, Pedro, nos hablamos luego",
      timestamp: new Date().toISOString(),
    },
  ],
  // agrega más chats según tus conversaciones
};


