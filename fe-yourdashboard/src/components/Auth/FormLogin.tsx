"use client";
import React from "react";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Button, Form, Input } from "antd";
import { login } from "../../services/auth/auth";
import { useAuth } from "./hooks/useAuth";
import { useRouter } from "next/navigation";
import { IFormLogin } from "@/interfaces/interfacesAuth";
import { useAuthStore } from "@/store/authStore";

const FormLogin = () => {
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
      onFinish={onFinish}
      className="gap-8 flex flex-col"
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
      </Form.Item>
    </Form>
  );
};

export default FormLogin;
