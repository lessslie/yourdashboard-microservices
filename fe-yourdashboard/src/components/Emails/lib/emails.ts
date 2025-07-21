import { MS_AUTH_URL } from "@/components/Auth/lib/auth";
import axios from "axios";

const MS_EMAILS_URL =
  process.env.NEXT_PUBLIC_MS_ORCHESTRATOR_URL || "http://localhost:3001";

export const handleConnectService = async (token: string) => {
  try {
    const response = await axios.get(`${MS_AUTH_URL}/auth/google`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    alert(error);
  }
  // if (service === "gmail") {
  //   console.log("🔵 Conectando con Gmail...");
  //   const authUrl = `${MS_AUTH_URL}/auth/google`;
  //   window.location.href = authUrl;
  // } else {
  //   console.log(`🔵 ${service} aún no implementado`);
  //   alert(`Conexión con ${service} próximamente disponible`);
  // }
};

export const getEmails = async (
  token: string,
  userId: string,
  page: number,
  limit: number
) => {
  try {
    const response = await axios.get(`${MS_EMAILS_URL}/emails/inbox`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        userId,
        page,
        limit,
      },
    });
    return response.data;
  } catch (error) {
    console.error(error);
  }
};
