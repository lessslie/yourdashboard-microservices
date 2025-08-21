import React from "react";
import { Modal, Tabs, List, Empty, Tag, Spin, Typography, Button } from "antd";
import {
  MailOutlined,
  CalendarOutlined,
  MessageOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  IGlobalSearchResponse,
  IGlobalSearchData,
} from "@/interfaces/interfacesSearch";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { useRouter } from "next/navigation";
dayjs.locale("es");

const { TabPane } = Tabs;
const { Text, Paragraph } = Typography;

interface GlobalSearchResultsModalProps {
  visible: boolean;
  loading: boolean;
  searchTerm: string;
  results: IGlobalSearchResponse | null;
  onCancel: () => void;
}

const GlobalSearchResultsModal: React.FC<GlobalSearchResultsModalProps> = ({
  visible,
  loading,
  searchTerm,
  results,
  onCancel,
}) => {
  const router = useRouter();
  const renderEmailItem = (item: any) => (
    <List.Item>
      <List.Item.Meta
        title={<Text>{item.subject}</Text>}
        description={
          <>
            <Paragraph
              ellipsis={{ rows: 2 }}
            >{`De: ${item.fromName} <${item.fromEmail}>`}</Paragraph>
            <Text type="secondary">
              {dayjs(item.receivedDate).format("DD MMMM YYYY, HH:mm")}
            </Text>
            <Button
              type="link"
              onClick={() => {
                router.push(`/dashboard/email/${item.id}`);
              }}
            >
              Ver correo
            </Button>
          </>
        }
      />
    </List.Item>
  );

  const renderCalendarItem = (item: any) => (
    <List.Item>
      <List.Item.Meta
        title={<Text>{item.summary}</Text>}
        description={
          <>
            <Paragraph ellipsis={{ rows: 2 }}>
              {item.description || "Sin descripción"}
            </Paragraph>
            <Text type="secondary">
              {dayjs(item.startTime).format("DD MMM, HH:mm")} -{" "}
              {dayjs(item.endTime).format("HH:mm")}
            </Text>
          </>
        }
      />
    </List.Item>
  );

  const renderWhatsappItem = (item: any) => (
    <List.Item>
      <List.Item.Meta
        title={<Text>Mensaje de: {item.from}</Text>}
        description={
          <>
            <Paragraph ellipsis={{ rows: 2 }}>{item.body}</Paragraph>
            <Text type="secondary">
              {dayjs.unix(item.timestamp).format("DD MMMM YYYY, HH:mm")}
            </Text>
          </>
        }
      />
    </List.Item>
  );

  const renderTabContent = (
    key: keyof IGlobalSearchData,
    renderItem: (item: any) => React.ReactNode
  ) => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Spin />
        </div>
      );
    }

    const data = results?.data[key];

    if (!data || data.total === 0) {
      return (
        <Empty
          description={`No se encontraron resultados de ${key} para "${searchTerm}"`}
        />
      );
    }

    return (
      <List
        dataSource={data.results}
        renderItem={renderItem}
        pagination={{
          pageSize: 5,
          total: data.total,
          showSizeChanger: false,
        }}
      />
    );
  };

  return (
    <Modal
      title={
        <div className="flex items-center">
          <SearchOutlined className="mr-2" />
          Resultados de la búsqueda para "{searchTerm}"
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      bodyStyle={{ minHeight: "50vh" }}
    >
      {loading ? (
        <div className="flex justify-center items-center h-full">
          <Spin size="large" />
        </div>
      ) : (
        <Tabs defaultActiveKey="emails">
          <TabPane
            tab={
              <span>
                <MailOutlined />
                Emails{" "}
                <Tag color="blue">
                  {results?.summary.resultsPerSource.emails || 0}
                </Tag>
              </span>
            }
            key="emails"
          >
            {renderTabContent("emails", renderEmailItem)}
          </TabPane>
          <TabPane
            tab={
              <span>
                <CalendarOutlined />
                Calendario{" "}
                <Tag color="green">
                  {results?.summary.resultsPerSource.calendar || 0}
                </Tag>
              </span>
            }
            key="calendar"
          >
            {renderTabContent("calendar", renderCalendarItem)}
          </TabPane>
          <TabPane
            tab={
              <span>
                <MessageOutlined />
                WhatsApp{" "}
                <Tag color="purple">
                  {results?.summary.resultsPerSource.whatsapp || 0}
                </Tag>
              </span>
            }
            key="whatsapp"
          >
            {renderTabContent("whatsapp", renderWhatsappItem)}
          </TabPane>
        </Tabs>
      )}
    </Modal>
  );
};

export default GlobalSearchResultsModal;
