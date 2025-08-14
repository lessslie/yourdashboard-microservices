"use client";
import React from "react";
import { LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Form, Input } from "antd";
import { FormView, IFormRegister } from "@/interfaces/interfacesAuth";
import { register } from "@/services/auth/auth";

const FormRegister = ({ setChangeForm }: FormView) => {
  const onFinish = async (values: IFormRegister) => {
    const response = await register(
      values.nombre,
      values.email,
      values.password
    );
    if (response) {
      alert("Usuario registrado con éxito. Por favor, inicie sesión.");
      setChangeForm(false);
    }
  };

  return (
    <Form
      name="register"
      initialValues={{ remember: true }}
      style={{ width: 500, margin: "50px" }}
      onFinish={onFinish}
    >
      <Form.Item
        name="nombre"
        rules={[{ required: true, message: "Por favor ingrese su nombre" }]}
      >
        <Input prefix={<UserOutlined />} placeholder="Nombre" />
      </Form.Item>
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
          Registrarse
        </Button>
        <div style={{ marginTop: "12px", textAlign: "center" }}>
          ¿Ya tienes una cuenta?{" "}
          <span
            style={{ cursor: "pointer", color: "blue" }}
            onClick={() => setChangeForm(false)}
          >
            Inicia sesión aquí
          </span>
        </div>
      </Form.Item>
    </Form>
  );
};

export default FormRegister;
