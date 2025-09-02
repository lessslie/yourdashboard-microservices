import {
  Modal,
  Button,
  Tag,
  Descriptions,
  Space,
  Typography,
  Divider,
} from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { CalendarEvent } from "@/interfaces/interfacesCalendar";

const { Title, Text, Paragraph } = Typography;

interface EventDetailsModalProps {
  visible: boolean;
  onCancel: () => void;
  event: CalendarEvent | null;
  onEdit: () => void;
  onDelete: () => void;
  loading?: boolean;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  visible,
  onCancel,
  event,
  onEdit,
  onDelete,
  loading = false,
}) => {
  if (!event) return null;

  const extractUrlFromDescription = (description?: string) => {
    if (!description) return { cleanDescription: "", url: "" };

    const urlPattern = /🔗 Enlace del evento: (https?:\/\/[^\s\n]+)/;
    const match = description.match(urlPattern);

    if (match) {
      const url = match[1];
      const cleanDescription = description
        .replace(/\n\n🔗 Enlace del evento: https?:\/\/[^\s\n]+/, "")
        .trim();
      return { cleanDescription, url };
    }

    return { cleanDescription: description, url: "" };
  };

  const formatDate = (date: string) => {
    return dayjs(date).format("DD/MM/YYYY HH:mm");
  };

  const duration = dayjs(event.endTime).diff(
    dayjs(event.startTime),
    "hours",
    true
  );
  const isToday = dayjs(event.startTime).isSame(dayjs(), "day");
  const isPast = dayjs(event.endTime).isBefore(dayjs());

  const { cleanDescription, url } = extractUrlFromDescription(
    event.description
  );

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <CalendarOutlined className="text-blue-500" />
          <Title level={4} className="m-0">
            Detalles del Evento
          </Title>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={600}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cerrar
        </Button>,
        <Button
          key="edit"
          type="default"
          icon={<EditOutlined />}
          onClick={onEdit}
        >
          Editar
        </Button>,
        <Button
          key="delete"
          danger
          icon={<DeleteOutlined />}
          loading={loading}
          onClick={onDelete}
        >
          Eliminar
        </Button>,
      ]}
    >
      <div className="space-y-4">
        {/* Título y estado */}
        <div className="flex items-start justify-between">
          <Title level={3} className="m-0 flex-1">
            {event.summary}
          </Title>
          <div className="flex gap-2">
            {isToday && (
              <Tag color="blue" icon={<CalendarOutlined />}>
                Hoy
              </Tag>
            )}
            {isPast && <Tag color="default">Finalizado</Tag>}
            {event.visibility === "private" && (
              <Tag color="orange">Privado</Tag>
            )}
          </div>
        </div>

        <Divider />

        {/* Información principal */}
        <Descriptions column={1} size="middle">
          <Descriptions.Item
            label={
              <span className="flex items-center gap-2">
                <ClockCircleOutlined />
                Inicio
              </span>
            }
          >
            <Text strong>{formatDate(event.startTime)}</Text>
          </Descriptions.Item>

          <Descriptions.Item
            label={
              <span className="flex items-center gap-2">
                <ClockCircleOutlined />
                Fin
              </span>
            }
          >
            <Text strong>{formatDate(event.endTime)}</Text>
            <Text type="secondary" className="ml-2">
              (Duración: {duration.toFixed(1)}h)
            </Text>
          </Descriptions.Item>

          {event.location && (
            <Descriptions.Item
              label={
                <span className="flex items-center gap-2">
                  <EnvironmentOutlined />
                  Ubicación
                </span>
              }
            >
              {event.location}
            </Descriptions.Item>
          )}

          {url && (
            <Descriptions.Item
              label={
                <span className="flex items-center gap-2">
                  <LinkOutlined />
                  Enlace del evento
                </span>
              }
            >
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 break-all"
              >
                {url}
              </a>
            </Descriptions.Item>
          )}

          {event.htmlLink && (
            <Descriptions.Item
              label={
                <span className="flex items-center gap-2">
                  <CalendarOutlined />
                  Google Calendar
                </span>
              }
            >
              <a
                href={event.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700"
              >
                Abrir en Google Calendar
              </a>
            </Descriptions.Item>
          )}
        </Descriptions>

        {cleanDescription && (
          <div>
            <Title level={5}>Descripción</Title>
            <Paragraph className="bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
              {cleanDescription}
            </Paragraph>
          </div>
        )}

        {/* Asistentes */}
        {event.attendees && event.attendees.length > 0 && (
          <div>
            <Title level={5} className="flex items-center gap-2">
              <UserOutlined />
              Asistentes ({event.attendees.length})
            </Title>
            <div className="flex flex-wrap gap-2">
              {event.attendees.map((attendee, index) => (
                <Tag key={index} icon={<UserOutlined />}>
                  {typeof attendee === "string" ? attendee : attendee.email}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {/* Información adicional */}
        <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
          <div>
            Creado:{" "}
            {event.created
              ? dayjs(event.created).format("DD/MM/YYYY HH:mm")
              : "No disponible"}
          </div>
          <div>
            Última actualización:{" "}
            {event.updated
              ? dayjs(event.updated).format("DD/MM/YYYY HH:mm")
              : "No disponible"}
          </div>
          {event.sourceAccount && <div>Cuenta: {event.sourceAccount}</div>}
          {/* <div className="mt-2 text-xs text-blue-600">
            💡 Puedes arrastrar este evento para moverlo o cambiar su duración
          </div> */}
        </div>
      </div>
    </Modal>
  );
};
