// 'use client';

import { Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useState } from "react";
import { searchMessages } from "@/services/whatsapp/whatsapp";
import { Conversation } from "@/interfaces/interfacesWhatsapp";

interface SearchBarProps {
  onResults: (results: Conversation[]) => void;
  onError: () => void;
}

export default function SearchBar({ onResults }: SearchBarProps) {
  const [search, setSearch] = useState("");

  const handleSearch = async (value: string) => {
    setSearch(value);

    if (value.trim() === "") {
      onResults([]);
      return;
    }

    try {
      const results = await searchMessages(value);
      onResults(results);
    } catch (error) {
      console.error("Error al buscar mensajes:", error);
      onResults([]);
    }
  };

  return (
    <Input
      placeholder="Buscar en todos los mensajes"
      prefix={<SearchOutlined />}
      allowClear
      value={search}
      onChange={(e) => handleSearch(e.target.value)}
      style={{ marginBottom: 16}}
    />
  );
}
