"use client";

import React, { useEffect } from "react";
import { Menu, Avatar, Typography, Layout, Button } from "antd";
import { PlusOutlined, UserOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { Account } from "@/interfaces/interfacesWhatsapp";
import { getAccounts } from "@/services/whatsapp/whatsapp";
import Link from "next/link";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function WhatsappLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const router = useRouter();
  const [accounts, setAccounts] = React.useState<Account[]>(
    []
  );

  useEffect(() => {
      const fetchAccounts = async () => {
        try {
          const accounts = await getAccounts();
          console.log("Cuentas obtenidas:", accounts);
          setAccounts(accounts);
  
  
        } catch (error) {
          console.error("Error fetching conversations", error);
      
        }
      };
  
      fetchAccounts();
    }, []);

  
  return (
    <Layout style={{ minHeight: "100vh", height: "100vh", overflow: "hidden" }}>
      <Header
        style={{
          background: "#fff",
          padding: "0 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          height: 64,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Button
          type="primary"
          onClick={() => {
            router.push("/dashboard");
          }}
          >
            Volver al Dashboard
          </Button>
          <h1 style={{ margin: 0, paddingLeft: "400px", color: "#4575ddff" }}>📱 WhatsApp</h1>
        </div>
      </Header>
      <Layout
        style={{
          position: "absolute",
          top: 64,
          left: 0,
          right: 0,
          bottom: 0,
          height: "calc(100vh - 64px)",
          minHeight: 0,
          background: "#fafafa",
          overflow: "hidden",
        }}
      >
        <Sider
          width={100}
          style={{
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 20,
            paddingBottom: 20,
            height: "calc(100vh - 64px)", // ajusta al Header
            overflowY: "auto",
            minHeight: 0,
          }}
        >
          <Menu
            mode="inline"
            selectable={false}
            style={{ width: "100%", borderRight: 0 }}
            items={[
              ...accounts.map((account) => ({
                key: account.id,
                label: (
                  <Link href={`/dashboard/whatsapp/${account.id}/conversations`}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4, // espacio entre avatar y texto
                      }}
                    >
                      <Avatar
                        size={64}
                        style={{ backgroundColor: "rgba(222, 125, 103, 0.78)" }}
                        icon={<UserOutlined />}
                      />
                      <Text style={{ fontSize: 12, textAlign: "center" }}>
                        {account.nombre_cuenta}
                      </Text>
                    </div>
                  </Link>
                ),
                style: {
                  minHeight: 100,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                },
              })),
              {
                key: "add",
                label: (
                  <Link href={`/dashboard/whatsapp`}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Avatar
                        size={64}
                        style={{ backgroundColor: "#188fff69" }}
                        icon={<PlusOutlined />}
                      />
                    </div>
                  </Link>
                ),
                style: {
                  minHeight: 100,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                },
              },
            ]}
          />
        </Sider>

        <Content
          style={{
            padding: 0,
            height: "100%",
            minHeight: 0,
            overflow: "hidden",
            background: "#fafafa",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
