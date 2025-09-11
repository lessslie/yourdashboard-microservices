"use client";

import { useState, useEffect } from "react";
import { List } from "antd";
import { getConversations } from "@/services/whatsapp/whatsapp";
import { ConversationListItem } from "@/interfaces/interfacesWhatsapp";

interface ConversationListProps {
  onSelectChat: (chatId: string) => void;
  selectedChatId: string | null;
  conversations?: ConversationListItem[];
}

export default function ConversationList({
  onSelectChat,
  selectedChatId,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
        const fetchConversations = async () => {
          setLoading(true);
          try {
            const conversations = await getConversations();
            console.log("Conversaciones obtenidas:", conversations );
            setLoading(false);
            setConversations(conversations);
    
    
          } catch (error) {
            console.error("Error fetching conversations", error);
          }
        };
        fetchConversations();
      }, []);

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
