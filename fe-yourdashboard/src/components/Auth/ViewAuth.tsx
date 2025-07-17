import React from "react";
import { Layout } from "antd";
import Image from "next/image";
import { Footer } from "antd/es/layout/layout";
import FormLogin from "./FormLogin";

const ViewAuth = () => {
  return (
    <Layout
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
      <FormLogin />
      <Footer style={{ textAlign: "center" }}>
        Inspiration Factory Copyright ©{new Date().getFullYear()}
      </Footer>
    </Layout>
  );
};

export default ViewAuth;
