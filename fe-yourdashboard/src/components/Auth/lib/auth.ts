import axios from "axios";
export const MS_AUTH_URL =
  process.env.NEXT_PUBLIC_MS_AUTH_URL || "http://localhost:3001";

export const register = async (
  name: string,
  email: string,
  password: string
) => {
  try {
    const response = await axios.post(`${MS_AUTH_URL}/auth/register`, {
      email,
      password,
      name,
    });
    return response.data;
  } catch (error) {
    alert(error);
  }
};

export const login = async (email: string, password: string) => {
  try {
    const response = await axios.post(`${MS_AUTH_URL}/auth/login`, {
      email,
      password,
    });
    return response.data;
  } catch (error) {
    alert(error);
  }
};

export const handleConnectService = async () => {
  try {
    const response = await axios.get(`${MS_AUTH_URL}/auth/google`);
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

export const getUserData = async (token: string) => {
  try {
    const response = await axios.get(`${MS_AUTH_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const logOut = async () => {
  try {
    const response = await axios.get(`${MS_AUTH_URL}/auth/logout`);
    return response.data;
  } catch (error) {
    alert(error);
  }
};
