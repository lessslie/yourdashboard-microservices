import { useState, useCallback } from "react";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  syncCalendarEvents,
} from "@/services/calendar/calendarService";
import {
  CreateEventDto,
  UpdateEventDto,
} from "@/interfaces/interfacesCalendar";
import { message } from "antd";

export const useCalendarEvents = (accountId?: string) => {
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const syncEvents = useCallback(
    async (maxEvents = 100) => {
      if (!accountId) {
        console.warn("Se requiere una cuenta activa para sincronizar eventos");
        return null;
      }

      setSyncing(true);
      try {
        console.log("🔄 Sincronizando eventos...");
        const result = await syncCalendarEvents(accountId, maxEvents);
        console.log("✅ Eventos sincronizados:", result);
        return result;
      } catch (error) {
        console.error("❌ Error sincronizando eventos:", error);

        return null;
      } finally {
        setSyncing(false);
      }
    },
    [accountId]
  );

  const createEvent = async (eventData: CreateEventDto, isPrivate = false) => {
    if (!accountId) {
      message.error("Se requiere una cuenta activa para crear eventos");
      return null;
    }

    setCreating(true);
    try {
      console.log("🔄 Creando evento:", eventData);
      const newEvent = await createCalendarEvent(
        accountId,
        eventData,
        isPrivate
      );
      console.log("✅ Evento creado exitosamente.");

      await syncEvents();
      message.success("Evento creado y sincronizado.");

      return newEvent;
    } catch (error) {
      console.error("❌ Error creando evento:", error);
      message.error("Error al crear el evento");
      return null;
    } finally {
      setCreating(false);
    }
  };

  const updateEvent = async (eventId: string, eventData: UpdateEventDto) => {
    if (!accountId) {
      message.error("Se requiere una cuenta activa para actualizar eventos");
      return null;
    }

    setUpdating(true);
    try {
      console.log("🔄 Actualizando evento:", eventId, eventData);
      const updatedEvent = await updateCalendarEvent(
        eventId,
        accountId,
        eventData
      );
      console.log("✅ Evento actualizado exitosamente.");

      await syncEvents();
      message.success("Evento actualizado y sincronizado.");

      return updatedEvent;
    } catch (error) {
      console.error("❌ Error actualizando evento:", error);
      message.error("Error al actualizar el evento");
      return null;
    } finally {
      setUpdating(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!accountId) {
      message.error("Se requiere una cuenta activa para eliminar eventos");
      return false;
    }

    setDeleting(true);
    try {
      console.log("🔄 Eliminando evento:", eventId);
      await deleteCalendarEvent(eventId, accountId);
      console.log("✅ Evento eliminado exitosamente.");

      await syncEvents();
      message.success("Evento eliminado y sincronizado.");

      return true;
    } catch (error) {
      console.error("❌ Error eliminando evento:", error);
      message.error("Error al eliminar el evento");
      return false;
    } finally {
      setDeleting(false);
    }
  };

  return {
    createEvent,
    updateEvent,
    deleteEvent,
    syncEvents,
    creating,
    updating,
    deleting,
    syncing,

    isLoading: creating || updating || deleting || syncing,
  };
};
