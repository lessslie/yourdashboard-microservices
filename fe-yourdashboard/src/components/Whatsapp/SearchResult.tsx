"use client";

import { SearchResultProps } from "@/interfaces/interfacesWhatsapp";
import { List } from "antd";

export default function SearchResult({
  conversations,
  selectedChatId,
  onSelectChat,
}: SearchResultProps) {
  if (conversations.length === 0) {
    return <p>No se encontraron resultados</p>;
  }

  return (
   <List
      itemLayout="horizontal"
      dataSource={conversations}
      renderItem={(chat) => (
        <List.Item
          style={{
            backgroundColor: selectedChatId === chat.conversation_id ? "#188fff44" : "transparent",
            padding: "10px 16px",
            cursor: "pointer"
          }}
          onClick={() => onSelectChat(chat.conversation_id)}
        >
          <List.Item.Meta 
            title={chat.name} 
            description={chat.matched_message} 
          />
        </List.Item>
      )}
    />
  );
}
