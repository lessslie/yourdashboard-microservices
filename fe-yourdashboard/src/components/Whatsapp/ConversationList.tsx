"use client";

import { useState, useEffect } from "react";
import { List } from "antd";
import { getConversations } from "@/services/whatsapp/whatsapp";
import { ConversationListItem } from "@/interfaces/interfacesWhatsapp";

// importa tus mocks
import { mockConversations } from "@/components/Whatsapp/utils/data";


interface ConversationListProps {
  onSelectChat: (chatId: string) => void;
  selectedChatId: string | null;
  accountId: string; 
  conversations?: ConversationListItem[];// 👈 para saber si usar back o mock
}

export default function ConversationList({
  onSelectChat,
  selectedChatId,
  accountId,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchConversations = async () => {
      setLoading(true);
      try {
        // solo el accountId = "1" tiene back
        console.log("Fetching conversations for account:", accountId);
        let data: ConversationListItem[] = [];
        if (accountId === "1") {
          data = await getConversations();
          console.log("Fetched conversations from back:", data);
        }

        // si no hay nada del back, usa mock
        if (!data || data.length === 0) {
          data = mockConversations[accountId] || [];
        }

        setConversations(data);
      } catch (error) {
        console.error("Error fetching conversations", error);
        // fallback mock en caso de error
        setConversations(mockConversations[accountId] || []);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [accountId]);

  return loading ? (
    <p>Cargando conversaciones...</p>
  ) : (
    <List
  itemLayout="horizontal"
  dataSource={conversations}
  renderItem={(chat) => (
    <List.Item
      style={{
        backgroundColor: selectedChatId === chat.conversation_id ? "#188fff44" : "transparent",
        padding: "10px 16px",
        cursor: "pointer",
      }}
      onClick={() => onSelectChat(chat.conversation_id)}
    >
      <List.Item.Meta title={chat.name} description={chat.last_message} />
    </List.Item>
  )}
/>

  );
}
