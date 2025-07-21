"use client";
import React from "react";
import { Button, Input, Layout } from "antd";
import Image from "next/image";
import ListEmails from "./ListEmails";
import { useAuth } from "../Auth/hooks/useAuth";
import { useRouter } from "next/navigation";
import { MS_AUTH_URL } from "../Auth/lib/auth";
import { handleConnectService } from "./lib/emails";

const { Footer } = Layout;

const ViewEmails = () => {
  const router = useRouter();
  const { remuveToken, token } = useAuth();

  const conectEmail = async () => {
    const response = await handleConnectService(token);
    console.log("response", response);

    //  window.location.href = `${MS_AUTH_URL}/auth/google`;
  };
  return (
    <Layout
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        padding: "24px",
        // background:
        //   "linear-gradient(180deg,rgba(245, 245, 245, 1) 0%, rgba(250, 200, 200, 1) 100%)",
      }}
    >
      <Image
        src="/logo.png"
        alt="Logo"
        width={270}
        height={106}
        style={{ margin: "0 auto" }}
      />
      <div style={{ display: "flex", justifyItems: "center", gap: "16px" }}>
        <Button type="primary" onClick={() => conectEmail()}>
          Conectar cuenta
        </Button>
        <Button
          type="primary"
          onClick={() => {
            remuveToken();
            router.push("/auth");
          }}
        >
          Cerrar sesión
        </Button>
      </div>

      {/* Estilos de buscador y filtros */}

      <div style={{ display: "flex", gap: "50px", padding: "16px 0" }}>
        <Input.Search placeholder="Buscar..." enterButton />
        <Input placeholder="Filtrar por..." />
      </div>
      <div style={{ padding: "16px 0" }}></div>

      <ListEmails />

      <Footer style={{ textAlign: "center" }}>
        Inspiration Factory Copyright ©{new Date().getFullYear()}
      </Footer>
    </Layout>
  );
};

export default ViewEmails;
