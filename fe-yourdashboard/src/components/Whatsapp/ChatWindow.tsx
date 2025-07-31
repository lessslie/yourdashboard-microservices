'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar, List, Typography, Layout } from 'antd';
import ChatInput from './ChatInput';
import { getMessagesByConversationId } from '@/server/whatsapp/whatsapp';

const { Header, Content, Footer } = Layout;

type Message = {
  from: string;
  text: string;
  time?: string;
  name: string;
  phone: string;
};

interface ChatWindowProps {
  chatId: string;
  contact?: { name: string; avatar?: string; phone?: string };
}

export default function ChatWindow({ chatId, contact }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // El teléfono del usuario actual es diferente al del contacto
  const myPhone = typeof window !== 'undefined' ? window.localStorage.getItem('myPhone') || '' : '';
  const contactPhone = contact?.phone || '';

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const data = await getMessagesByConversationId(chatId);
        setMessages(
          (data as any[]).map((msg) => ({
            from: msg.phone === myPhone ? 'me' : 'other',
            name: msg.phone === myPhone ? 'Yo' : contact?.name || msg.name,
            phone: msg.phone,
            text: msg.message,
            time: new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          }))
        );
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, [chatId, contact?.name, contact?.phone]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Obtener nombre y teléfono del contacto a partir del primer mensaje recibido (que no sea 'me')
  const firstOtherMsg = messages.find((msg) => msg.from !== 'me');
  const headerName = firstOtherMsg?.name || '';
  const headerPhone = firstOtherMsg?.phone || '';

  return (
    <Layout style={{ height: '100vh', background: '#fff' }}>
      <Header
        style={{
          position: 'sticky',
          top: 60,
          zIndex: 10,
          backgroundColor: '#fff',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
          height: 64,
          paddingInline: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Avatar style={{ marginRight: 14 }} src={contact?.avatar} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Typography.Text strong style={{ fontSize: 19, color: '#222', lineHeight: 1.1 }}>
              {headerName}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12, color: '#888', marginTop: 2, lineHeight: 1 }}>
              {headerPhone}
            </Typography.Text>
          </div>
        </div>
      </Header>

      <Content style={{ overflowY: 'auto', padding: '10px', flex: 1, minHeight: 0, marginTop: 55 }}>
        <List
          dataSource={messages}
          renderItem={(msg) => (
            <div
              style={{
                display: 'flex',
                justifyContent: msg.from === 'me' ? 'flex-end' : 'flex-start',
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  backgroundColor: msg.from === 'me' ? '#7faff1' : '#f0f0f0',
                  color: msg.from === 'me' ? '#fff' : 'black',
                  padding: '8px 12px',
                  borderRadius: 16,
                  maxWidth: '60%',
                  wordBreak: 'break-word',
                  textAlign: 'left',
                  marginLeft: msg.from === 'me' ? 40 : 0,
                  marginRight: msg.from === 'me' ? 0 : 40,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                  {msg.from === 'me' ? 'Yo' : msg.name}
                </div>
                <div>{msg.text}</div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 4, textAlign: 'right' }}>
                  {msg.time}
                </div>
              </div>
            </div>
          )}
        />
        <div ref={messagesEndRef} />
      </Content>

      <Footer
        style={{
          borderTop: '1px solid #eee',
          background: '#fff',
          padding: '12px 16px',
          height: 80,
        }}
      >
        <ChatInput chatId={chatId} />
      </Footer>
    </Layout>
  );
}
