"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Button, Input, Layout, Card, List, Spin, message } from "antd";
import Image from "next/image";
import { useAuth, useUserData } from "../Auth/hooks/useAuth";
import { useRouter } from "next/navigation";
import { handleConnectService, getEmails, syncEmails } from "./lib/email";
import GmailAccountSelector from "./GmailAccountSelectorTest";

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

// 🎯 Tipos para cuenta Gmail
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

const ViewEmailsTest = () => {
  const router = useRouter();
  const { remuveToken, token } = useAuth();
  const { userData } = useUserData();

  // 🎯 Estados
  const [emails, setEmails] = useState<EmailData[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedCuentaGmailId, setSelectedCuentaGmailId] = useState<
    string | null
  >(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [userProfile, setUserProfile] = useState<ExtendedUserData | null>(null);

  // 🎯 Función para cargar perfil completo del usuario
  const loadUserProfile = useCallback(async () => {
    if (!token) return;

    try {
      setLoadingProfile(true);
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_MS_AUTH_URL || "http://localhost:3001"
        }/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();

        // Transformar los datos al formato que esperamos
        const profileData: ExtendedUserData = {
          id: data.usuario.id,
          name: data.usuario.nombre,
          email: data.usuario.email,
          isEmailVerified: data.usuario.email_verificado,
          profilePicture: null,
          createdAt: data.usuario.fecha_registro,
          cuentas_gmail: data.cuentas_gmail || [],
        };

        setUserProfile(profileData);

        // Si hay cuentas Gmail y no hay una seleccionada, seleccionar la primera
        if (
          data.cuentas_gmail &&
          data.cuentas_gmail.length > 0 &&
          !selectedCuentaGmailId
        ) {
          setSelectedCuentaGmailId(data.cuentas_gmail[0].id.toString());
        }
      }
    } catch (error) {
      console.error("❌ Error cargando perfil:", error);
      message.error("Error cargando información del usuario");
    } finally {
      setLoadingProfile(false);
    }
  }, [token, selectedCuentaGmailId]);

  // 🎯 Función para conectar Gmail (OAuth)
  const conectEmail = async () => {
    if (!token) {
      message.error("Debes iniciar sesión primero");
      return;
    }

    console.log("🔵 Iniciando conexión OAuth...");
    await handleConnectService(token);
  };

  // 🎯 Función para cargar emails de la cuenta seleccionada
  const loadEmails = useCallback(async () => {
    if (!token || !selectedCuentaGmailId) {
      console.log("⚠️ No hay token o cuenta seleccionada");
      return;
    }

    try {
      setLoading(true);
      console.log(
        `📧 Cargando emails para cuenta Gmail ${selectedCuentaGmailId}...`
      );

      const response: EmailListResponse = await getEmails(
        token,
        selectedCuentaGmailId,
        1,
        10
      );
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
  }, [token, selectedCuentaGmailId]);

  // 🎯 Función para sincronizar emails
  const handleSync = async () => {
    if (!token || !selectedCuentaGmailId) {
      message.error("Selecciona una cuenta Gmail primero");
      return;
    }

    try {
      setSyncing(true);
      console.log(
        `🔄 Sincronizando emails para cuenta ${selectedCuentaGmailId}...`
      );

      const syncResult = await syncEmails(token, selectedCuentaGmailId, 20);
      console.log("✅ Sync result:", syncResult);

      message.success("Emails sincronizados exitosamente");

      // Recargar emails después del sync
      await loadEmails();

      // Recargar perfil para actualizar contadores
      await loadUserProfile();
    } catch (error) {
      console.error("❌ Error sincronizando:", error);
      message.error("Error sincronizando emails");
    } finally {
      setSyncing(false);
    }
  };

  // 🎯 Manejar cambio de cuenta Gmail
  const handleAccountChange = (cuentaGmailId: string) => {
    console.log(`🔄 Cambiando a cuenta Gmail ${cuentaGmailId}`);
    setSelectedCuentaGmailId(cuentaGmailId);
    setEmails([]); // Limpiar emails anteriores
  };

  // 🎯 Cargar perfil al montar el componente
  useEffect(() => {
    if (token && userData.id) {
      console.log("🔄 Usuario autenticado, cargando perfil completo...");
      loadUserProfile();
    }
  }, [token, userData.id, loadUserProfile]);

  // 🎯 Cargar emails cuando cambia la cuenta seleccionada
  useEffect(() => {
    if (token && selectedCuentaGmailId) {
      console.log(
        `🔄 Cuenta Gmail seleccionada: ${selectedCuentaGmailId}, cargando emails...`
      );
      loadEmails();
    }
  }, [token, selectedCuentaGmailId, loadEmails]);

  // Mostrar loading mientras carga el perfil
  if (loadingProfile) {
    return (
      <Layout
        style={{
          width: "100%",
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Spin size="large" />
        <p style={{ marginTop: "16px" }}>Cargando información del usuario...</p>
      </Layout>
    );
  }

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
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <Button type="primary" onClick={conectEmail}>
          Conectar nueva cuenta Gmail
        </Button>

        <Button
          type="default"
          onClick={handleSync}
          loading={syncing}
          disabled={!selectedCuentaGmailId}
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

      {/* 🎯 Información del usuario y selector de cuenta */}
      {userProfile && (
        <Card style={{ marginBottom: "24px" }}>
          <p>
            <strong>Usuario:</strong> {userProfile.email}
          </p>

          {/* 🎯 SELECTOR DE CUENTA GMAIL */}
          <GmailAccountSelector
            cuentasGmail={userProfile.cuentas_gmail || []}
            selectedAccountId={selectedCuentaGmailId}
            onAccountChange={handleAccountChange}
            loading={loading}
          />
        </Card>
      )}

      {/* 🎯 Buscador */}
      <div style={{ display: "flex", gap: "50px", padding: "16px 0" }}>
        <Input.Search
          placeholder="Buscar emails..."
          enterButton
          disabled={!selectedCuentaGmailId}
        />
        <Input placeholder="Filtrar por..." disabled={!selectedCuentaGmailId} />
      </div>

      {/* 🎯 Lista de emails */}
      <Card
        title={`📧 Emails ${selectedCuentaGmailId ? `(${emails.length})` : ""}`}
        style={{ flex: 1 }}
      >
        {!selectedCuentaGmailId ? (
          <div style={{ textAlign: "center", padding: "50px" }}>
            <p>Conecta una cuenta Gmail para ver tus emails</p>
            <Button type="primary" onClick={conectEmail}>
              Conectar cuenta Gmail
            </Button>
          </div>
        ) : loading ? (
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
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{ fontWeight: email.isRead ? "normal" : "bold" }}
                      >
                        {email.subject}
                      </span>
                      <small style={{ color: "#999" }}>
                        {new Date(email.receivedDate).toLocaleDateString(
                          "es-AR"
                        )}
                      </small>
                    </div>
                  }
                  description={
                    <div>
                      <strong>{email.fromName}</strong> &lt;{email.fromEmail}
                      &gt;
                      {email.hasAttachments && (
                        <span style={{ color: "#1890ff", marginLeft: "8px" }}>
                          📎
                        </span>
                      )}
                      {!email.isRead && (
                        <span style={{ color: "#f5222d", marginLeft: "8px" }}>
                          ●
                        </span>
                      )}
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

export default ViewEmailsTest;
