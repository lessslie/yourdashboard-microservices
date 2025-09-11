import { Conversation, Message } from '@/interfaces/interfacesWhatsapp';
import axios from 'axios';

const MS_ORCHES_URL =
  process.env.NEXT_PUBLIC_MS_ORCHESTRATOR_URL || "http://localhost:3003";

export const getConversations = async () => {
  try {
    const response = await axios.get(`${MS_ORCHES_URL}/orchestrator/whatsapp/conversations`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener las conversaciones:', error);
    throw error;
  }
};

export const getMessagesByConversationId = async (conversationId: string): Promise<Message[]> => {
    try {
        const response = await axios.get<Message[]>(`${MS_ORCHES_URL}/orchestrator/whatsapp/messages`, {
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
    const res = await axios.get(`${MS_ORCHES_URL}/orchestrator/whatsapp/search`, {
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

export const sendMessage = async (conversationId: string, message: string): Promise<void> => {
  try {
    await axios.post(`${MS_ORCHES_URL}/orchestrator/whatsapp/send`, {
      conversationId,
      message,
    });
    console.log('Mensaje enviado correctamente');
  } catch (error) {
    console.error('Error al enviar el mensaje:', error);
    throw error;
  }
};

export const getAccounts = async () => {
  try {
    const response = await axios.get(`${MS_ORCHES_URL}/orchestrator/whatsapp/accounts`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener las cuentas:', error);
    throw error;
  }
}
