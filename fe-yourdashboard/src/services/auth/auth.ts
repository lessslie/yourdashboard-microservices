import { MS_ORCHES_URL } from "@/services/emails/emails";
import axios from "axios";

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

export const logOut = async () => {
  try {
    const response = await axios.get(`${MS_ORCHES_URL}/auth/logout`);
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
