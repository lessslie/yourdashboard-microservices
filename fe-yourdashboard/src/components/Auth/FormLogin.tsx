"use client";
import React from "react";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Button, Form, Input } from "antd";
import { login } from "../../services/auth/auth";
import { useAuth } from "./hooks/useAuth";
import { useRouter } from "next/navigation";
import { FormView, IFormLogin } from "@/interfaces/interfacesAuth";
import { useAuthStore } from "@/store/authStore";

const FormLogin = ({ setChangeForm }: FormView) => {
  const router = useRouter();
  const { saveToken } = useAuth();
  const { setUserProfile } = useAuthStore();

  const onFinish = async (values: IFormLogin) => {
    try {
      const response = await login(values.email, values.password);
      if (response && response.token) {
        console.log("response", response);

        saveToken(response.token);
        setUserProfile(response);

        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error en login:", error);
    }
  };

  return (
    <Form
      name="login"
      initialValues={{ remember: true }}
      style={{ width: 500, margin: "50px" }}
      onFinish={onFinish}
    >
      <Form.Item
        name="email"
        rules={[{ required: true, message: "Por favor ingrese su email" }]}
      >
        <Input prefix={<MailOutlined />} placeholder="Email" />
      </Form.Item>
      <Form.Item
        name="password"
        rules={[{ required: true, message: "Por favor ingrese su contraseña" }]}
      >
        <Input
          prefix={<LockOutlined />}
          type="password"
          placeholder="Contraseña"
        />
      </Form.Item>

      <Form.Item>
        <Button block type="primary" htmlType="submit">
          Iniciar Sesión
        </Button>
        <div style={{ marginTop: "12px", textAlign: "center" }}>
          Si no tienes una cuenta,{" "}
          <span
            style={{ cursor: "pointer", color: "blue" }}
            onClick={() => setChangeForm(true)}
          >
            registrate aquí
          </span>
        </div>
      </Form.Item>
    </Form>
  );
};

export default FormLogin;
