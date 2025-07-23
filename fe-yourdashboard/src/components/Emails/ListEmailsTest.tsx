import React, { useEffect, useState } from "react";
import {
  Layout,
  Button,
  List,
  Skeleton,
  Pagination,
  Card,
  message,
} from "antd";
import { useAuth, useUserData } from "../Auth/hooks/useAuth";
import { getEmails } from "./lib/email";
import GmailAccountSelector from "./GmailAccountSelectorTest";

const { Content } = Layout;

interface IEmailBack {
  id: string;
  messageId: string;
  subject: string;
  fromEmail: string;
  fromName: string;
  receivedDate: string;
  isRead: boolean;
  hasAttachments: boolean;
}

interface IDataEmail {
  emails: IEmail[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  limit: number;
  page: number;
  total: number;
  totalPages: number;
}

interface IEmail {
  id: string;
  name: string;
  from: string;
  to?: string[];
  subject: string;
  body?: string;
  date: string;
  read?: boolean;
}

interface CuentaGmail {
  id: number;
  email_gmail: string;
  alias_personalizado?: string;
  esta_activa: boolean;
  fecha_conexion: string;
  emails_count: number;
}

interface ExtendedUserData {
  id: number | null;
  name: string;
  email: string;
  isEmailVerified: boolean;
  profilePicture: string | null;
  createdAt: string | null;
  cuentas_gmail?: CuentaGmail[];
}

const ListEmailsTest = () => {
  const { userData } = useUserData();
  const { token } = useAuth();

  const [initLoading, setInitLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [userProfile, setUserProfile] = useState<ExtendedUserData | null>(null);
  const [selectedCuentaGmailId, setSelectedCuentaGmailId] = useState<
    string | null
  >(null);

  const [list, setList] = useState<IDataEmail>({
    emails: [],
    hasNextPage: false,
    hasPreviousPage: false,
    limit: 10,
    page: 1,
    total: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // 🎯 Manejar cambio de cuenta Gmail
  const handleAccountChange = (cuentaGmailId: string) => {
    console.log(`🔄 Cambiando a cuenta Gmail ${cuentaGmailId}`);
    setSelectedCuentaGmailId(cuentaGmailId);
    setPage(1); // Resetear a primera página
  };

  // 🎯 Cargar perfil al montar - MOVIDO DENTRO DEL useEffect
  useEffect(() => {
    const loadUserProfile = async () => {
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
    };

    if (token && userData.id) {
      loadUserProfile();
    }
  }, [token, userData.id, selectedCuentaGmailId]); // Agregué selectedCuentaGmailId a las dependencias

  // 🎯 Cargar emails cuando cambia la cuenta o página
  useEffect(() => {
    const fetchEmails = async () => {
      if (!token || !selectedCuentaGmailId) {
        console.log("⚠️ No hay token o cuenta seleccionada");
        setInitLoading(false);
        return;
      }

      try {
        setInitLoading(true);
        console.log(
          `📧 Fetching emails for cuenta Gmail: ${selectedCuentaGmailId}, página: ${page}`
        );

        const emailsResponse = await getEmails(
          token,
          selectedCuentaGmailId,
          page,
          limit
        );
        console.log("✅ Emails response:", emailsResponse);

        if (emailsResponse.success && emailsResponse.data) {
          const dataEmails = emailsResponse.data;

          setList({
            emails: dataEmails.emails.map(
              (email: IEmailBack): IEmail => ({
                id: email.id,
                name: email.fromName,
                from: email.fromEmail,
                subject: email.subject,
                date: email.receivedDate,
                read: email.isRead,
              })
            ),
            hasNextPage: dataEmails.hasNextPage,
            hasPreviousPage: dataEmails.hasPreviousPage,
            limit: dataEmails.limit,
            page: dataEmails.page,
            total: dataEmails.total,
            totalPages: dataEmails.totalPages,
          });

          console.log(
            `📧 ${dataEmails.emails.length} emails cargados exitosamente`
          );
        } else {
          console.warn("⚠️ Response no exitosa:", emailsResponse);
        }
      } catch (error) {
        console.error("❌ Error fetching emails:", error);
        message.error("Error cargando emails");
      } finally {
        setInitLoading(false);
      }
    };

    if (token && selectedCuentaGmailId) {
      fetchEmails();
    }
  }, [token, selectedCuentaGmailId, page, limit]);

  if (loadingProfile) {
    return (
      <Content
        style={{ padding: "0 48px", textAlign: "center", paddingTop: "50px" }}
      >
        <Skeleton active />
        <p>Cargando información del usuario...</p>
      </Content>
    );
  }

  return (
    <Content style={{ padding: "0 48px" }}>
      <div
        style={{
          minHeight: 280,
          padding: 24,
        }}
      >
        {/* 🎯 Selector de cuenta Gmail */}
        {userProfile && (
          <Card style={{ marginBottom: "24px" }}>
            <p>
              <strong>Usuario:</strong> {userProfile.email}
            </p>
            <GmailAccountSelector
              cuentasGmail={userProfile.cuentas_gmail || []}
              selectedAccountId={selectedCuentaGmailId}
              onAccountChange={handleAccountChange}
              loading={initLoading}
            />
          </Card>
        )}

        {!selectedCuentaGmailId ? (
          <div style={{ textAlign: "center", padding: "50px" }}>
            <p>No hay cuentas Gmail conectadas</p>
          </div>
        ) : (
          <>
            <List
              className="demo-loadmore-list"
              loading={initLoading}
              itemLayout="horizontal"
              dataSource={list.emails}
              renderItem={(item) => (
                <List.Item>
                  <Skeleton avatar title={false} loading={false} active>
                    <List.Item.Meta
                      title={
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: item.read ? "normal" : "bold",
                            }}
                          >
                            {item.subject}
                          </span>
                          <small style={{ color: "#999" }}>
                            {new Date(item.date).toLocaleDateString("es-AR")}
                          </small>
                        </div>
                      }
                      description={
                        <div>
                          <strong>{item.name}</strong> &lt;{item.from}&gt;
                          {!item.read && (
                            <span
                              style={{ color: "#f5222d", marginLeft: "8px" }}
                            >
                              ● No leído
                            </span>
                          )}
                        </div>
                      }
                    />
                    <Button type="primary">Ver más</Button>
                  </Skeleton>
                </List.Item>
              )}
            />

            {list.totalPages > 1 && (
              <Pagination
                total={list.total}
                showTotal={(total) => `Total ${total} emails`}
                current={page}
                pageSize={limit}
                onChange={(newPage, newLimit) => {
                  setPage(newPage);
                  if (newLimit && newLimit !== limit) {
                    setLimit(newLimit);
                  }
                }}
                style={{ marginTop: "24px", textAlign: "center" }}
              />
            )}
          </>
        )}
      </div>
    </Content>
  );
};

export default ListEmailsTest;
