import axios from "axios";

export const MS_ORCHES_URL = process.env.NEXT_PUBLIC_MS_ORCHESTRATOR_URL;

export const handleConnectService = async (token: string) => {
  try {
    const authUrl = `${MS_ORCHES_URL}/auth/google?token=${encodeURIComponent(
      token
    )}`;
    window.location.href = authUrl;
  } catch (error) {
    console.error("❌ Error iniciando OAuth:", error);
  }
};

// 🎯 FUNCIÓN PARA RECUPERAR TOKEN DESPUÉS DEL OAUTH (no se usa por ahora)
export const restoreTokenAfterOAuth = () => {
  const tempToken = localStorage.getItem("oauth_temp_token");
  if (tempToken) {
    localStorage.removeItem("oauth_temp_token");
    localStorage.setItem("token", tempToken);
    return tempToken;
  }
  return null;
};

// ✅ Estas funciones están bien - usan orchestrator
export const getEmails = async (
  token: string,
  cuentaGmailId: string, // 🎯 Cambio: cuentaGmailId en lugar de userId
  page: number,
  limit: number
) => {
  try {
    const response = await axios.get(`${MS_ORCHES_URL}/emails/inbox`, {
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
    const response = await axios.get(`${MS_ORCHES_URL}/emails/stats`, {
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
    const response = await axios.get(`${MS_ORCHES_URL}/emails/search`, {
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
    const response = await axios.post(`${MS_ORCHES_URL}/emails/sync`, null, {
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
