'use client';

import { useEffect, useState } from 'react';
import { List, Avatar } from 'antd';
import { getConversations } from '@/server/whatsapp/whatsapp';

interface Chat {
  id: string;
  name: string;
  avatar?: string;
  last_message?: string;
  last_message_date?: string;
}

interface Message {
  conversation_id: string;
  chatId: string;
  text: string;
  time: string;
}

interface ChatItem {
  id: string;
  name: string;
  avatar?: string;
  lastText: string;
  lastTime: string;
}

interface Props {
  accountId: string;
  selectedChatId: string;
  onSelectChat: (chatId: string) => void;
  searchResults?: Message[];
}

export default function ConversationList({
  accountId,
  selectedChatId,
  onSelectChat,
  searchResults = [],
}: Props) {
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const data = await getConversations();
        setChats(data);
      } catch (error) {
        console.error('Error cargando conversaciones:', error);
      }
    };

    fetchChats();
  }, []);

  const renderList = (): ChatItem[] => {
    if (searchResults.length > 0) {
      const grouped = searchResults.reduce((acc, msg) => {
        if (!acc[msg.chatId]) acc[msg.chatId] = [];
        acc[msg.chatId].push(msg);
        return acc;
      }, {} as Record<string, Message[]>);

      return Object.entries(grouped).map(([chatId, msgs]) => {
        const chat = chats.find((c) => c.id === chatId);
        const lastMsg = msgs[msgs.length - 1];

        return {
          id: chatId,
          name: chat?.name || chatId,
          avatar: chat?.avatar,
          lastText: lastMsg.text,
          lastTime: lastMsg.time,
        };
      });
    }

    return chats.map((chat) => ({
      id: chat.id,
      name: chat.name,
      avatar: chat.avatar,
      lastText: chat.last_message || 'Sin mensajes',
      lastTime: chat.last_message_date
        ? new Date(chat.last_message_date).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '',
    }));
  };

  const chatItems = renderList();

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <List
        itemLayout="horizontal"
        dataSource={chatItems}
        renderItem={(chat) => {
          const isSelected = selectedChatId === chat.id;

          return (
            <List.Item
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              style={{
                cursor: 'pointer',
                padding: '12px 16px',
                backgroundColor: isSelected ? '#e6f7ff' : 'white',
                borderLeft: isSelected
                  ? '4px solid #1890ff'
                  : '4px solid transparent',
              }}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    src={
                      chat.avatar ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${chat.name}`
                    }
                  />
                }
                title={
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{chat.name}</span>
                    <span style={{ fontSize: '12px', color: '#999' }}>
                      {chat.lastTime}
                    </span>
                  </div>
                }
                description={chat.lastText}
              />
            </List.Item>
          );
        }}
      />
    </div>
  );
}
