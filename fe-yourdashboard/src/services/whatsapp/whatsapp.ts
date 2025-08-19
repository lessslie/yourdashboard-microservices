import { Conversation, Message } from '@/interfaces/interfacesWhatsapp';
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

export const getMessagesByConversationId = async (conversationId: string): Promise<Message[]> => {
    try {
        const response = await axios.get<Message[]>(`${API_URL}/messages`, {
            params: { conversationId },
        });
        console.log('Mensajes obtenidos:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error al obtener los mensajes:', error);
        throw error;
    }
};


export const searchMessages = async (query: string): Promise<Conversation[]> => {
  if (!query.trim()) return [];

  console.log('🔍 Haciendo petición al backend con:', query);
  try {
    const res = await axios.get('http://localhost:3004/search', {
      params: { q: query },
    });
    console.log('🔍 Respuesta del backend:', res.data);
    if (Array.isArray(res.data)) {
      return res.data;
    } else {
      console.warn('⚠️ Respuesta no es un array:', res.data);
      return [];
    }
  } catch (error) {
    console.error('Error al buscar mensajes:', error);
    return [];
  }
};
