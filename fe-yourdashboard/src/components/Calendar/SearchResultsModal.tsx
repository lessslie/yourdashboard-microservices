import React from "react";
import {
  Modal,
  List,
  Avatar,
  Typography,
  Empty,
  Tag,
  Divider,
  Button,
} from "antd";
import {
  CalendarOutlined,
  EnvironmentOutlined,
  UserOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { CalendarEvent } from "@/interfaces/interfacesCalendar";
import dayjs from "dayjs";

const { Text, Title } = Typography;

interface SearchResultsModalProps {
  visible: boolean;
  onCancel: () => void;
  searchTerm: string;
  results: CalendarEvent[];
  loading: boolean;
  onEventSelect: (event: CalendarEvent) => void;
  showUnified?: boolean;
}

export const SearchResultsModal: React.FC<SearchResultsModalProps> = ({
  visible,
  onCancel,
  searchTerm,
  results,
  loading,
  onEventSelect,
  showUnified = false,
}) => {
  const formatEventDate = (startTime: string, endTime: string) => {
    const start = dayjs(startTime);
    const end = dayjs(endTime);
    const isToday = start.isSame(dayjs(), "day");
    const isTomorrow = start.isSame(dayjs().add(1, "day"), "day");
    const isPast = start.isBefore(dayjs(), "day");

    let dateLabel = "";
    let dateColor = "";

    if (isToday) {
      dateLabel = "Hoy";
      dateColor = "#52c41a";
    } else if (isTomorrow) {
      dateLabel = "Mañana";
      dateColor = "#1890ff";
    } else if (isPast) {
      dateLabel = start.format("DD/MM/YYYY");
      dateColor = "#8c8c8c";
    } else {
      dateLabel = start.format("DD/MM/YYYY");
      dateColor = "#595959";
    }

    const timeRange = `${start.format("HH:mm")} - ${end.format("HH:mm")}`;
    return { dateLabel, timeRange, dateColor, isPast };
  };

  const highlightSearchTerm = (text: string, term: string) => {
    if (!term.trim()) return text;

    const regex = new RegExp(
      `(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark
          key={index}
          style={{
            backgroundColor: "#ffe58f",
            padding: "0 2px",
            borderRadius: "2px",
            fontWeight: 500,
          }}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleEventClick = (event: CalendarEvent) => {
    onEventSelect(event);
    onCancel();
  };

  return (
    <Modal
      title={
        <div className="search-modal-header">
          <SearchOutlined style={{ marginRight: 8, color: "#1890ff" }} />
          Resultados de búsqueda
          {searchTerm && (
            <Text type="secondary" style={{ marginLeft: 8, fontSize: "14px" }}>
              para "{searchTerm}"
            </Text>
          )}
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="close" onClick={onCancel}>
          Cerrar
        </Button>,
      ]}
      width={700}
      style={{ top: 20 }}
      bodyStyle={{ maxHeight: "70vh", overflowY: "auto", padding: "16px" }}
    >
      {results.length > 0 && (
        <div style={{ marginBottom: 16, textAlign: "center" }}>
          <Text type="secondary">{results.length} evento(s) encontrado(s)</Text>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <SearchOutlined
            style={{ fontSize: "24px", color: "#1890ff", marginBottom: 16 }}
          />
          <div>Buscando eventos...</div>
        </div>
      ) : results.length > 0 ? (
        <List
          itemLayout="vertical"
          dataSource={results}
          renderItem={(event, index) => {
            const { dateLabel, timeRange, dateColor, isPast } = formatEventDate(
              event.startTime,
              event.endTime
            );

            return (
              <List.Item
                key={event.id}
                style={{
                  cursor: "pointer",
                  borderRadius: "8px",
                  marginBottom: "12px",
                  padding: "16px",
                  border: "1px solid #f0f0f0",
                  transition: "all 0.2s ease",
                  opacity: isPast ? 0.7 : 1,
                }}
                className="search-result-item"
                onClick={() => handleEventClick(event)}
                actions={[
                  <Button
                    key="view"
                    type="text"
                    icon={<EyeOutlined />}
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEventClick(event);
                    }}
                  >
                    Ver evento
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      icon={<CalendarOutlined />}
                      style={{
                        backgroundColor: isPast ? "#bfbfbf" : "#1890ff",
                        width: 48,
                        height: 48,
                      }}
                    />
                  }
                  title={
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: "16px", fontWeight: 500 }}>
                        {highlightSearchTerm(
                          event.summary || "Sin título",
                          searchTerm
                        )}
                      </span>

                      {isPast && (
                        <Tag color="default" size="small">
                          Pasado
                        </Tag>
                      )}

                      {showUnified && event.sourceAccount && (
                        <Tag color="blue" size="small">
                          {event.sourceAccount}
                        </Tag>
                      )}

                      {event.isPrivate && (
                        <Tag color="orange" size="small">
                          Privado
                        </Tag>
                      )}
                    </div>
                  }
                  description={
                    <div style={{ marginTop: 8 }}>
                      {/* Fecha y hora */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <ClockCircleOutlined
                          style={{
                            marginRight: 6,
                            color: dateColor,
                          }}
                        />
                        <Text style={{ color: dateColor, fontWeight: 500 }}>
                          {dateLabel} • {timeRange}
                        </Text>
                      </div>

                      {/* Ubicación */}
                      {event.location && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom: 6,
                          }}
                        >
                          <EnvironmentOutlined
                            style={{
                              marginRight: 6,
                              color: "#52c41a",
                            }}
                          />
                          <Text type="secondary">
                            {highlightSearchTerm(event.location, searchTerm)}
                          </Text>
                        </div>
                      )}

                      {/* Descripción */}
                      {event.description && (
                        <div
                          style={{
                            marginBottom: 6,
                            paddingLeft: 20,
                            borderLeft: "3px solid #f0f0f0",
                            paddingTop: 4,
                            paddingBottom: 4,
                          }}
                        >
                          <Text type="secondary" style={{ fontSize: "13px" }}>
                            {highlightSearchTerm(
                              event.description.length > 150
                                ? event.description.substring(0, 150) + "..."
                                : event.description,
                              searchTerm
                            )}
                          </Text>
                        </div>
                      )}

                      {/* Asistentes */}
                      {event.attendees && event.attendees.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            marginTop: 8,
                          }}
                        >
                          <UserOutlined
                            style={{
                              marginRight: 6,
                              color: "#722ed1",
                            }}
                          />
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            {event.attendees.length} asistente(s)
                          </Text>
                        </div>
                      )}
                    </div>
                  }
                />

                {/* Divider entre elementos */}
                {index < results.length - 1 && (
                  <Divider style={{ margin: "8px 0 0 0" }} />
                )}
              </List.Item>
            );
          }}
        />
      ) : searchTerm ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <div style={{ marginBottom: 8 }}>
                No se encontraron eventos para "{searchTerm}"
              </div>
              <Text type="secondary" style={{ fontSize: "12px" }}>
                Intenta con otros términos de búsqueda
              </Text>
            </div>
          }
        />
      ) : null}

      <style jsx global>{`
        .search-result-item:hover {
          background-color: #f8f9fa !important;
          border-color: #1890ff !important;
          box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15) !important;
          transform: translateY(-1px);
        }

        .search-modal-header {
          display: flex;
          align-items: center;
          font-size: 16px;
          font-weight: 600;
        }

        .ant-modal-body::-webkit-scrollbar {
          width: 6px;
        }

        .ant-modal-body::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }

        .ant-modal-body::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }

        .ant-modal-body::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </Modal>
  );
};
