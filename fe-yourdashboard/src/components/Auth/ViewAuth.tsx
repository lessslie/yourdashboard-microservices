"use client";
import React, { useState } from "react";
import { Layout } from "antd";
import Image from "next/image";
import FormLogin from "./FormLogin";
import FormRegister from "./FormRegister";
import { SpinerGlobal, useCargando } from "@/utils/cargando";
import Title from "antd/es/typography/Title";

const ViewAuth = () => {
  const [changeForm, setChangeForm] = useState(false);
  const { loading } = useCargando();
  if (loading) return <SpinerGlobal />;
  return (
    <Layout
      style={{
        width: "50%",
        height: "100vh",
        position: "absolute",
        top: 0,
        left: changeForm ? "50%" : "0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#fff",
        // background:
        //   "linear-gradient(180deg,rgba(245, 245, 245, 1) 0%, rgba(250, 200, 200, 1) 100%)",
      }}
    >
      <Image
        src="/Nombre=Horizontal.png"
        alt="Logo"
        width={220}
        height={40}
        style={{ margin: "0 auto" }}
      />
      <div style={{ textAlign: "center" }}>
        <Title
          level={2}
          style={{
            color: "rgba(32, 47, 143, 1)",
            textAlign: "center",
            marginTop: "50px",
            fontWeight: "bold",
          }}
        >
          ¡Iniciar Sesión!
        </Title>
        <Title
          level={4}
          style={{
            fontWeight: "initial",
          }}
        >
          ¿Aun no tienes una cuenta?{" "}
          <span
            style={{
              cursor: "pointer",
              color: "rgba(52, 75, 255, 1)",
            }}
            onClick={() => setChangeForm(true)}
          >
            Registrate aqui
          </span>
        </Title>
      </div>

      {changeForm ? (
        <FormRegister setChangeForm={setChangeForm} />
      ) : (
        <FormLogin setChangeForm={setChangeForm} />
      )}
    </Layout>
  );
};

export default ViewAuth;
