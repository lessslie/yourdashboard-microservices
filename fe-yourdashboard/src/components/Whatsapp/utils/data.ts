export const accounts = [
  { id: '1', name: 'Juan' },
];

export const conversations = {
  '1': [
    { id: 'chat1', name: 'Carlos', avatar: 'https://i.pravatar.cc/40?u=Carlos' },
    { id: 'chat2', name: 'Ana', avatar: 'https://i.pravatar.cc/40?u=Ana' },
    { id: 'chat5', name: 'Pedro', avatar: 'https://i.pravatar.cc/40?u=Pedro' },
    { id: 'chat6', name: 'Luisa', avatar: 'https://i.pravatar.cc/40?u=Luisa' },
    { id: 'chat7', name: 'Sofia', avatar: 'https://i.pravatar.cc/40?u=Sofia' },
    { id: 'chat8', name: 'Miguel', avatar: 'https://i.pravatar.cc/40?u=Miguel' },
    { id: 'chat9', name: 'Laura', avatar: 'https://i.pravatar.cc/40?u=Laura' },
    { id: 'chat10', name: 'Andrés', avatar: 'https://i.pravatar.cc/40?u=Andres' },
    { id: 'chat11', name: 'Elena', avatar: 'https://i.pravatar.cc/40?u=Elena' },
    { id: 'chat12', name: 'David', avatar: 'https://i.pravatar.cc/40?u=David' },
    { id: 'chat13', name: 'Lucía', avatar: 'https://i.pravatar.cc/40?u=Lucia' },
    { id: 'chat14', name: 'Pablo', avatar: 'https://i.pravatar.cc/40?u=Pablo' },
    { id: 'chat15', name: 'Valeria', avatar: 'https://i.pravatar.cc/40?u=Valeria' },
  ],
  '2': [
    { id: 'chat3', name: 'Pedro', avatar: 'https://i.pravatar.cc/40?u=Pedro' },
    { id: 'chat4', name: 'Luisa', avatar: 'https://i.pravatar.cc/40?u=Luisa' },
  ],
};

export const messages = {
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
};
