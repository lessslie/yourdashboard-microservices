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
          className={`cursor-pointer ${
            selectedChatId === chat.conversation_id ? "bg-gray-200" : ""
          }`}
          onClick={() => onSelectChat(chat.conversation_id)}
        >
          <List.Item.Meta title={chat.name} description={chat.last_message} />
        </List.Item>
      )}
    />
  );
}
