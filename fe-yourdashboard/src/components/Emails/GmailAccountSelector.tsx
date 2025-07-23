import React from "react";
import { Select, Space, Tag } from "antd";
import { MailOutlined } from "@ant-design/icons";
import { ICuentaGmail } from "../Auth/hooks/useAuth";

const { Option } = Select;

interface GmailAccountSelectorProps {
  cuentasGmail: ICuentaGmail[];
  selectedAccountId: string | null;
  onAccountChange: (cuentaGmailId: string) => void;
  loading?: boolean;
}

const GmailAccountSelector: React.FC<GmailAccountSelectorProps> = ({
  cuentasGmail,
  selectedAccountId,
  onAccountChange,
  loading = false,
}) => {
  // Si no hay cuentas, mostrar mensaje
  if (!cuentasGmail || cuentasGmail.length === 0) {
    return (
      <div
        style={{
          padding: "16px",
          background: "#f0f0f0",
          borderRadius: "8px",
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0 }}>No hay cuentas Gmail conectadas</p>
      </div>
    );
  }

  // Si solo hay una cuenta, mostrarla sin selector
  if (cuentasGmail.length === 1) {
    const cuenta = cuentasGmail[0];
    return (
      <div
        style={{
          padding: "12px 16px",
          background: "#e6f7ff",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <MailOutlined style={{ color: "#1890ff" }} />
        <span>
          <strong>{cuenta.alias || "Gmail"}: </strong>
          {cuenta.emailGmail}
        </span>
        <Tag color="blue">{cuenta.emailsCount} emails</Tag>
      </div>
    );
  }

  // Si hay múltiples cuentas, mostrar selector
  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <label style={{ fontWeight: "bold" }}>Seleccionar cuenta Gmail:</label>
      <Select
        style={{ width: "100%" }}
        placeholder="Selecciona una cuenta Gmail"
        value={selectedAccountId}
        onChange={onAccountChange}
        loading={loading}
        size="large"
      >
        {cuentasGmail.map((cuenta) => (
          <Option key={cuenta.id.toString()} value={cuenta.id.toString()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Space>
                <MailOutlined />
                <span>
                  <strong>{cuenta.alias || "Gmail"}: </strong>
                  {cuenta.emailGmail}
                </span>
              </Space>
              <Tag color={cuenta.isActive ? "green" : "red"}>
                {cuenta.emailsCount} emails
              </Tag>
            </div>
          </Option>
        ))}
      </Select>
    </Space>
  );
};

export default GmailAccountSelector;
