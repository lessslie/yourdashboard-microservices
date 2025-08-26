import {ConversationListItem, Message } from "@/interfaces/interfacesWhatsapp";

export const accounts = [
  { id: '1', name: 'Juan' },
  { id: '2', name: 'María' },
  { id: '3', name: 'Pedro' },
];

export const mockConversations: { [key: string]: ConversationListItem[] } = {
  '2': [
    {
      conversation_id: 'chat1',
      name: 'Carlos',
      phone: '+34 612 345 678',
      last_message: 'nos hablamos luego',
      last_message_date: '2025-08-19T09:15:00',
      whatsapp_account_id: '2',
    },
    {
      conversation_id: 'chat2',
      name: 'Ana',
      phone: '+34 612 987 654',
      last_message: '¿Cómo estás?',
      last_message_date: '2025-08-19T11:00:00',
      whatsapp_account_id: '2',
    },
  ],
  '3': [
    {
      conversation_id: 'chat3',
      name: 'Teresa',
      phone: '+34 611 123 456',
      last_message: 'Sí, Pedro, nos hablamos luego',
      last_message_date: '2025-08-18T08:40:00',
      whatsapp_account_id: '3',
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
      from: "me",
      message: "Hola Carlos!",
      timestamp: new Date().toISOString(),
    },
    {
      id: "2",
      conversation_id: "chat1",
      phone: "+34 612 222 222",
      name: "Carlos",
      from: "other",
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
      from: "me",
      message: "Hola Ana",
      timestamp: new Date().toISOString(),
    },
    {
      id: "4",
      conversation_id: "chat2",
      phone: "+34 613 333 333",
      name: "Ana",
      from: "other",
      message: "¿Cómo estás?",
      timestamp: new Date().toISOString(),
    },
  ],
  chat3: [
  {
    id: "5",
    conversation_id: "chat3",
    phone: "+34 600 111 111",
    name: "Teresa",
    from: "other",
    message: "Hola Pedro",
    timestamp: new Date().toISOString(),
  },
  {
    id: "6",
    conversation_id: "chat3",
    phone: "+34 611 123 456",
    name: "Pedro",
    from: "me",
    message: "Hola Teresa, ¿cómo estás?",
    timestamp: new Date().toISOString(),
  },
  {
    id: "7",
    conversation_id: "chat3",
    phone: "+34 600 111 111",
    name: "Teresa",
    from: "other",
    message: "Bien, gracias. ¿Y tú?",
    timestamp: new Date().toISOString(),
  },
  {
    id: "8",
    conversation_id: "chat3",
    phone: "+34 611 123 456",
    name: "Pedro",
    from: "me",
    message: "Todo bien, un poco ocupado con el trabajo.",
    timestamp: new Date().toISOString(),
  },
  {
    id: "9",
    conversation_id: "chat3",
    phone: "+34 600 111 111",
    name: "Teresa",
    from: "other",
    message: "¡Uf! Sí, yo también estoy liada con proyectos.",
    timestamp: new Date().toISOString(),
  },
  {
    id: "10",
    conversation_id: "chat3",
    phone: "+34 611 123 456",
    name: "Pedro",
    from: "me",
    message: "¿Quieres que hablemos esta tarde por videollamada?",
    timestamp: new Date().toISOString(),
  },
  {
    id: "11",
    conversation_id: "chat3",
    phone: "+34 600 111 111",
    name: "Teresa",
    from: "other",
    message: "Perfecto, a las 18:00 me va bien.",
    timestamp: new Date().toISOString(),
  },
  {
    id: "12",
    conversation_id: "chat3",
    phone: "+34 611 123 456",
    name: "Pedro",
    from: "me",
    message: "Genial, nos vemos entonces.",
    timestamp: new Date().toISOString(),
  },
]

  // agrega más chats según tus conversaciones
};


