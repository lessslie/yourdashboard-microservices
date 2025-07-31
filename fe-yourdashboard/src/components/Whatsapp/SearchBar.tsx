'use client';

import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { searchMessages } from '@/server/whatsapp/whatsapp';

export default function SearchBar({ onResults }: { onResults: (messages: any[]) => void }) {
  const [search, setSearch] = useState('');

  const handleSearch = async (value: string) => {
    console.log('Buscando:', value); // 🔍 <-- Aquí vemos lo que se escribe
    setSearch(value);

    const results = await searchMessages(value);
    onResults(results);
  };

  return (
    <Input
      placeholder="Buscar en todos los mensajes"
      prefix={<SearchOutlined />}
      allowClear
      value={search}
      onChange={(e) => handleSearch(e.target.value)}
      style={{ marginBottom: 16 }}
    />
  );
}
