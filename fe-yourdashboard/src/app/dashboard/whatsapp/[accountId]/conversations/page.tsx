'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Row, Col, Empty, Layout } from 'antd';
import SearchBar from '@/components/Whatsapp/SearchBar';
import ConversationList from '@/components/Whatsapp/ConversationList';
import ChatWindow from '@/components/Whatsapp/ChatWindow';

const { Content } = Layout;

export default function ConversationsPage() {
  const params = useParams();
  const accountId = params?.accountId as string;

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  if (!accountId) {
    return <Empty description="Cuenta no válida" />;
  }

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Content style={{ height: '100%', overflow: 'hidden', padding: 0 }}>
        <Row style={{ height: '100%', overflow: 'hidden' }}>
          {/* Sidebar con buscador y lista de chats */}
          <Col
  span={8}
  style={{
    borderRight: '1px solid #f0f0f0',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden'
  }}
>
  {/* SearchBar fijo arriba */}
<div
  style={{
    position: 'sticky',
    top: 60, // si hay un header de 60px arriba
    zIndex: 10,
    backgroundColor: '#fff',
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid #f0f0f0',
    height: 64,
    paddingInline: 16,
  }}
>
  <SearchBar onResults={setSearchResults} />
</div>

{/* Lista con scroll sin afectar el SearchBar */}
<div
  style={{
    flex: 1,
    overflowY: 'auto',
    minHeight: 0,
    paddingTop: 64, // <- Este padding evita que se tape el primer ítem
  }}
>
  <ConversationList
    accountId={accountId}
    selectedChatId={selectedChatId ?? ''}
    onSelectChat={setSelectedChatId}
    searchResults={searchResults}
  />
</div>
</Col>

          {/* Botón para volver al listado de cuentas */}
          {/* Ventana de chat */}
          <Col
            span={16}
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {selectedChatId ? (
              <ChatWindow
                chatId={selectedChatId}
                contact={(() => {
                  try {
                    const { conversations } = require('@/components/Whatsapp/utils/data');
                    return (Object.values(conversations).flat().find((c: any) => c.id === selectedChatId) ?? undefined) as { name: string; avatar?: string } | undefined;
                  } catch {
                    return undefined;
                  }
                })()}
              />
            ) : (
              <Empty description="Selecciona una conversación" style={{ marginTop: 100 }} />
            )}
          </Col>

        </Row>
      </Content>
    </Layout>
  );
}
