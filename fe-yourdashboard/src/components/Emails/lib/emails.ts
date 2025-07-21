//src/components/Emails/lib/emails.ts
import { MS_AUTH_URL } from "@/components/Auth/lib/auth";
import axios from "axios";

const MS_EMAILS_URL =
  process.env.NEXT_PUBLIC_MS_ORCHESTRATOR_URL || "http://localhost:3003";

// 🎯 ARREGLADO: OAuth debe redirigir, no hacer axios
export const handleConnectService = async (token: string) => {
  try {
    console.log("🔵 Iniciando conexión OAuth con Google...");
    
    // 🎯 OAuth correcto: REDIRECCIÓN del navegador
    const authUrl = `${MS_AUTH_URL}/auth/google`;
    console.log(`🔗 Redirigiendo a: ${authUrl}`);
    
    // 🎯 REDIRECCIÓN en lugar de axios
    window.location.href = authUrl;
    
    // No retorna nada porque redirige
  } catch (error) {
    console.error("❌ Error iniciando OAuth:", error);
    alert("Error conectando con Google");
  }
};

// ✅ Estas funciones están bien - usan orchestrator
export const getEmails = async (
  token: string,
  cuentaGmailId: string, // 🎯 Cambio: cuentaGmailId en lugar de userId
  page: number,
  limit: number
) => {
  try {
    const response = await axios.get(`${MS_EMAILS_URL}/emails/inbox`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        cuentaGmailId, // 🎯 Cambio: cuentaGmailId en lugar de userId
        page,
        limit,
      },
    });
    return response.data;
  } catch (error) {
    console.error("❌ Error obteniendo emails:", error);
    throw error;
  }
};

export const getEmailStats = async (
  token: string,
  cuentaGmailId: string // 🎯 Cambio: cuentaGmailId en lugar de userId
) => {
  try {
    const response = await axios.get(`${MS_EMAILS_URL}/emails/stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        cuentaGmailId, // 🎯 Cambio: cuentaGmailId en lugar de userId
      },
    });
    return response.data;
  } catch (error) {
    console.error("❌ Error obteniendo estadísticas:", error);
    throw error;
  }
};

export const searchEmails = async (
  token: string,
  cuentaGmailId: string, // 🎯 Cambio: cuentaGmailId en lugar de userId
  searchTerm: string,
  page: number,
  limit: number
) => {
  try {
    const response = await axios.get(`${MS_EMAILS_URL}/emails/search`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        cuentaGmailId, // 🎯 Cambio: cuentaGmailId en lugar de userId
        q: searchTerm,
        page,
        limit,
      },
    });
    return response.data;
  } catch (error) {
    console.error("❌ Error buscando emails:", error);
    throw error;
  }
};

export const syncEmails = async (
  token: string,
  cuentaGmailId: string, // 🎯 Cambio: cuentaGmailId en lugar de userId
  maxEmails: number = 50
) => {
  try {
    const response = await axios.post(`${MS_EMAILS_URL}/emails/sync`, null, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        cuentaGmailId, // 🎯 Cambio: cuentaGmailId en lugar de userId
        maxEmails,
      },
    });
    return response.data;
  } catch (error) {
    console.error("❌ Error sincronizando emails:", error);
    throw error;
  }
};