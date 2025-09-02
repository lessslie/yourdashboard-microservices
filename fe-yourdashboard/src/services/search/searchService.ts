import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { MS_ORCHES_URL } from "../emails/emails";
import { IGlobalSearchResponse } from "@/interfaces/interfacesSearch";

const searchApi = axios.create({
  baseURL: MS_ORCHES_URL,
});

searchApi.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const globalSearch = async (
  searchTerm: string
): Promise<IGlobalSearchResponse> => {
  try {
    console.log(`🔍 Realizando búsqueda global para: "${searchTerm}"`);
    const response = await searchApi.get("/search/global", {
      params: {
        q: searchTerm,
      },
    });
    console.log("✅ Resultados de búsqueda global:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error en la búsqueda global:", error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        `Error del servidor: ${
          error.response.data.message || "Error desconocido"
        }`
      );
    }
    throw error;
  }
};
