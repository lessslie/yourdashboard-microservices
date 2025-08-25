import { MS_ORCHES_URL } from "@/services/emails/emails";
import axios from "axios";
import { useAuthStore } from "@/store/authStore";

export const register = async (
  nombre: string,
  email: string,
  password: string
) => {
  try {
    const response = await axios.post(`${MS_ORCHES_URL}/auth/register`, {
      email,
      password,
      nombre,
    });
    return response.data;
  } catch (error) {
    console.log("❌ Error registrando usuario:", error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        alert(`Error: ${error.response.data.message}`);
      } else {
        alert("Error: No se pudo conectar con el servidor.");
      }
    }
  }
};

export const login = async (email: string, password: string) => {
  try {
    const response = await axios.post(`${MS_ORCHES_URL}/auth/login`, {
      email,
      password,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        alert(`Error: ${error.response.data.message}`);
      } else {
        alert("Error: No se pudo conectar con el servidor.");
      }
    }
  }
};

export const getMyProfile = async () => {
  try {
    console.log("🔄 Obteniendo perfil del usuario...");

    const token = useAuthStore.getState().accessToken;

    if (!token) {
      throw new Error("No hay token de autenticación disponible");
    }

    console.log(`🔗 Llamando a: GET ${MS_ORCHES_URL}/auth/me`);

    const response = await axios.get(`${MS_ORCHES_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 10000,
    });

    console.log("✅ Perfil obtenido exitosamente");
    console.log(
      "📊 Cuentas Gmail en perfil:",
      response.data?.cuentas_gmail?.length || 0
    );

    return response.data;
  } catch (error) {
    console.error("❌ Error obteniendo perfil:", error);

    if (axios.isAxiosError(error)) {
      if (error.response) {
        const errorMessage =
          error.response.data?.message ||
          error.response.data?.error ||
          `Error ${error.response.status}`;
        throw new Error(`Error del servidor: ${errorMessage}`);
      } else {
        throw new Error("No se pudo conectar con el servidor");
      }
    }

    throw error;
  }
};

export const getUserData = async (token: string) => {
  try {
    const response = await axios.get(`${MS_ORCHES_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        alert(`Error: ${error.response.data.message}`);
      } else {
        alert("Error: No se pudo conectar con el servidor.");
      }
    }
    throw error;
  }
};

export const getGmailCuentas = async (token: string) => {
  try {
    const response = await axios.get(`${MS_ORCHES_URL}/auth/cuentas-gmail`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        alert(`Error: ${error.response.data.message}`);
      } else {
        alert("Error: No se pudo conectar con el servidor.");
      }
    }
  }
};

export const disconnectGoogleAccount = async (cuentaGmailId: string) => {
  try {
    console.log(
      `🔌 Iniciando desconexión de cuenta Gmail ID: ${cuentaGmailId}`
    );

    const token = useAuthStore.getState().accessToken;

    if (!token) {
      throw new Error("No hay token de autenticación disponible");
    }

    console.log(
      `🔗 Llamando a: DELETE ${MS_ORCHES_URL}/auth/cuentas-gmail/${cuentaGmailId}`
    );

    const response = await axios.delete(
      `${MS_ORCHES_URL}/auth/cuentas-gmail/${cuentaGmailId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      }
    );

    console.log(`✅ Respuesta del servidor:`, response.data);
    console.log(`✅ Cuenta Gmail ${cuentaGmailId} desconectada exitosamente`);

    return response.data;
  } catch (error) {
    console.error(
      `❌ Error desconectando cuenta Gmail ${cuentaGmailId}:`,
      error
    );

    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(`❌ Status: ${error.response.status}`);
        console.error(`❌ Data:`, error.response.data);

        const errorMessage =
          error.response.data?.message ||
          error.response.data?.error ||
          `Error ${error.response.status}: ${error.response.statusText}`;

        throw new Error(`Error del servidor: ${errorMessage}`);
      } else if (error.request) {
        console.error(`❌ No response received:`, error.request);
        throw new Error(
          "No se pudo conectar con el servidor. Verifica tu conexión."
        );
      } else {
        console.error(`❌ Request setup error:`, error.message);
        throw new Error(`Error en la petición: ${error.message}`);
      }
    } else {
      throw new Error(`Error inesperado: ${error}`);
    }
  }
};

export const logOut = async () => {
  try {
    const token = useAuthStore.getState().accessToken;

    if (!token) {
      useAuthStore.getState().clearAuth();
      return { success: true };
    }

    const response = await axios.post(
      `${MS_ORCHES_URL}/auth/logout`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    useAuthStore.getState().clearAuth();

    return response.data;
  } catch (error) {
    useAuthStore.getState().clearAuth();

    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(`Error en logout: ${error.response.data.message}`);
      } else {
        console.error("Error: No se pudo conectar con el servidor.");
      }
    }

    return { success: true };
  }
};

//FUNCION COMENTADA YA QUE ESTA DUPLICADA EN CALENDARSERVICE, HASTA QUE SE DECIDA SI SE QUITA O NO
// Esta función está comentada porque ya existe una versión en calendarService.ts
// export const connectGoogleCalendar = async () => {
//   try {
//     const token = useAuthStore.getState().accessToken;

//     if (!token) {
//       throw new Error("No hay token de autenticación disponible");
//     }

//     const authUrl = `${MS_ORCHES_URL}/auth/google?token=${encodeURIComponent(
//       token
//     )}`;

//     window.location.href = authUrl;
//   } catch (error) {
//     console.error("❌ Error iniciando OAuth:", error);
//     throw error;
//   }
// };
