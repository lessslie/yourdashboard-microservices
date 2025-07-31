import axios from 'axios';

const API_URL = 'http://localhost:3004';

export const getConversations = async () => {
  try {
    const response = await axios.get(`${API_URL}/conversations`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener las conversaciones:', error);
    throw error;
  }
};



interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    timestamp: string;
}

export const getMessagesByConversationId = async (conversationId: string): Promise<Message[]> => {
    try {
        const response = await axios.get<Message[]>(`${API_URL}/messages`, {
            params: { conversationId },
        });
        return response.data;
    } catch (error) {
        console.error('Error al obtener los mensajes:', error);
        throw error;
    }
};


export const searchMessages = async (query: string) => {
  if (!query.trim()) return [];

  console.log('🔍 Haciendo petición al backend con:', query);
  try {
    const res = await axios.get('http://localhost:3004/search', {
      params: { q: query },
    });
    console.log('🔍 Respuesta del backend:', res.data);
    return res.data.messages;
  } catch (error) {
    console.error('Error al buscar mensajes:', error);
    return [];
  }
};