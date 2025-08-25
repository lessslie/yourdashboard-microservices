
"use client";

import { useAuthStore } from "@/store/authStore";
import { connectGoogleCalendar } from "@/services/calendar/calendarService";
import { message, Button, Empty } from "antd";
import { GoogleOutlined } from "@ant-design/icons";
import { useState } from "react";
import { GoogleConnectButtonProps } from "@/interfaces/interfacesCalendar";

const GoogleConnectButton = ({
  onConnect,
  loading: externalLoading = false,
  disabled = false,
  size = "large",
  block = false,
}: GoogleConnectButtonProps) => {
  const { accessToken } = useAuthStore();
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!accessToken) {
      message.error("Debes iniciar sesión para conectar una cuenta de Google.");
      return;
    }

    try {
      setConnecting(true);

      if (onConnect) {
        onConnect();
      }

      await connectGoogleCalendar();
    } catch (error) {
      console.error("Error conectando con Google Calendar:", error);
      message.error(
        "Error al conectar con Google Calendar. Inténtalo de nuevo."
      );
      setConnecting(false);
    }
  };

  const isLoading = connecting || externalLoading;

  return (
    <div className="text-center p-10 bg-white rounded-lg shadow-sm">
      <Empty
        description="No tienes ninguna cuenta de Google Calendar conectada."
        image={<div className="text-6xl mb-4">📅</div>}
      />
      <Button
        type="primary"
        icon={<GoogleOutlined />}
        onClick={handleConnect}
        className="mt-6"
        size={size}
        loading={isLoading}
        disabled={disabled}
        block={block}
      >
        {isLoading ? "Conectando..." : "Conectar mi cuenta de Google Calendar"}
      </Button>

      {isLoading && (
        <p className="mt-2 text-gray-500 text-sm">
          Serás redirigido a Google para autorizar el acceso...
        </p>
      )}
    </div>
  );
};

export default GoogleConnectButton;
