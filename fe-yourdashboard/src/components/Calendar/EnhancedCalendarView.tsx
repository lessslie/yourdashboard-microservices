import { useState, useEffect, useCallback, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import { CalendarApi } from "@fullcalendar/core";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useAuthStore } from "@/store/authStore";
import { message, Spin, Typography, Card, Button, Modal, Row, Col } from "antd";
import {
  CalendarViewProps,
  CalendarEvent,
} from "@/interfaces/interfacesCalendar";
import {
  PlusOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { EventModal, EventFormData } from "./EventModal";
import { EventDetailsModal } from "./EventDetailsModal";
import { CalendarSearch } from "./CalendarSearch";

import dayjs from "dayjs";
import { useCalendarData } from "./hooks/useCalendarData";
import { useCalendarEvents } from "./hooks/useCalendarEvents";

const { Title, Text } = Typography;
const { confirm } = Modal;

const EnhancedCalendarView: React.FC<CalendarViewProps> = ({
  accountId,
  showUnified = false,
  height = 600,
  initialView = "timeGridWeek",
  onEventClick,
  onDateSelect,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [eventModalMode, setEventModalMode] = useState<"create" | "edit">(
    "create"
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { userProfile, getActiveGmailAccount } = useAuthStore();
  const calendarRef = useRef<FullCalendar>(null);

  const {
    createEvent,
    updateEvent,
    deleteEvent,
    syncEvents,
    creating,
    updating,
    deleting,
    syncing,
    isLoading: eventsLoading,
  } = useCalendarEvents(accountId);

  const {
    events,
    loading: loadingEvents,
    error,
    total,
    loadEvents,
    searchEvents,
    clearSearch,
    isSearchMode,
    searchResults,
    hasAccount,
    accountInfo,
  } = useCalendarData(accountId, showUnified);

  const activeAccount = accountId
    ? userProfile?.cuentas_gmail?.find((acc) => acc.id.toString() === accountId)
    : getActiveGmailAccount();

  const autoRefreshEvents = useCallback(async () => {
    console.log("🔄 Auto-refreshing events after operation...");
    await new Promise((resolve) => setTimeout(resolve, 500));
    await refreshEvents();
  }, []);

  const convertToCalendarEvent = (clickInfo: any): CalendarEvent => {
    return {
      id: clickInfo.event.id,
      summary: clickInfo.event.title,
      description: clickInfo.event.extendedProps.description,
      location: clickInfo.event.extendedProps.location,
      startTime: clickInfo.event.start?.toISOString() || "",
      endTime: clickInfo.event.end?.toISOString() || "",
      attendees: clickInfo.event.extendedProps.attendees,
      sourceAccount: clickInfo.event.extendedProps.sourceAccount,
      sourceAccountId: clickInfo.event.extendedProps.sourceAccountId,
      isPrivate: clickInfo.event.extendedProps.isPrivate,
      htmlLink: clickInfo.event.extendedProps.htmlLink,
      created: clickInfo.event.extendedProps.created,
      updated: clickInfo.event.extendedProps.updated,
      status: clickInfo.event.extendedProps.status,
      visibility: clickInfo.event.extendedProps.visibility,
      isAllDay: clickInfo.event.allDay,
    };
  };

  const handleEventClick = (clickInfo: any) => {
    const event = convertToCalendarEvent(clickInfo);
    setSelectedEvent(event);
    setDetailsModalVisible(true);

    if (onEventClick) {
      onEventClick(event);
    }
  };

  const handleSearchEventSelect = useCallback(
    (event: CalendarEvent) => {
      console.log("🎯 Evento seleccionado desde búsqueda:", event);
      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi && event.startTime) {
        const eventDate = new Date(event.startTime);
        calendarApi.gotoDate(eventDate);
        calendarApi.changeView("timeGridDay", eventDate);
        setSelectedEvent(event);
        setDetailsModalVisible(true);
        setTimeout(() => {
          const eventEl = document.querySelector(
            `[data-event-id="${event.id}"]`
          );
          if (eventEl) {
            eventEl.scrollIntoView({ behavior: "smooth", block: "center" });
            eventEl.classList.add("event-highlight");
            setTimeout(() => {
              eventEl.classList.remove("event-highlight");
            }, 2000);
          }
        }, 100);
      }
      clearSearch();
    },
    [clearSearch]
  );

  const handleDateSelect = (selectInfo: any) => {
    const startDate = selectInfo.start;
    setSelectedDate(startDate);
    setEventModalMode("create");
    setSelectedEvent(null);
    setEventModalVisible(true);
    if (onDateSelect) {
      onDateSelect(startDate);
    }
  };

  useEffect(() => {
    if (hasAccount) {
      const now = dayjs();
      const startDate = now.subtract(1, "month").startOf("month").toISOString();
      const endDate = now.add(2, "months").endOf("month").toISOString();
      loadEvents(startDate, endDate);
    }
  }, [hasAccount, loadEvents]);

  const handleEventDrop = async (dropInfo: any) => {
    if (!activeAccount) {
      message.error("No hay cuenta activa para mover eventos");
      dropInfo.revert();
      return;
    }
    const event = dropInfo.event;
    try {
      await updateEvent(event.id, {
        startDateTime: event.start.toISOString(),
        endDateTime: event.end.toISOString(),
      });
      message.success("Evento movido exitosamente");
      setTimeout(() => autoRefreshEvents(), 300);
    } catch (error) {
      message.error("Error al mover el evento");
      dropInfo.revert();
    }
  };

  const handleEventResize = async (resizeInfo: any) => {
    if (!activeAccount) {
      message.error("No hay cuenta activa para redimensionar eventos");
      resizeInfo.revert();
      return;
    }
    const event = resizeInfo.event;
    try {
      await updateEvent(event.id, {
        startDateTime: event.start.toISOString(),
        endDateTime: event.end.toISOString(),
      });
      message.success("Duración del evento actualizada");
      setTimeout(() => autoRefreshEvents(), 300);
    } catch (error) {
      message.error("Error al cambiar la duración del evento");
      resizeInfo.revert();
    }
  };

  const handleCreateEvent = async (
    eventData: EventFormData,
    isPrivate: boolean
  ) => {
    const newEvent = await createEvent(
      {
        ...eventData,
      },
      isPrivate
    );
    if (newEvent) {
      setEventModalVisible(false);
      message.success("Evento creado exitosamente");
      setTimeout(() => autoRefreshEvents(), 500);
    }
  };

  const handleUpdateEvent = async (
    eventData: EventFormData,
    isPrivate: boolean
  ) => {
    if (!selectedEvent) return;
    const updatedEvent = await updateEvent(selectedEvent.id, {
      ...eventData,
    });
    if (updatedEvent) {
      setEventModalVisible(false);
      setDetailsModalVisible(false);
      setSelectedEvent(null);
      message.success("Evento actualizado exitosamente");
      setTimeout(() => autoRefreshEvents(), 500);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    confirm({
      title: "¿Eliminar evento?",
      icon: <ExclamationCircleOutlined />,
      content: `¿Estás seguro de que quieres eliminar el evento "${selectedEvent.summary}"?`,
      okText: "Sí, eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      onOk: async () => {
        const success = await deleteEvent(selectedEvent.id);
        if (success) {
          setDetailsModalVisible(false);
          setSelectedEvent(null);
          message.success("Evento eliminado exitosamente");
          setTimeout(() => autoRefreshEvents(), 500);
        }
      },
    });
  };

  const handleEditEvent = () => {
    setDetailsModalVisible(false);
    setEventModalMode("edit");
    setEventModalVisible(true);
  };

  const refreshEvents = async () => {
    setRefreshing(true);
    try {
      if (hasAccount) {
        const now = dayjs();
        const startDate = now
          .subtract(1, "month")
          .startOf("month")
          .toISOString();
        const endDate = now.add(2, "months").endOf("month").toISOString();
        await loadEvents(startDate, endDate);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const getAccountInfo = () => {
    if (showUnified) {
      return `Eventos de todas las cuentas (${
        userProfile?.cuentas_gmail?.length || 0
      } conectadas)`;
    }
    return activeAccount
      ? `Calendario de: ${activeAccount.email_gmail}`
      : "No hay cuenta seleccionada";
  };

  const calendarEvents = events.map((event) => ({
    id: event.id,
    title: event.summary,
    start: event.startTime,
    end: event.endTime,
    allDay: event.isAllDay,
    extendedProps: { ...event },
    backgroundColor: event.isPrivate ? "#FAAD14" : "#1890ff",
    borderColor: event.isPrivate ? "#FAAD14" : "#1890ff",
  }));

  return (
    <>
      <Card className="calendar-container">
        <div className="mb-4 flex justify-between items-center flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <Title level={4} className="mb-1">
              📅 Calendario Interactivo
            </Title>
            <Text type="secondary">{getAccountInfo()}</Text>
            {isSearchMode && (
              <div className="mt-2">
                <Text type="success">
                  <SearchOutlined /> Mostrando {events.length} resultado(s) de
                  búsqueda
                </Text>
                <Button
                  type="link"
                  size="small"
                  onClick={clearSearch}
                  style={{ padding: "0 8px" }}
                >
                  Ver todos los eventos
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Button
              icon={<ReloadOutlined />}
              onClick={refreshEvents}
              loading={refreshing || syncing}
              disabled={loadingEvents}
            >
              {refreshing ? "Actualizando..." : "Actualizar"}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={!activeAccount && !showUnified}
              onClick={() => {
                setEventModalMode("create");
                setSelectedEvent(null);
                setSelectedDate(new Date());
                setEventModalVisible(true);
              }}
            >
              Nuevo Evento
            </Button>
          </div>
        </div>
        <div className="mb-4">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={24} md={16} lg={18} xl={20}>
              <CalendarSearch
                accountId={accountId}
                showUnified={showUnified}
                onEventSelect={handleSearchEventSelect}
                placeholder="Buscar eventos..."
                className="calendar-search-bar"
              />
            </Col>
          </Row>
        </div>
        {loadingEvents && !refreshing && (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <Spin size="large" />
              <p className="mt-2 text-gray-500">
                {isSearchMode ? "Buscando eventos..." : "Cargando eventos..."}
              </p>
            </div>
          </div>
        )}
        {error && (
          <div className="text-center text-red-500 mb-4">
            <p>Error: {error}</p>
            <Button onClick={refreshEvents} type="primary" ghost>
              Reintentar
            </Button>
          </div>
        )}
        <div
          style={{ display: loadingEvents && !refreshing ? "none" : "block" }}
        >
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
            initialView={initialView}
            height={height}
            events={calendarEvents}
            eventClick={handleEventClick}
            select={handleDateSelect}
            selectable={true}
            editable={true}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            buttonText={{
              today: "Hoy",
              month: "Mes",
              week: "Semana",
              day: "Día",
            }}
            locale="es"
          />
        </div>
      </Card>

      <style jsx global>{`
        .fc {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            "Helvetica Neue", Arial, "Noto Sans", sans-serif,
            "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol",
            "Noto Color Emoji";
        }
        .fc .fc-toolbar.fc-header-toolbar {
          margin-bottom: 1.5em;
        }
        .fc .fc-toolbar-title {
          font-size: 1.75em;
          font-weight: 600;
          color: #262626;
        }
        .fc .fc-button {
          background-color: #fff;
          border: 1px solid #d9d9d9;
          color: #595959;
          transition: all 0.2s;
        }
        .fc .fc-button:hover {
          border-color: #1890ff;
          color: #1890ff;
        }
        .fc .fc-button-primary {
          background-color: #1890ff;
          border-color: #1890ff;
          color: #fff;
        }
        .fc .fc-button-primary:not(:disabled):active {
          background-color: #096dd9;
          border-color: #096dd9;
        }
        .fc .fc-daygrid-day.fc-day-today {
          background-color: #e6f7ff;
        }
        .fc .fc-event {
          border-radius: 4px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          font-size: 0.85em;
          padding: 2px 5px;
          cursor: pointer;
        }
        .fc-v-event {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .fc-event:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: translateY(-1px);
        }
        .event-highlight {
          animation: highlightPulse 2s ease-in-out;
          box-shadow: 0 0 20px rgba(24, 144, 255, 0.6) !important;
        }
        @keyframes highlightPulse {
          0%,
          100% {
            box-shadow: 0 0 10px rgba(24, 144, 255, 0.5);
          }
          50% {
            box-shadow: 0 0 25px rgba(24, 144, 255, 0.8);
          }
        }
        .fc .fc-daygrid-day-number {
          padding: 0.5em;
        }
        .fc .fc-timegrid-slot-label-frame {
          text-align: center;
        }
      `}</style>

      <EventModal
        visible={eventModalVisible}
        onCancel={() => setEventModalVisible(false)}
        onSubmit={
          eventModalMode === "create" ? handleCreateEvent : handleUpdateEvent
        }
        event={selectedEvent}
        mode={eventModalMode}
        loading={creating || updating}
      />
      <EventDetailsModal
        visible={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        event={selectedEvent}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
        loading={deleting}
      />
    </>
  );
};

export default EnhancedCalendarView;
