"use client";

import { useParams } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { Row, Col, Empty, Layout } from "antd";
import ChatWindow from "@/components/Whatsapp/ChatWindow";
import {
  Conversation,
  ConversationListItem,
} from "@/interfaces/interfacesWhatsapp";
import { getConversations } from "@/services/whatsapp/whatsapp";
import ConversationList from "@/components/Whatsapp/ConversationList";
import SearchBar from "@/components/Whatsapp/SearchBar";
import SearchResult from "@/components/Whatsapp/SearchResult";

const { Content } = Layout;

export default function ConversationsPage() {
  const params = useParams();
  const accountId = params?.accountId as string;

  const [searchResults, setSearchResults] = useState<Conversation[]>([]);
  const [searchError, setSearchError] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [allConversations, setAllConversations] = useState<ConversationListItem[]>([]);

  // 🔹 Persistencia de selectedChatId
  useEffect(() => {
    const savedChatId = localStorage.getItem("selectedChatId");
    console.log("Saved chat ID from localStorage:", savedChatId);
    if (savedChatId) {
      setSelectedChatId(savedChatId);
    }
  }, []);

  useEffect(() => {
    if (selectedChatId) {
      localStorage.setItem("selectedChatId", selectedChatId);
    }
  }, [selectedChatId]);

  // 🔹 Resetear chat cuando cambia la cuenta
  useEffect(() => {
    setSelectedChatId(null);
    localStorage.removeItem("selectedChatId");
  }, [accountId]);

  useEffect(() => {
    async function fetchConversations() {
      try {
        const res = await getConversations();
        setAllConversations(res);
      } catch (error) {
        console.error("Error fetching conversations", error);
      }
    }
    fetchConversations();
  }, []);

  const selectedContact = useMemo(() => {
    if (!accountId) return undefined;
    return allConversations.find((c) => c.conversation_id === selectedChatId);
  }, [accountId, allConversations, selectedChatId]);

  if (!accountId) {
    return <Empty description="Cuenta no válida" />;
  }

  return (
    <Layout style={{ height: "100vh", paddingTop: 60, overflow: "hidden" }}>
      <Content style={{ height: "100%", overflow: "hidden" }}>
        <Row style={{ height: "100%" }}>
          <Col
            span={8}
            style={{
              display: "flex",
              flexDirection: "column",
              borderRight: "1px solid #f0f0f0",
              height: "100%",
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                flex: 1,
                margin: "0 10px",
                overflowY: "auto",
                minHeight: 0,
                paddingTop: 30,
              }}
            >
              <SearchBar
                onResults={(results) => {
                  setSearchResults(results);
                  setSearchError(false); 
                }}
                onError={() => {
                  setSearchResults([]);
                  setSearchError(true); 
                }}
              />

              {searchError ? (
                <Empty description="No hay resultados encontrados" />
              ) : searchResults.length > 0 ? (
                <SearchResult
                  conversations={searchResults}
                  selectedChatId={selectedChatId}
                  onSelectChat={setSelectedChatId}
                />
              ) : (
                <ConversationList
                  selectedChatId={selectedChatId}
                  onSelectChat={setSelectedChatId}
                  conversations={allConversations}
                />
              )}
            </div>
          </Col>

          <Col
            span={16}
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              paddingTop: 10,
            }}
          >
            {selectedChatId ? (
              <ChatWindow chatId={selectedChatId} contact={selectedContact} />
            ) : (
              <Empty
                description="Selecciona una conversación"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center", 
                  alignItems: "center",    
                  height: "100%",         
                  color: "#888",       
                  fontSize: 16,          
                }}
              />
            )}
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
