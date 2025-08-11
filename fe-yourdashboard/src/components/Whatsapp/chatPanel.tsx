// 'use client';

// import { useState } from 'react';
// import SearchBar from './SearchBar';
// import ConversationList from './ConversationList';
// import { Message } from '@/interfaces/interfacesWhatsapp';

// export default function ChatPanel({ accountId }: { accountId: string }) {
//   const [searchResults, setSearchResults] = useState<Message[]>([]);
//   const [selectedChatId, setSelectedChatId] = useState<string>('');
//   console.log("este es el selectedId", selectedChatId, "este es el setSelected ", setSelectedChatId)

//   return (
//     <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
//       {/* 🔍 Search bar arriba */}
//       <div style={{ padding: '12px', borderBottom: '1px solid #f0f0f0' }}>
//         <SearchBar onResults={setSearchResults} />
//       </div>

//       {/* 💬 Lista de conversaciones o resultados */}
//       <div style={{ flex: 1, overflow: 'auto'}}>
//         <ConversationList
//           selectedChatId={selectedChatId}
//           onSelectChat={setSelectedChatId}
//         />
//       </div>
//     </div>
//   );
// }
