// src/app/dashboard/calendario/page.tsx
"use client";
import React from "react";
import { Layout, Card, Button, Result } from "antd";
import { CalendarOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useAuth, useUserData } from "@/components/Auth/hooks/useAuth";

const { Header, Content } = Layout;

const CalendarioPage = () => {
  const router = useRouter();
  const { remuveToken } = useAuth();
  const { userData } = useUserData();

  const handleLogout = () => {
    remuveToken();
    router.push("/auth");
  };

  const goBack = () => {
    router.push("/dashboard");
  };

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
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={goBack}
            type="text"
          >
            Volver
          </Button>
          <h1 style={{ margin: 0, color: "#52c41a" }}>📅 Calendario</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span>Hola, {userData.name || userData.email}</span>
          <Button onClick={handleLogout}>Cerrar Sesión</Button>
        </div>
      </Header>

      <Content style={{ padding: "24px", background: "#f0f2f5" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <Result
            icon={<CalendarOutlined style={{ color: "#52c41a" }} />}
            title="Módulo de Calendario"
            subTitle="Esta funcionalidad está en desarrollo como parte de la PoC"
            extra={[
              <Button type="primary" key="back" onClick={goBack}>
                Volver al Dashboard
              </Button>,
              <Button key="buy" onClick={() => router.push("/dashboard/email")}>
                Ir a Emails
              </Button>
            ]}
          />

          <Card 
            style={{ marginTop: "24px" }}
            title="🚧 Características planificadas"
          >
            <ul style={{ fontSize: "16px", lineHeight: "2" }}>
              <li>📅 Integración con Google Calendar</li>
              <li>📅 Integración con Outlook Calendar</li>
              <li>🔍 Búsqueda de eventos por palabra clave</li>
              <li>📊 Vista de eventos próximos</li>
              <li>🎯 Filtros por rango de fechas</li>
              <li>📱 Sincronización automática</li>
            </ul>
          </Card>

          <Card 
            style={{ marginTop: "24px" }}
            title="🎯 Estado del desarrollo"
          >
            <div style={{ fontSize: "16px" }}>
              <p><strong>Arquitectura:</strong> ✅ Diseñada</p>
              <p><strong>Backend:</strong> 🚧 Pendiente (ms-yourdashboard-calendar)</p>
              <p><strong>Frontend:</strong> 🚧 Pendiente</p>
              <p><strong>OAuth Google:</strong> 🚧 Pendiente</p>
            </div>
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default CalendarioPage;