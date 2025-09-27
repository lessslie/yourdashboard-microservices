"use client";

import React, { useState } from "react";
import SidebarMenu from "@/components/Dashboard/SidebarMenu";
import { Layout } from "antd";
import MisChatsList from "@/components/Whatsapp/newDesign/MyChats";
import ChatWindow from "@/components/Whatsapp/newDesign/ChatWidow";
import LinkWhatsapp from "@/components/Whatsapp/newDesign/linkWhatsapp";

const { Sider, Content } = Layout;

export default function Home() {
  const [activeMenuItem, setActiveMenuItem] = useState("dashboard");
  const [selectedChat, setSelectedChat] = React.useState<string | null>(null);
  

  const chats = [
    { id: '1', name: 'Nombre 1', lastMessage: 'Último mensaje', time: '14:16' },
    { id: '2', name: 'Nombre 2', lastMessage: 'Último mensaje', time: '14:16' },
    { id: '3', name: 'Nombre 3', lastMessage: 'Último mensaje', time: '14:16' },
    { id: '4', name: 'Nombre 4', lastMessage: 'Último mensaje', time: '14:16' },
    { id: '5', name: 'Nombre 5', lastMessage: 'Último mensaje', time: '14:16' },
    { id: '6', name: 'Nombre 6', lastMessage: 'Último mensaje', time: '14:16' },
    { id: '7', name: 'Nombre 7', lastMessage: 'Último mensaje', time: '14:16' },
    { id: '8', name: 'Nombre 8', lastMessage: 'Último mensaje', time: '14:16' },
    { id: '9', name: 'Nombre 9', lastMessage: 'Último mensaje', time: '14:16' },
    // ...
  ];

  const messages = [
    { id: 'm1', sender: 'other', text: 'Lorem ipsum dolor sit amet consectetur. Urna in cras nunc massa in maecenas a nulla.' },
    { id: 'm2', sender: 'me', text: 'Lorem ipsum dolor sit amet consectetur. Urna in cras nunc massa in maecenas a nulla.' },
    { id: 'm3', sender: 'other', text: 'Lorem ipsum dolor sit amet consectetur. Urna in cras nunc massa in maecenas a nulla.' },
    { id: 'm4', sender: 'me', text: 'Lorem ipsum dolor sit amet consectetur. Urna in cras nunc massa in maecenas a nulla.' },
    { id: 'm5', sender: 'other', text: 'Lorem ipsum dolor sit amet consectetur. Urna in cras nunc massa in maecenas a nulla.' },
    { id: 'm6', sender: 'me', text: 'He trabajado en un proyecto interesante.' },
    { id: 'm7', sender: 'other', text: '¡Genial! ¿De qué se trata?' },
    { id: 'm8', sender: 'me', text: 'Es una aplicación para gestionar tareas.' },
    { id: 'm9', sender: 'other', text: 'Suena útil. ¡Buena suerte!' },
    // ...
  ];
  return (
    <Layout style={{ minHeight: "100vh", backgroundColor: "#fafafa" }}>
      <Sider
        width={260}
        style={{
          backgroundColor: "#ffffff",
          borderRight: "1px solid #e8e8e8",
          position: "fixed",
          height: "100vh",
          left: 0,
          top: 86,
          zIndex: 100,
          boxShadow: "0px 4px 15px 0px #BED8FF",
        }}
      >
        <SidebarMenu
          activeItem={activeMenuItem}
          onItemClick={setActiveMenuItem}
        />
      </Sider>

      <Layout style={{ marginLeft: 260 }}>
        <Content
          style={{
            backgroundColor: "#ffffff",
            borderRight: "1px solid #e8e8e8",
            minHeight: "calc(100vh - 86px)",
          }}
        >
         <div className="flex h-screen">
      <MisChatsList chats={chats} onSelectChat={setSelectedChat} selectedChat={selectedChat}  />
      {selectedChat && (
        <ChatWindow
          selectedChatName={
            chats.find((c) => c.id === selectedChat)?.name || ''
          }
          messages={messages}
          onSendMessage={(msg) => console.log('enviar', msg)}
        />
      )}

      {/* <LinkWhatsapp /> */}
       </div>
        </Content>
      </Layout>
    </Layout>
  )
}