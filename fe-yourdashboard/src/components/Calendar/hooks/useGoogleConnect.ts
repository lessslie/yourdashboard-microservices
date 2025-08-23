
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { connectGoogleCalendar } from "@/services/calendar/calendarService";
import { message } from "antd";

export const useGoogleConnect = () => {
  const [connecting, setConnecting] = useState(false);
  const { accessToken } = useAuthStore();

  const connect = async () => {
    if (!accessToken) {
      message.error("Debes iniciar sesión para conectar una cuenta de Google.");
      return false;
    }

    try {
      setConnecting(true);
      await connectGoogleCalendar();
      return true;
    } catch (error) {
      console.error("Error conectando con Google Calendar:", error);
      message.error(
        "Error al conectar con Google Calendar. Inténtalo de nuevo."
      );
      return false;
    } finally {
      setConnecting(false);
    }
  };

  return {
    connect,
    connecting,
    canConnect: !!accessToken,
  };
};
