'use client';

import { useState } from 'react';
import SearchBar from './SearchBar';
import ConversationList from './ConversationList';
import { Message } from '@/types';

export default function ChatPanel({ accountId }: { accountId: string }) {
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string>('');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 🔍 Search bar arriba */}
      <div style={{ padding: '12px', borderBottom: '1px solid #f0f0f0' }}>
        <SearchBar onResults={setSearchResults} />
      </div>

      {/* 💬 Lista de conversaciones o resultados */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <ConversationList
          selectedChatId={selectedChatId}
          onSelectChat={setSelectedChatId}
          searchResults={searchResults}
        />
      </div>
    </div>
  );
}
