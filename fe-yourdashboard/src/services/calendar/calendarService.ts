import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { CreateEventDto, UpdateEventDto } from "@/interfaces/interfacesCalendar";

const MS_ORCHES_URL =
  process.env.NEXT_PUBLIC_MS_ORCHESTRATOR_URL || "http://localhost:3003";

const calendarApi = axios.create({
  baseURL: MS_ORCHES_URL,
});

calendarApi.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    console.log(
      `🔗 Calendar API Request: ${config.method?.toUpperCase()} ${config.url}`
    );
    console.log(`🎫 Token exists: ${!!token}`);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`🎫 Authorization header set`);
    } else {
      console.warn(`⚠️ No token available for calendar request`);
    }
    return config;
  },
  (error) => {
    console.error(`❌ Calendar request interceptor error:`, error);
    return Promise.reject(error);
  }
);

calendarApi.interceptors.response.use(
  (response) => {
    console.log(
      `✅ Calendar API Response: ${response.status} ${response.config.url}`
    );
    return response;
  },
  (error) => {
    console.error(
      `❌ Calendar API Error: ${error.response?.status} ${error.config?.url}`
    );
    console.error(`❌ Error details:`, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ================================
// 🔗 CONEXIÓN CON GOOGLE
// ================================

export const connectGoogleCalendar = async () => {
  console.log(`🔌 Iniciando conexión con Google Calendar...`);
  try {
    const token = useAuthStore.getState().accessToken;
    if (!token) {
      throw new Error("No hay token de autorización disponible");
    }

    // 🎯 Construir URL del orquestador con token
    const authUrl = `${MS_ORCHES_URL}/auth/google?token=${encodeURIComponent(
      token
    )}&service=calendar`;

    console.log(`🔗 Redirigiendo a: ${authUrl}`);
    console.log(`📍 Después del OAuth, serás redirigido a: /auth/callback`);

    window.location.href = authUrl;
  } catch (error) {
    console.error("❌ Error iniciando OAuth:", error);
    throw error;
  }
};

// ================================
// 📅 GESTIÓN DE EVENTOS
// ================================

export const getCalendarEvents = async (
  cuentaGmailId: string,
  timeMin: string,
  timeMax?: string,
  page?: number,
  limit?: number
) => {
  console.log(`📅 Obteniendo eventos para cuenta ${cuentaGmailId}`);
  try {
    const response = await calendarApi.get("/calendar/events", {
      params: { cuentaGmailId, timeMin, timeMax, page, limit },
    });

    console.log(
      `✅ Eventos obtenidos: ${response.data?.data?.events?.length || 0}`
    );
    return response.data.data;
  } catch (error) {
    console.error(`❌ Error obteniendo eventos:`, error);
    throw error;
  }
};

export const getUnifiedCalendarEvents = async (
  userId: string,
  timeMin: string,
  timeMax?: string,
  page?: number,
  limit?: number
) => {
  console.log(`🎯 Obteniendo eventos unificados para usuario ${userId}`);
  try {
    const response = await calendarApi.get("/calendar/events-all-accounts", {
      params: { userId, timeMin, timeMax, page, limit },
    });

    console.log(
      `✅ Eventos unificados obtenidos: ${
        response.data?.data?.events?.length || 0
      }`
    );
    return response.data.data;
  } catch (error) {
    console.error(`❌ Error obteniendo eventos unificados:`, error);
    throw error;
  }
};

// ================================
// 🔍 NUEVAS FUNCIONES DE BÚSQUEDA
// ================================

export const searchCalendarEvents = async (
  cuentaGmailId: string,
  timeMin: string,
  searchTerm: string,
  page?: number,
  limit?: number
) => {
  console.log(
    `🔍 Buscando eventos: "${searchTerm}" en cuenta ${cuentaGmailId}`
  );
  try {
    const response = await calendarApi.get("/calendar/events/search", {
      params: { cuentaGmailId, timeMin, q: searchTerm, page, limit },
    });

    console.log(
      `✅ Eventos encontrados: ${response.data?.data?.events?.length || 0}`
    );
    return response.data.data;
  } catch (error) {
    console.error(`❌ Error buscando eventos:`, error);
    throw error;
  }
};

export const searchUnifiedCalendarEvents = async (
  userId: string,
  timeMin: string,
  searchTerm: string,
  page?: number,
  limit?: number
) => {
  console.log(`🌍 Búsqueda global: "${searchTerm}" para usuario ${userId}`);
  try {
    const response = await calendarApi.get("/calendar/search-all-accounts", {
      params: { userId, timeMin, q: searchTerm, page, limit },
    });

    console.log(
      `✅ Búsqueda global completada: ${
        response.data?.data?.events?.length || 0
      } eventos`
    );
    return response.data.data;
  } catch (error) {
    console.error(`❌ Error en búsqueda global:`, error);
    throw error;
  }
};

// ================================
// 📅 GESTIÓN DE EVENTOS (CRUD)
// ================================

export const getCalendarEventById = async (
  cuentaGmailId: string,
  eventId: string
) => {
  console.log(`📋 Obteniendo evento ${eventId} para cuenta ${cuentaGmailId}`);
  try {
    const response = await calendarApi.get(`/calendar/events/${eventId}`, {
      params: { cuentaGmailId },
    });

    console.log(`✅ Evento obtenido: ${eventId}`);
    return response.data.data;
  } catch (error) {
    console.error(`❌ Error obteniendo evento ${eventId}:`, error);
    throw error;
  }
};

export const createCalendarEvent = async (
  cuentaGmailId: string,
  eventData: CreateEventDto, //en lugar de any
  isPrivate?: boolean
) => {
  console.log(`➕ Creando evento para cuenta ${cuentaGmailId}`);
  try {
    const endpoint = isPrivate
      ? "/calendar/events/private"
      : "/calendar/events";
    const response = await calendarApi.post(endpoint, eventData, {
      params: { cuentaGmailId, private: isPrivate },
    });

    console.log(`✅ Evento creado exitosamente`);
    return response.data.data;
  } catch (error) {
    console.error(`❌ Error creando evento:`, error);
    throw error;
  }
};

export const updateCalendarEvent = async (
  eventId: string,
  cuentaGmailId: string,
  eventData: UpdateEventDto //en lugar de any
) => {
  console.log(`✏️ Actualizando evento ${eventId}`);
  try {
    const response = await calendarApi.patch(
      `/calendar/events/${eventId}`,
      eventData,
      {
        params: { cuentaGmailId },
      }
    );

    console.log(`✅ Evento actualizado exitosamente`);
    return response.data.data;
  } catch (error) {
    console.error(`❌ Error actualizando evento:`, error);
    throw error;
  }
};

export const deleteCalendarEvent = async (
  eventId: string,
  cuentaGmailId: string
) => {
  console.log(`🗑️ Eliminando evento ${eventId}`);
  try {
    await calendarApi.delete(`/calendar/events/${eventId}`, {
      params: { cuentaGmailId },
    });

    console.log(`✅ Evento eliminado exitosamente`);
  } catch (error) {
    console.error(`❌ Error eliminando evento:`, error);
    throw error;
  }
};

// ================================
// 📊 ESTADÍSTICAS Y SINCRONIZACIÓN
// ================================

export const getCalendarStats = async (cuentaGmailId: string) => {
  console.log(`📊 Obteniendo estadísticas para cuenta ${cuentaGmailId}`);
  try {
    const response = await calendarApi.get("/calendar/stats", {
      params: { cuentaGmailId },
    });

    console.log(`✅ Estadísticas obtenidas`);
    return response.data.data;
  } catch (error) {
    console.error(`❌ Error obteniendo estadísticas:`, error);
    throw error;
  }
};

export const syncCalendarEvents = async (
  cuentaGmailId: string,
  maxEvents?: number
) => {
  console.log(`🔄 Sincronizando eventos para cuenta ${cuentaGmailId}`);
  try {
    const response = await calendarApi.post("/calendar/sync", null, {
      params: { cuentaGmailId, maxEvents },
    });

    console.log(`✅ Sincronización completada`);
    return response.data.data;
  } catch (error) {
    console.error(`❌ Error en sincronización:`, error);
    throw error;
  }
};

// ================================
// 🔍 BÚSQUEDA RÁPIDA Y AUTOCOMPLETADO
// ================================

export const searchEventsQuick = async (
  cuentaGmailId: string,
  searchTerm: string,
  limit: number = 5
) => {
  console.log(`⚡ Búsqueda rápida: "${searchTerm}"`);
  try {
    const timeMin = new Date(
      Date.now() - 365 * 24 * 60 * 60 * 1000
    ).toISOString();

    const response = await calendarApi.get("/calendar/events/search", {
      params: {
        cuentaGmailId,
        timeMin,
        q: searchTerm,
        page: 1,
        limit,
      },
    });

    return response.data.data?.events || [];
  } catch (error) {
    console.error(`❌ Error en búsqueda rápida:`, error);
    return [];
  }
};

export const searchUnifiedEventsQuick = async (
  userId: string,
  searchTerm: string,
  limit: number = 5
) => {
  console.log(`⚡ Búsqueda rápida unificada: "${searchTerm}"`);
  try {
    const timeMin = new Date(
      Date.now() - 365 * 24 * 60 * 60 * 1000
    ).toISOString(); // Último año

    const response = await calendarApi.get("/calendar/search-all-accounts", {
      params: {
        userId,
        timeMin,
        q: searchTerm,
        page: 1,
        limit,
      },
    });

    return response.data.data?.events || [];
  } catch (error) {
    console.error(`❌ Error en búsqueda rápida unificada:`, error);
    return [];
  }
};

// ================================
// 🔧 UTILIDADES
// ================================

export const getEventsByDateRange = async (
  cuentaGmailId: string,
  startDate: string,
  endDate: string
) => {
  console.log(`📅 Obteniendo eventos entre ${startDate} y ${endDate}`);
  try {
    const response = await calendarApi.get("/calendar/events", {
      params: {
        cuentaGmailId,
        timeMin: startDate,
        timeMax: endDate,
        limit: 1000,
      },
    });

    return response.data.data?.events || [];
  } catch (error) {
    console.error(`❌ Error obteniendo eventos por rango:`, error);
    throw error;
  }
};

export const getUpcomingEvents = async (
  cuentaGmailId: string,
  days: number = 7,
  limit: number = 10
) => {
  console.log(`📅 Obteniendo próximos eventos (${days} días)`);
  try {
    const timeMin = new Date().toISOString();
    const timeMax = new Date(
      Date.now() + days * 24 * 60 * 60 * 1000
    ).toISOString();

    const response = await calendarApi.get("/calendar/events", {
      params: { cuentaGmailId, timeMin, timeMax, limit },
    });

    return response.data.data?.events || [];
  } catch (error) {
    console.error(`❌ Error obteniendo próximos eventos:`, error);
    throw error;
  }
};
