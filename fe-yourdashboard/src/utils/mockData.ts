import { Message } from '../interfaces/interfacesWhatsapp';

export const accounts = [
  { id: '1', name: 'Juan Pérez', avatar: 'https://i.pravatar.cc/150?u=juan', phone: '5491111111111' },
  { id: '2', name: 'María López', avatar: 'https://i.pravatar.cc/150?u=maria', phone: '5492222222222' },
  { id: '3', name: 'Carlos Gómez', avatar: 'https://i.pravatar.cc/150?u=carlos', phone: '5493333333333' },
  { id: '4', name: 'Ana Torres', avatar: 'https://i.pravatar.cc/150?u=ana', phone: '5494444444444' }
];

export const mockConversations = [
  { id: 'c1', accountId: '1', lastMessage: '¿Cómo estás?', time: '10:30' },
  { id: 'c2', accountId: '2', lastMessage: 'Nos vemos mañana', time: '09:15' },
  { id: 'c3', accountId: '3', lastMessage: 'Enviado el documento', time: 'Ayer' },
  { id: 'c4', accountId: '4', lastMessage: '¿Listo para la reunión?', time: '08:00' }
];

// Mensajes adaptados al formato real del backend
export const messages: Record<string, Message[]> = {
  c1: [
    {
      id: 'm1',
      conversation_id: 'c1',
      phone: '5491111111111',
      message: 'Hola',
      timestamp: '2025-08-10T10:00:00.000Z',
      name: 'Juan Pérez'
    },
    {
      id: 'm2',
      conversation_id: 'c1',
      phone: 'me',
      message: '¡Hola! ¿Cómo estás?',
      timestamp: '2025-08-10T10:02:00.000Z',
      name: 'Yo'
    },
    {
      id: 'm3',
      conversation_id: 'c1',
      phone: '5491111111111',
      message: 'Bien, ¿y tú?',
      timestamp: '2025-08-10T10:30:00.000Z',
      name: 'Juan Pérez'
    }
  ],
  c2: [
    {
      id: 'm4',
      conversation_id: 'c2',
      phone: 'me',
      message: '¿Confirmamos la cita?',
      timestamp: '2025-08-10T09:10:00.000Z',
      name: 'Yo'
    },
    {
      id: 'm5',
      conversation_id: 'c2',
      phone: '5492222222222',
      message: 'Sí, nos vemos mañana',
      timestamp: '2025-08-10T09:15:00.000Z',
      name: 'María López'
    }
  ],
  c3: [
    {
      id: 'm6',
      conversation_id: 'c3',
      phone: '5493333333333',
      message: 'Te mandé el documento',
      timestamp: '2025-08-09T12:00:00.000Z',
      name: 'Carlos Gómez'
    },
    {
      id: 'm7',
      conversation_id: 'c3',
      phone: 'me',
      message: 'Perfecto, gracias',
      timestamp: '2025-08-09T12:05:00.000Z',
      name: 'Yo'
    }
  ],
  c4: [
    {
      id: 'm8',
      conversation_id: 'c4',
      phone: '5494444444444',
      message: '¿Listo para la reunión?',
      timestamp: '2025-08-10T08:00:00.000Z',
      name: 'Ana Torres'
    },
    {
      id: 'm9',
      conversation_id: 'c4',
      phone: 'me',
      message: 'Sí, nos vemos en 10 minutos',
      timestamp: '2025-08-10T08:05:00.000Z',
      name: 'Yo'
    }
  ]
};

export const searchResults = accounts.map(acc => ({
  id: acc.id,
  name: acc.name,
  avatar: acc.avatar
}));
