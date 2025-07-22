"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Button, Input, Layout, Card, List, Spin, message } from "antd";
import Image from "next/image";
import { useAuth, useUserData } from "../Auth/hooks/useAuth";
import { useRouter } from "next/navigation";
import { handleConnectService, getEmails, syncEmails } from "./lib/emails";

const { Footer } = Layout;

// 🎯 Tipos para los emails
interface EmailData {
  id: string;
  subject: string;
  fromEmail: string;
  fromName: string;
  receivedDate: string;
  isRead: boolean;
  hasAttachments: boolean;
}

interface EmailListResponse {
  success: boolean;
  source: string;
  data: {
    emails: EmailData[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// 🎯 Tipos para cuenta Gmail (extendidos)
interface CuentaGmail {
  id: number;
  email_gmail: string;
  alias_personalizado?: string;
  esta_activa: boolean;
  fecha_conexion: string;
  emails_count: number;
}

// 🎯 Tipo extendido para userData con cuentas Gmail
interface ExtendedUserData {
  id: number | null;
  name: string;
  email: string;
  isEmailVerified: boolean;
  profilePicture: string | null;
  createdAt: string | null;
  cuentas_gmail?: CuentaGmail[];
}

const ViewEmails = () => {
  const router = useRouter();
  const { remuveToken, token } = useAuth();
  const { userData } = useUserData();

  // 🎯 Estados
  const [emails, setEmails] = useState<EmailData[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // 🎯 Para la demo, usamos cuenta Gmail ID 4 (Agata)
  const CUENTA_GMAIL_ID = "4";

  // 🎯 Cast seguro del userData para incluir cuentas_gmail
  const extendedUserData = userData as ExtendedUserData;

  // 🎯 Función para conectar Gmail (OAuth) - ARREGLADA
  const conectEmail = async () => {
    if (!token) {
      message.error("Debes iniciar sesión primero");
      return;
    }

    console.log("🔵 Iniciando conexión OAuth...");
    await handleConnectService(token); // 🎯 PASAR EL TOKEN
    // La función redirige, así que no hay más código después
  };

  // 🎯 Función para cargar emails (useCallback para evitar recreación)
  const loadEmails = useCallback(async () => {
    if (!token) {
      console.log("⚠️ No hay token, saltando carga de emails");
      return;
    }

    try {
      setLoading(true);
      console.log("📧 Cargando emails...");
      
      const response: EmailListResponse = await getEmails(token, CUENTA_GMAIL_ID, 1, 10);
      console.log("✅ Emails response:", response);
      
      if (response.success && response.data) {
        setEmails(response.data.emails);
        console.log(`📧 ${response.data.emails.length} emails cargados`);
      } else {
        console.warn("⚠️ Response no exitosa:", response);
      }
      
    } catch (error) {
      console.error("❌ Error cargando emails:", error);
      message.error("Error cargando emails. Prueba sincronizar primero.");
    } finally {
      setLoading(false);
    }
  }, [token, CUENTA_GMAIL_ID]);

  // 🎯 Función para sincronizar emails
  const handleSync = async () => {
    if (!token) {
      message.error("Debes iniciar sesión primero");
      return;
    }

    try {
      setSyncing(true);
      console.log("🔄 Sincronizando emails...");
      
      const syncResult = await syncEmails(token, CUENTA_GMAIL_ID, 20);
      console.log("✅ Sync result:", syncResult);
      
      message.success("Emails sincronizados exitosamente");
      
      // Recargar emails después del sync
      await loadEmails();
      
    } catch (error) {
      console.error("❌ Error sincronizando:", error);
      message.error("Error sincronizando emails");
    } finally {
      setSyncing(false);
    }
  };

  // 🎯 Cargar emails al montar el componente
  useEffect(() => {
    if (token && userData.id) {
      console.log("🔄 Usuario autenticado, cargando emails...");
      loadEmails();
    }
  }, [token, userData.id, loadEmails]); // ✅ Ahora incluye loadEmails

  return (
    <Layout
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        padding: "24px",
      }}
    >
      <Image
        src="/logo.png"
        alt="Logo"
        width={270}
        height={106}
        style={{ margin: "0 auto" }}
      />

      {/* 🎯 Controles principales */}
      <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginBottom: "24px" }}>
        <Button type="primary" onClick={conectEmail}>
          Conectar nueva cuenta Gmail
        </Button>
        
        <Button 
          type="default" 
          onClick={handleSync}
          loading={syncing}
        >
          {syncing ? "Sincronizando..." : "Sincronizar emails"}
        </Button>
        
        <Button
          type="primary"
          onClick={() => {
            remuveToken();
            router.push("/auth");
          }}
        >
          Cerrar sesión
        </Button>
      </div>

      {/* 🎯 Información del usuario */}
      {userData.email && (
        <Card style={{ marginBottom: "24px" }}>
          <p><strong>Usuario:</strong> {userData.email}</p>
          <p><strong>Cuenta Gmail activa:</strong> agata.morales92@gmail.com (ID: {CUENTA_GMAIL_ID})</p>
          {extendedUserData.cuentas_gmail && extendedUserData.cuentas_gmail.length > 0 && (
            <div>
              <p><strong>Cuentas Gmail conectadas:</strong></p>
              <ul>
                {extendedUserData.cuentas_gmail.map((cuenta: CuentaGmail, index: number) => (
                  <li key={index}>
                    {cuenta.email_gmail} ({cuenta.alias_personalizado || 'Sin alias'}) 
                    - {cuenta.esta_activa ? '✅ Activa' : '❌ Inactiva'}
                    - {cuenta.emails_count} emails
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* 🎯 Buscador */}
      <div style={{ display: "flex", gap: "50px", padding: "16px 0" }}>
        <Input.Search placeholder="Buscar emails..." enterButton />
        <Input placeholder="Filtrar por..." />
      </div>

      {/* 🎯 Lista de emails */}
      <Card title={`📧 Emails (${emails.length})`} style={{ flex: 1 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "50px" }}>
            <Spin size="large" />
            <p style={{ marginTop: "16px" }}>Cargando emails...</p>
          </div>
        ) : emails.length > 0 ? (
          <List
            itemLayout="horizontal"
            dataSource={emails}
            renderItem={(email) => (
              <List.Item
                actions={[
                  <Button key="view" type="link">
                    Ver
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: email.isRead ? "normal" : "bold" }}>
                        {email.subject}
                      </span>
                      <small style={{ color: "#999" }}>
                        {new Date(email.receivedDate).toLocaleDateString("es-AR")}
                      </small>
                    </div>
                  }
                  description={
                    <div>
                      <strong>{email.fromName}</strong> &lt;{email.fromEmail}&gt;
                      {email.hasAttachments && <span style={{ color: "#1890ff", marginLeft: "8px" }}>📎</span>}
                      {!email.isRead && <span style={{ color: "#f5222d", marginLeft: "8px" }}>●</span>}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <div style={{ textAlign: "center", padding: "50px" }}>
            <p>No hay emails para mostrar</p>
            <Button type="primary" onClick={handleSync} loading={syncing}>
              Sincronizar emails
            </Button>
          </div>
        )}
      </Card>

      <Footer style={{ textAlign: "center" }}>
        Inspiration Factory Copyright ©{new Date().getFullYear()}
      </Footer>
    </Layout>
  );
};

export default ViewEmails;