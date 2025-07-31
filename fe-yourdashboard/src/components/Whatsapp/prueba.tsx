import { useEffect, useState } from 'react';
import { getMessagesByConversationId } from '../services/whatsapp';

interface Message {
  id: string;
  phone: string;
  message: string;
  timestamp: string;
}

interface Props {
  conversationId: string;
}

export const MessagesPanel = ({ conversationId }: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!conversationId) return;

    const fetchMessages = async () => {
      try {
        const data = await getMessagesByConversationId(conversationId);
        console.log('✅ Mensajes recibidos:', data);
        setMessages(data);
      } catch (error) {
        console.error('❌ Error al obtener mensajes:', error);
      }
    };

    fetchMessages();
  }, [conversationId]);

  return (
    <div className="p-4 h-[calc(100%-64px)] overflow-y-auto bg-gray-100">
      {messages.length === 0 ? (
        <p className="text-gray-500">No hay mensajes aún.</p>
      ) : (
        messages.map((msg) => (
          <div key={msg.id} className="mb-3 p-2 rounded bg-white shadow">
            <div className="text-sm text-gray-800">
              <strong>{msg.phone}</strong>: {msg.message}
            </div>
            <div className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleString()}</div>
          </div>
        ))
      )}
    </div>
  );
};
