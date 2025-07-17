"use client";
import React from "react";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Button, Form, Input } from "antd";
import { login } from "./lib/auth";
import { useAuth } from "./hooks/useAuth";
import { useRouter } from "next/navigation";

interface FormLogin {
  email: string;
  password: string;
}

const FormLogin = () => {
  const router = useRouter();
  const { saveToken } = useAuth();
  const onFinish = async (values: FormLogin) => {
    const response = await login(values.email, values.password);
    if (response) {
      console.log("response", response);
      saveToken(response.token);
      router.push("/dashboard/email");
    }
  };

  return (
    <Form
      name="login"
      initialValues={{ remember: true }}
      style={{ width: 500, margin: "50px" }}
      onFinish={onFinish} // funcion que se ejecuta cuando se envia el formulario
    >
      <Form.Item
        name="email"
        rules={[{ required: true, message: "Por favor ingrese su email" }]}
      >
        <Input prefix={<MailOutlined />} placeholder="Email" />
      </Form.Item>
      <Form.Item
        name="password"
        rules={[{ required: true, message: "Por favor ingrese su contraseña" }]}
      >
        <Input
          prefix={<LockOutlined />}
          type="password"
          placeholder="Contraseña"
        />
      </Form.Item>

      <Form.Item>
        <Button block type="primary" htmlType="submit">
          Iniciar Sesión
        </Button>
        Si no tienes una cuenta, <a href="">registrate aqui</a>
      </Form.Item>
    </Form>
  );
};

export default FormLogin;
