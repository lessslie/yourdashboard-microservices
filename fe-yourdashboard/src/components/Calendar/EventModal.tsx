import { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Switch,
  Button,
  Select,
  Space,
  Divider,
  Typography,
} from "antd";
import {
  UserAddOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  EditOutlined,
  LinkOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { CalendarEvent } from "@/interfaces/interfacesCalendar";

const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { Title } = Typography;

export interface EventFormData {
  summary: string;
  location?: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  attendees?: string[];
  url?: string;
}

interface EventModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (data: EventFormData, isPrivate: boolean) => Promise<void>;
  event?: CalendarEvent | null;
  mode: "create" | "edit";
  loading?: boolean;
}

export const EventModal: React.FC<EventModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  event,
  mode,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const [isPrivate, setIsPrivate] = useState(false);
  const [attendeesInput, setAttendeesInput] = useState<string[]>([]);

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

  const combineDescriptionWithUrl = (description: string, url: string) => {
    const cleanDescription = description.trim();
    if (!url.trim()) return cleanDescription;

    if (cleanDescription) {
      return `${cleanDescription}\n\n🔗 Enlace del evento: ${url.trim()}`;
    } else {
      return `🔗 Enlace del evento: ${url.trim()}`;
    }
  };

  useEffect(() => {
    if (visible && event && mode === "edit") {
      const { cleanDescription, url } = extractUrlFromDescription(
        event.description
      );

      form.setFieldsValue({
        summary: event.summary,
        location: event.location,
        description: cleanDescription,
        dateRange: [dayjs(event.startTime), dayjs(event.endTime)],
        url: url,
      });
      setAttendeesInput(event.attendees?.map((a) => a.email || a) || []);
      setIsPrivate(event.visibility === "private");
    } else if (visible && mode === "create") {
      form.resetFields();
      setAttendeesInput([]);
      setIsPrivate(false);
    }
  }, [visible, event, mode, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const [startDate, endDate] = values.dateRange;

      const finalDescription = combineDescriptionWithUrl(
        values.description || "",
        values.url || ""
      );

      const eventData: EventFormData = {
        summary: values.summary,
        location: values.location,
        description: finalDescription,
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
        attendees: attendeesInput.filter((email) => email.trim() !== ""),
      };

      await onSubmit(eventData, isPrivate);

      form.resetFields();
      setAttendeesInput([]);
      setIsPrivate(false);
    } catch (error) {
      console.error("Error en validación:", error);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          {mode === "create" ? (
            <>
              <CalendarOutlined className="text-blue-500" />
              <Title level={4} className="m-0">
                Crear Nuevo Evento
              </Title>
            </>
          ) : (
            <>
              <EditOutlined className="text-green-500" />
              <Title level={4} className="m-0">
                Editar Evento
              </Title>
            </>
          )}
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={600}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancelar
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
          icon={mode === "create" ? <CalendarOutlined /> : <EditOutlined />}
        >
          {mode === "create" ? "Crear Evento" : "Actualizar Evento"}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="summary"
          label={
            <span className="flex items-center gap-2">
              <FileTextOutlined />
              Título del evento
            </span>
          }
          rules={[
            { required: true, message: "El título es obligatorio" },
            { min: 3, message: "El título debe tener al menos 3 caracteres" },
          ]}
        >
          <Input
            placeholder="Ej: Reunión de equipo - Sprint Planning"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="dateRange"
          label={
            <span className="flex items-center gap-2">
              <ClockCircleOutlined />
              Fecha y hora
            </span>
          }
          rules={[{ required: true, message: "Selecciona fecha y hora" }]}
        >
          <RangePicker
            showTime={{ format: "HH:mm" }}
            format="DD/MM/YYYY HH:mm"
            placeholder={["Inicio", "Fin"]}
            size="large"
            className="w-full"
          />
        </Form.Item>

        <Form.Item
          name="location"
          label={<span className="flex items-center gap-2">📍 Ubicación</span>}
        >
          <Input
            placeholder="Ej: Sala de Juntas 2, Zoom, Google Meet..."
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="url"
          label={
            <span className="flex items-center gap-2">
              <LinkOutlined />
              URL del evento (se incluirá en la descripción)
            </span>
          }
        >
          <Input placeholder="https://meet.google.com/xyz..." size="large" />
        </Form.Item>

        <Form.Item name="description" label="Descripción">
          <TextArea
            placeholder="Detalles del evento, agenda, notas..."
            rows={3}
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Divider />

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium">Evento privado</div>
              <div className="text-sm text-gray-500">
                Solo tú podrás ver los detalles del evento
              </div>
            </div>
            <Switch
              checked={isPrivate}
              onChange={setIsPrivate}
              checkedChildren="Privado"
              unCheckedChildren="Público"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <UserAddOutlined />
              <span className="font-medium">Invitar asistentes</span>
            </div>

            <Select
              mode="tags"
              placeholder="Escribe emails y presiona Enter"
              value={attendeesInput}
              onChange={setAttendeesInput}
              style={{ width: "100%" }}
              tokenSeparators={[","]}
              notFoundContent="Escribe un email válido"
            />

            {attendeesInput.length > 0 && (
              <div className="text-sm text-gray-500">
                Se enviará invitación a {attendeesInput.length} persona(s)
              </div>
            )}
          </div>
        </div>
      </Form>
    </Modal>
  );
};
