import React, { useEffect, useState } from "react";
import { Layout, Button, List, Skeleton, Pagination } from "antd";
import { useAuth, useUserData } from "../Auth/hooks/useAuth";
import { getEmails } from "./lib/emails";

const { Content } = Layout;

interface IEmailBack {
  id: string;
  messageId: string;
  subject: string;
  fromEmail: string;
  fromName: string;
  receivedDate: string;
  isRead: boolean; // 🎯 Arreglado: boolean en lugar de false
  hasAttachments: boolean; // 🎯 Arreglado: boolean en lugar de false
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

const ListEmails = () => {
  const { userData } = useUserData();
  const { token } = useAuth();

  const [initLoading, setInitLoading] = useState(true);

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

  // 🎯 Para la demo, usamos cuenta Gmail ID 4 (Agata)
  const CUENTA_GMAIL_ID = "4";

  console.log("list.emails", list.emails);

  useEffect(() => {
    const fetchEmails = async () => {
      if (!token) {
        console.log("⚠️ No hay token, saltando fetch");
        setInitLoading(false);
        return;
      }

      try {
        setInitLoading(true);
        console.log("📧 Fetching emails for cuenta Gmail:", CUENTA_GMAIL_ID);
        
        // 🎯 CAMBIO PRINCIPAL: usar cuentaGmailId en lugar de userData.id
        const emailsResponse = await getEmails(token, CUENTA_GMAIL_ID, page, limit);
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
          
          console.log(`📧 ${dataEmails.emails.length} emails cargados exitosamente`);
        } else {
          console.warn("⚠️ Response no exitosa:", emailsResponse);
        }
      } catch (error) {
        console.error("❌ Error fetching emails:", error);
      } finally {
        setInitLoading(false);
      }
    };

    // 🎯 Ejecutar fetch cuando hay token
    if (token) {
      fetchEmails();
    }
  }, [token, page, limit]); // 🎯 Removido userData.id de las dependencias

  return (
    <Content style={{ padding: "0 48px" }}>
      <div
        style={{
          minHeight: 280,
          padding: 24,
        }}
      >
        {/* 🎯 Info de debugging */}
        <div style={{ marginBottom: "16px", padding: "8px", background: "#f0f0f0" }}>
          <p><strong>Usuario:</strong> {userData.email}</p>
          <p><strong>Cuenta Gmail activa:</strong> agata.morales92@gmail.com (ID: {CUENTA_GMAIL_ID})</p>
          <p><strong>Token presente:</strong> {token ? "✅ Sí" : "❌ No"}</p>
        </div>

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
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: item.read ? "normal" : "bold" }}>
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
                      {!item.read && <span style={{ color: "#f5222d", marginLeft: "8px" }}>● No leído</span>}
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
            defaultCurrent={page}
            pageSize={limit}
            onChange={(newPage, newLimit) => {
              setPage(newPage);
              if (newLimit) {
                setLimit(newLimit);
              }
            }}
          />
        )}
      </div>
    </Content>
  );
};

export default ListEmails;