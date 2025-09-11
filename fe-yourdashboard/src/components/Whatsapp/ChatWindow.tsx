"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, List, Typography, Layout } from "antd";
import ChatInput from "./ChatInput";
import { getMessagesByConversationId } from "@/services/whatsapp/whatsapp";
import { Message, UIMessage } from "@/interfaces/interfacesWhatsapp";
import { mockMessages } from "@/components/Whatsapp/utils/data";

const { Header, Content, Footer } = Layout;

interface ChatWindowProps {
  chatId: string;
  contact?: { name: string; avatar?: string; phone?: string };
}

export default function ChatWindow({
  chatId,
  contact: initialContact,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [contact, setContact] = useState(initialContact ?? null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const myPhone =
    typeof window !== "undefined" ? localStorage.getItem("myPhone") || "" : "";

  useEffect(() => {
    if (!chatId) return;

    const fetchMessages = async () => {
      try {
        const data: Message[] = await getMessagesByConversationId(chatId);
        const source = data.length > 0 ? data : mockMessages[chatId] || [];

        if (source.length > 0) {
          const lastMsg = source[source.length - 1];
          setContact({
            name: lastMsg.name || initialContact?.name || "Contacto",
            phone: lastMsg.phone || initialContact?.phone || "",
            avatar: initialContact?.avatar,
          });
        } else {
          setContact(initialContact ?? null);
        }

        const formatted: UIMessage[] = source.map((msg) => ({
          from: msg.from || (msg.phone === myPhone ? "me" : "other"),
          name: msg.phone === myPhone ? "Yo" : msg.name,
          phone: msg.phone,
          text: msg.message,
          time: new Date(msg.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));

        setMessages(formatted);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();
  }, [chatId, myPhone, initialContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Layout
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
      }}
    >
      {/* Encabezado fijo */}
      <Header
        style={{
          flex: "0 0 64px",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid #f0f0f0",
          paddingInline: 16,
          backgroundColor: "#fff",
          zIndex: 10,
        }}
      >
        <Avatar style={{ marginRight: 14 }} src={contact?.avatar}>
          {contact?.name?.[0] || "?"}
        </Avatar>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Typography.Text strong style={{ fontSize: 19, color: "#222" }}>
            {contact?.name || "Contacto"}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12, color: "#888" }}>
            {contact?.phone || ""}
          </Typography.Text>
        </div>
      </Header>

      {/* Contenido scrollable */}
      <Content
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px",
        }}
      >
        <List
          dataSource={messages}
          renderItem={(msg) => (
            <div
              style={{
                display: "flex",
                justifyContent: msg.from === "me" ? "flex-end" : "flex-start",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  backgroundColor: msg.from === "me" ? "#7faff1" : "#f0f0f0",
                  color: msg.from === "me" ? "#fff" : "black",
                  padding: "8px 12px",
                  borderRadius: 16,
                  maxWidth: "60%",
                  wordBreak: "break-word",
                  textAlign: "left",
                  marginLeft: msg.from === "me" ? 40 : 0,
                  marginRight: msg.from === "me" ? 0 : 40,
                }}
              >
                {msg.from !== "me" && (
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                    {msg.name}
                  </div>
                )}
                <div>{msg.text}</div>
                <div
                  style={{
                    fontSize: 11,
                    color: msg.from === "me" ? "#e0e0e0" : "#999",
                    marginTop: 4,
                    textAlign: "right",
                  }}
                >
                  {msg.time}
                </div>
              </div>
            </div>
          )}
        />
        <div ref={messagesEndRef} />
      </Content>

      {/* Footer fijo */}
      <Footer
        style={{
          flex: "0 0 80px",
          borderTop: "1px solid #eee",
          padding: "12px 16px",
          background: "#fff",
        }}
      >
        <ChatInput chatId={chatId} />
      </Footer>
    </Layout>
  );
}
