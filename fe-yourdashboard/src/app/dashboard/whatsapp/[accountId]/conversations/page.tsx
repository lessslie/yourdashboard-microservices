"use client";

import { useParams } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { Row, Col, Empty, Layout } from "antd";
import ChatWindow from "@/components/Whatsapp/ChatWindow";
import { Conversation, ConversationListItem } from "@/interfaces/interfacesWhatsapp";
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
    return allConversations.find((c) => c.id === selectedChatId);
  }, [accountId, allConversations, selectedChatId]);

  if (!accountId) {
    return <Empty description="Cuenta no válida" />;
  }

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <Content style={{ height: "100%", paddingTop: 60, overflow: "hidden" }}>
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
                overflowY: "auto",
                minHeight: 0,
                paddingTop: 30,
              }}
            >
              <SearchBar 
                onResults={(results) => {
                  setSearchResults(results);
                  setSearchError(false); // si hay resultados, limpio el error
                }} 
                onError={() => {
                  setSearchResults([]); // limpio resultados
                  setSearchError(true); // marco error
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
                    accountId={accountId}
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
                style={{ marginTop: 100 }}
              />
            )}
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
