// src/app/dashboard/page.tsx
"use client";
import React from "react";
import { Layout, Card, Button, Row, Col } from "antd";
import { MailOutlined, CalendarOutlined, MessageOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useAuth, useUserData } from "@/components/Auth/hooks/useAuth";

const { Header, Content } = Layout;

const DashboardPage = () => {
  const router = useRouter();
  const { remuveToken } = useAuth();
  const { userData } = useUserData();

  const handleLogout = () => {
    remuveToken();
    router.push("/auth");
  };

  const dashboardCards = [
    {
      title: "📧 Emails",
      description: "Gestiona tus correos electrónicos de Gmail",
      icon: <MailOutlined style={{ fontSize: "48px", color: "#1890ff" }} />,
      path: "/dashboard/email",
      color: "#e6f7ff",
      borderColor: "#1890ff"
    },
    {
      title: "📅 Calendario", 
      description: "Consulta tus eventos y citas",
      icon: <CalendarOutlined style={{ fontSize: "48px", color: "#52c41a" }} />,
      path: "/dashboard/calendario",
      color: "#f6ffed",
      borderColor: "#52c41a"
    },
    {
      title: "📱 WhatsApp",
      description: "Revisa tus conversaciones de WhatsApp",
      icon: <MessageOutlined style={{ fontSize: "48px", color: "#fa8c16" }} />,
      path: "/dashboard/whatsapp", 
      color: "#fff7e6",
      borderColor: "#fa8c16"
    }
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ 
        background: "#fff", 
        padding: "0 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
      }}>
        <h1 style={{ margin: 0, color: "#1890ff" }}>📊 YourDashboard</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span>Hola, {userData.name || userData.email}</span>
          <Button onClick={handleLogout}>Cerrar Sesión</Button>
        </div>
      </Header>

      <Content style={{ padding: "24px", background: "#f0f2f5" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", marginBottom: "32px", color: "#262626" }}>
            Selecciona una opción para comenzar
          </h2>
          
          <Row gutter={[24, 24]} justify="center">
            {dashboardCards.map((card, index) => (
              <Col xs={24} md={8} key={index}>
                <Card
                  hoverable
                  style={{ 
                    textAlign: "center",
                    backgroundColor: card.color,
                    border: `2px solid ${card.borderColor}`,
                    borderRadius: "12px",
                    height: "280px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center"
                  }}
                  onClick={() => router.push(card.path)}
                >
                  <div style={{ marginBottom: "16px" }}>
                    {card.icon}
                  </div>
                  <h3 style={{ 
                    fontSize: "24px", 
                    marginBottom: "12px",
                    color: "#262626"
                  }}>
                    {card.title}
                  </h3>
                  <p style={{ 
                    fontSize: "16px", 
                    color: "#595959",
                    marginBottom: "20px"
                  }}>
                    {card.description}
                  </p>
                  <Button 
                    type="primary" 
                    size="large"
                    style={{ backgroundColor: card.borderColor, borderColor: card.borderColor }}
                  >
                    Acceder
                  </Button>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Información adicional */}
          <div style={{ 
            marginTop: "48px", 
            textAlign: "center",
            padding: "24px",
            background: "#fff",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <h3>🎯 Prueba de Concepto (PoC)</h3>
            <p>Dashboard unificado para gestión de comunicaciones</p>
            <div style={{ display: "flex", justifyContent: "center", gap: "32px", marginTop: "16px" }}>
              <div>
                <strong>📧 Emails:</strong> ✅ Funcionando
              </div>
              <div>
                <strong>📅 Calendario:</strong> 🚧 En desarrollo
              </div>
              <div>
                <strong>📱 WhatsApp:</strong> 🚧 En desarrollo
              </div>
            </div>
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default DashboardPage;