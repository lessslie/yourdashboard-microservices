"use client";

import { useAuthStore } from "@/store/authStore";
import { message, Button, Popconfirm, Tag, Select, Space } from "antd";
import {
  PoweroffOutlined,
  DisconnectOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AccountManagerProps } from "@/interfaces/interfacesCalendar";

import { disconnectGoogleAccount, getMyProfile } from "@/services/auth/auth";

const { Option } = Select;

const AccountManager = ({
  onAccountChange,
  onAccountDisconnect,
  selectedAccountId,
  showUnifiedOption = true,
}: AccountManagerProps) => {
  const { userProfile, setUserProfile, clearAuth, getGmailAccounts } =
    useAuthStore();
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const gmailAccounts = getGmailAccounts();
  const activeAccount = selectedAccountId
    ? gmailAccounts.find((acc) => acc.id.toString() === selectedAccountId)
    : gmailAccounts[0];

  const handleAccountChange = (value: string) => {
    if (onAccountChange) {
      onAccountChange(value);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!accountId) return;

    const account = gmailAccounts.find(
      (acc) => acc.id.toString() === accountId
    );
    if (!account) return;

    setDisconnecting(accountId);
    message.loading({
      content: `Desconectando ${account.email_gmail}...`,
      key: "disconnect",
    });

    try {
      console.log(`🔌 Desconectando cuenta Gmail ID: ${accountId}`);

      await disconnectGoogleAccount(accountId);

      await new Promise((resolve) => setTimeout(resolve, 500));

      const updatedProfile = await getMyProfile();
      setUserProfile(updatedProfile);

      message.success({
        content: `Cuenta ${account.email_gmail} desconectada exitosamente.`,
        key: "disconnect",
        duration: 3,
      });

      if (onAccountDisconnect) {
        onAccountDisconnect(accountId);
      }

      console.log(`✅ Cuenta ${account.email_gmail} desconectada exitosamente`);
    } catch (error) {
      console.error("❌ Error al desconectar la cuenta:", error);

      let errorMessage = "No se pudo desconectar la cuenta. Intenta de nuevo.";

      if (error instanceof Error) {
        if (error.message.includes("Error:")) {
          errorMessage = error.message;
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      message.error({
        content: errorMessage,
        key: "disconnect",
      });
    } finally {
      setDisconnecting(null);
    }
  };

  const handleLogout = async () => {
    try {
      console.log("🚪 Cerrando sesión...");

      clearAuth();
      message.success("Sesión cerrada.");

      router.push("/auth");
    } catch (error) {
      console.error("❌ Error en logout:", error);

      clearAuth();
      message.success("Sesión cerrada.");
      router.push("/auth");
    }
  };

  if (gmailAccounts.length === 0) {
    return (
      <div className="flex items-center gap-4">
        <Tag color="orange" className="text-sm p-2">
          📅 Sin cuentas de Calendar conectadas
        </Tag>

        <Button
          type="default"
          icon={<PoweroffOutlined />}
          onClick={handleLogout}
          danger
        >
          Cerrar Sesión
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {/* Selector de cuenta */}
      <div className="flex items-center gap-2">
        <CalendarOutlined className="text-blue-500" />
        <Select
          value={selectedAccountId || gmailAccounts[0]?.id.toString()}
          onChange={handleAccountChange}
          style={{ minWidth: 200 }}
          placeholder="Seleccionar cuenta"
        >
          {showUnifiedOption && gmailAccounts.length > 1 && (
            <Option value="unified">
              📊 Todas las cuentas ({gmailAccounts.length})
            </Option>
          )}
          {gmailAccounts.map((account) => (
            <Option key={account.id} value={account.id.toString()}>
              <Space>
                📅 {account.alias_personalizado || account.email_gmail}
                <Tag size="small" color={account.esta_activa ? "green" : "red"}>
                  {account.esta_activa ? "Activa" : "Inactiva"}
                </Tag>
              </Space>
            </Option>
          ))}
        </Select>
      </div>

      {/* Información de la cuenta activa */}
      {activeAccount && (
        <Tag color="blue" className="text-sm p-2">
          📧 {activeAccount.email_gmail}
          {activeAccount.emails_count > 0 && (
            <span className="ml-1">({activeAccount.emails_count} eventos)</span>
          )}
        </Tag>
      )}

      {activeAccount &&
        selectedAccountId &&
        selectedAccountId !== "unified" && (
          <Popconfirm
            title="¿Desconectar esta cuenta de Google Calendar?"
            description={`Esto eliminará el acceso a los eventos de ${activeAccount.email_gmail}`}
            onConfirm={() => handleDisconnect(selectedAccountId)}
            okText="Sí, desconectar"
            cancelText="No"
            okButtonProps={{
              loading: disconnecting === selectedAccountId,
              danger: true,
            }}
          >
            <Button
              icon={<DisconnectOutlined />}
              loading={disconnecting === selectedAccountId}
              disabled={!!disconnecting}
            >
              Desconectar
            </Button>
          </Popconfirm>
        )}

      <Button
        type="default"
        icon={<PoweroffOutlined />}
        onClick={handleLogout}
        danger
      >
        Cerrar Sesión
      </Button>
    </div>
  );
};

export default AccountManager;
