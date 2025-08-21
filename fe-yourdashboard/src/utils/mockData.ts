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


'chat1': [
    { from: 'me', text: 'Hola Carlos', time: '10:00' },
    { from: 'Carlos', text: 'Hola me', time: '10:02' },
    { from: 'me', text: '¿Cómo va todo?', time: '10:03' },
    { from: 'Carlos', text: 'Bien, trabajando mucho.', time: '10:04' },
    { from: 'me', text: '¿Y la familia?', time: '10:05' },
    { from: 'Carlos', text: 'Todos bien, gracias. ¿Y tú?', time: '10:06' },
    { from: 'me', text: 'También bien, gracias.', time: '10:07' },
    { from: 'Carlos', text: '¿Vas a venir a la reunión?', time: '10:08' },
    { from: 'me', text: 'Sí, claro. ¿A qué hora es?', time: '10:09' },
    { from: 'Carlos', text: 'A las 7pm.', time: '10:10' },
    { from: 'me', text: 'Perfecto, ahí estaré.', time: '10:11' },
    { from: 'Carlos', text: 'Genial, nos vemos entonces.', time: '10:12' },
    { from: 'me', text: '¿Llevo algo?', time: '10:13' },
    { from: 'Carlos', text: 'No hace falta, solo ganas de pasarla bien.', time: '10:14' },
    { from: 'me', text: 'Jajaja, seguro.', time: '10:15' },
    { from: 'Carlos', text: '¿Recuerdas a Ana?', time: '10:16' },
    { from: 'me', text: 'Sí, claro.', time: '10:17' },
    { from: 'Carlos', text: 'Ella también va.', time: '10:18' },
    { from: 'me', text: '¡Qué bien!', time: '10:19' },
    { from: 'Carlos', text: 'Va a ser divertido.', time: '10:20' },
    // Mensajes extra para hacer la conversación larga
    ...Array.from({ length: 50 }, (_, i) => ({
      from: i % 2 === 0 ? 'me' : 'Carlos',
      text: `Mensaje largo de prueba número ${i + 1}`,
      time: `11:${(i + 10).toString().padStart(2, '0')}`
    })),
  ],
  'chat2': [
    { from: 'me', text: 'Ana, ¿cómo estás?', time: '11:00' },
    { from: 'Ana', text: 'Bien, ¿y tú?', time: '11:01' },
  ],
  'chat3': [
    { from: 'me', text: 'Pedro, ¿me escuchas?', time: '09:30' },
    { from: 'Pedro', text: 'Sí, María', time: '09:31' },
  ],
  'chat4': [
    { from: 'me', text: 'Hola Luisa', time: '08:00' },
    { from: 'Luisa', text: '¡Hola!', time: '08:02' },
  ],
  'chat5': [
    { from: 'me', text: 'Pedro, ¿qué tal?', time: '12:00' },
    { from: 'Pedro', text: 'Todo bien, ¿y tú?', time: '12:01' },
  ],
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
