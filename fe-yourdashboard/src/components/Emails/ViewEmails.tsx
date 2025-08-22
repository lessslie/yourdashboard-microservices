"use client";
import React, { useEffect } from "react"; //agregadoooo
import { Button, Layout, Skeleton } from "antd";
import ListEmails from "./ListEmails";
import { useUserData, useCuentasGmail, useAuth } from "../Auth/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Content, Header } from "antd/es/layout/layout";
import DetailsEmail from "./DetailsEmail";
import { useAuthStore } from "@/store/authStore"; // ← Agregar este import


const { Footer } = Layout;

const ViewEmails = ({ emailId }: { emailId?: string }) => {
  console.log("emailId", emailId);

  const router = useRouter();
  const { token, remuveToken } = useAuth();
  const { cuentasGmail } = useCuentasGmail();
  const { userData, loadingProfile } = useUserData();

useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get('success');
  const refresh = urlParams.get('refresh');
  const source = urlParams.get('source');
  
  if (success === 'true' || refresh === 'profile' || source === 'gmail') {
    console.log('🔄 OAuth exitoso detectado, forzando recarga REAL...');
    
    // 🎯 SOLUCIÓN NUCLEAR: Limpiar localStorage + recargar página
    localStorage.removeItem('auth-storage');
    
    // Esperar un momento y recargar
    setTimeout(() => {
      window.location.href = '/dashboard/email';
    }, 100);
  }
}, []);


  if (loadingProfile) {
    return (
      <Content
        style={{ padding: "0 48px", textAlign: "center", paddingTop: "50px" }}
      >
        <Skeleton active />
      </Content>
    );
  }

  if (loadingProfile) {
    return (
      <Content
        style={{ padding: "0 48px", textAlign: "center", paddingTop: "50px" }}
      >
        <Skeleton active />
      </Content>
    );
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          background: "#fff",
          height: "auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Button
          type="primary"
          onClick={() => {
            router.push("/dashboard");
          }}
        >
          Volver al Dashboard
        </Button>

        <h1>📧Email Dashboard</h1>

        {/* <Image
          src="/logo.png"
          alt="Logo"
          width={270}
          height={106}
          style={{ margin: "0" }}
        /> */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h4>Hola, {userData.name}</h4>
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
      </Header>

      {emailId ? (
        <DetailsEmail emailId={emailId} token={token} />
      ) : (
        <ListEmails
          userId={userData.id}
          token={token}
          cuentasGmail={cuentasGmail}
        />
      )}

      <Footer style={{ textAlign: "center" }}>
        Inspiration Factory Copyright ©{new Date().getFullYear()}
      </Footer>
    </Layout>
  );
};

export default ViewEmails;
