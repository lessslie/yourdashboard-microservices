// src/app/dashboard/whatsapp/page.tsx
"use client";
import React from "react";
import { Layout, Card, Button, Result } from "antd";
import { MessageOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useAuth, useUserData } from "@/components/Auth/hooks/useAuth";

const { Header, Content } = Layout;

const WhatsAppPage = () => {
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
          <h1 style={{ margin: 0, color: "#fa8c16" }}>📱 WhatsApp</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span>Hola, {userData.name || userData.email}</span>
          <Button onClick={handleLogout}>Cerrar Sesión</Button>
        </div>
      </Header>

      <Content style={{ padding: "24px", background: "#f0f2f5" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <Result
            icon={<MessageOutlined style={{ color: "#fa8c16" }} />}
            title="Módulo de WhatsApp"
            subTitle="Esta funcionalidad está en desarrollo como parte de la PoC"
            extra={[
              <Button type="primary" key="back" onClick={goBack}>
                Volver al Dashboard
              </Button>,
              <Button key="email" onClick={() => router.push("/dashboard/email")}>
                Ir a Emails
              </Button>
            ]}
          />

          <Card 
            style={{ marginTop: "24px" }}
            title="🚧 Características planificadas"
          >
            <ul style={{ fontSize: "16px", lineHeight: "2" }}>
              <li>📱 Integración con WhatsApp Business API</li>
              <li>💬 Lista de conversaciones recientes</li>
              <li>🔍 Búsqueda por contacto o contenido</li>
              <li>📊 Vista de mensajes por conversación</li>
              <li>🎯 Filtros por fecha y estado</li>
              <li>📈 Estadísticas de conversaciones</li>
            </ul>
          </Card>

          <Card 
            style={{ marginTop: "24px" }}
            title="🎯 Estado del desarrollo"
          >
            <div style={{ fontSize: "16px" }}>
              <p><strong>Arquitectura:</strong> ✅ Diseñada</p>
              <p><strong>Backend:</strong> 🚧 Pendiente (ms-yourdashboard-whatsapp)</p>
              <p><strong>Frontend:</strong> 🚧 Pendiente</p>
              <p><strong>WhatsApp Business API:</strong> 🚧 Pendiente</p>
            </div>
          </Card>

          <Card 
            style={{ marginTop: "24px" }}
            title="🔧 Proveedores considerados"
          >
            <div style={{ fontSize: "16px" }}>
              <p><strong>Twilio:</strong> API robusta para WhatsApp Business</p>
              <p><strong>360Dialog:</strong> Proveedor europeo especializado</p>
              <p><strong>WhatsApp Cloud API:</strong> API oficial de Meta</p>
              <p><strong>Simulador:</strong> Datos mock para desarrollo</p>
            </div>
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default WhatsAppPage;