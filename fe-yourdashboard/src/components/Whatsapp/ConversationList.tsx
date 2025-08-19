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
        const data = await getConversations();
        setConversations(data);
      } catch (error) {
        console.error("Error fetching conversations", error);
      } finally {
        setLoading(false);
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
          className={`cursor-pointer ${
            selectedChatId === chat.id ? "bg-gray-200" : ""
          }`}
          onClick={() => onSelectChat(chat.id)}
        >
          <List.Item.Meta title={chat.name} description={chat.last_message} />
        </List.Item>
      )}
    />
  );
}
