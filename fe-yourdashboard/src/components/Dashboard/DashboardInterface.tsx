"use client";

import React, { useState, useEffect } from "react";
import { Card, Button, Avatar, Typography, Row, Col } from "antd";
import {
  MailOutlined,
  CalendarOutlined,
  MessageOutlined,
  UserOutlined,
  //   ClockCircleOutlined,
} from "@ant-design/icons";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { connectGoogleCalendar } from "@/services/calendar/calendarService";
import { handleConnectService } from "@/services/emails/emails";
import { getEmails } from "@/services/emails/emails";
import { getUpcomingEvents } from "@/services/calendar/calendarService";

const { Title, Text } = Typography;

// Componente para notificaciones de éxito (no esta funcionando aun, solo es un diseño)
const SuccessNotification = ({
  type,
  onClose,
}: {
  type: string;
  onClose: () => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getNotificationText = (type: string) => {
    switch (type) {
      case "email":
        return {
          title: "¡Correo vinculado con éxito!",
          description: "El correo ha sido vinculado de manera exitosa.",
        };
      case "calendar":
        return {
          title: "¡Calendario vinculado con éxito!",
          description: "El calendario ha sido vinculado de manera exitosa.",
        };
      case "whatsapp":
        return {
          title: "¡Whatsapp vinculado con éxito!",
          description: "El whatsapp ha sido vinculado de manera exitosa.",
        };
      default:
        return {
          title: "¡Vinculado con éxito!",
          description: "El servicio ha sido vinculado de manera exitosa.",
        };
    }
  };

  const notificationText = getNotificationText(type);

  return (
    <div className="success-notification">
      <div className="notification-content">
        <Image
          src="/check.png"
          alt="Success"
          width={20}
          height={20}
          style={{ marginRight: "12px" }}
        />
        <div className="notification-text">
          <div className="notification-title">{notificationText.title}</div>
          <div className="notification-description">
            {notificationText.description}
          </div>
        </div>
        <button className="notification-close" onClick={onClose}>
          ×
        </button>
      </div>

      <style jsx>{`
        .success-notification {
          position: fixed;
          top: 100px;
          right: 20px;
          z-index: 1000;
          animation: slideInRight 0.3s ease-out;
        }

        .notification-content {
          background: #deffdf;
          box-shadow: 0px 0px 15px 0px #63ff68;
          border-radius: 8px;
          padding: 16px;
          display: flex;
          align-items: center;
          min-width: 300px;
          font-family: "Montserrat", sans-serif;
        }

        .notification-text {
          flex: 1;
        }

        .notification-title {
          font-weight: 600;
          font-size: 14px;
          color: #2d5a2d;
          margin-bottom: 4px;
        }

        .notification-description {
          font-size: 12px;
          color: #4a6b4a;
        }

        .notification-close {
          background: none;
          border: none;
          font-size: 20px;
          color: #4a6b4a;
          cursor: pointer;
          margin-left: 12px;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notification-close:hover {
          color: #2d5a2d;
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .success-notification {
            right: 10px;
            top: 90px;
          }

          .notification-content {
            min-width: 280px;
          }
        }
      `}</style>
    </div>
  );
};

// Componente para la card de Email
const EmailCard = ({
  userProfile,
  onConnect,
}: {
  userProfile: any;
  onConnect: () => void;
}) => {
  const router = useRouter();
  const [recentEmails, setRecentEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const hasEmailAccounts =
    userProfile?.cuentas_gmail && userProfile.cuentas_gmail.length > 0;

  useEffect(() => {
    if (hasEmailAccounts) {
      loadRecentEmails();
    }
  }, [hasEmailAccounts, userProfile]);

  const loadRecentEmails = async () => {
    if (!userProfile?.cuentas_gmail || userProfile.cuentas_gmail.length === 0)
      return;

    setLoading(true);
    try {
      const firstAccount = userProfile.cuentas_gmail[0];
      const { accessToken } = useAuthStore.getState();

      if (accessToken) {
        const emailsResponse = await getEmails(
          accessToken,
          firstAccount.id.toString(),
          1,
          2
        );
        if (emailsResponse?.data?.emails) {
          setRecentEmails(emailsResponse.data.emails.slice(0, 2));
        }
      }
    } catch (error) {
      console.error("Error loading recent emails:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      await handleConnectService(accessToken);
      onConnect();
    }
  };

  const handleCardClick = () => {
    if (hasEmailAccounts) {
      router.push("/dashboard/email");
    }
  };

  if (!hasEmailAccounts) {
    return (
      <Card
        className="dashboard-card disconnected"
        style={{ height: "300px", cursor: "default" }}
      >
        <div className="card-content">
          <div className="card-header">
            <MailOutlined className="card-icon" />
            <div>
              <Title
                level={4}
                style={{ margin: 0, fontFamily: "Montserrat, sans-serif" }}
              >
                Correo electrónico
              </Title>
              <Text
                style={{ color: "#666", fontFamily: "Montserrat, sans-serif" }}
              >
                Gestiona tus correos electrónicos y cuentas vinculadas
              </Text>
            </div>
          </div>

          <div
            style={{
              justifyContent: "center",
              alignItems: "center",
              display: "flex",
              marginTop: "auto",
              paddingTop: "20px",
            }}
          >
            <Button
              type="primary"
              onClick={handleConnect}
              style={{
                backgroundColor: "#344BFF",
                borderColor: "#344BFF",
                fontFamily: "Montserrat, sans-serif",
                fontSize: "16px",
                fontWeight: 700,
                fontStyle: "bold",
                borderRadius: "6px",
              }}
            >
              Vincular correo
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className="dashboard-card connected"
      style={{ height: "300px", cursor: "pointer" }}
      onClick={handleCardClick}
    >
      <div className="card-content">
        <div className="card-header">
          <MailOutlined className="card-icon connected" />
          <div>
            <Title
              level={4}
              style={{ margin: 0, fontFamily: "Montserrat, sans-serif" }}
            >
              Correo electrónico
            </Title>
            <Text
              style={{ color: "#666", fontFamily: "Montserrat, sans-serif" }}
            >
              Gestiona tus correos electrónicos y cuentas vinculadas
            </Text>
          </div>
        </div>

        <div className="recent-items">
          {loading ? (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <Text
                style={{ color: "#999", fontFamily: "Montserrat, sans-serif" }}
              >
                Cargando emails...
              </Text>
            </div>
          ) : recentEmails.length > 0 ? (
            recentEmails.map((email, index) => (
              <div key={index} className="recent-item">
                <div className="item-meta">
                  <Text
                    style={{
                      fontSize: "12px",
                      color: "#999",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    Remitente • Destinatario
                  </Text>
                </div>
                <Title
                  level={5}
                  style={{
                    margin: "4px 0",
                    fontFamily: "Montserrat, sans-serif",
                    color: "#1F4788",
                  }}
                >
                  {email.subject || "Sin título"}
                </Title>
              </div>
            ))
          ) : (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <Text
                style={{ color: "#999", fontFamily: "Montserrat, sans-serif" }}
              >
                No hay emails recientes
              </Text>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

// Componente para la card de Calendario
const CalendarCard = ({
  userProfile,
  onConnect,
}: {
  userProfile: any;
  onConnect: () => void;
}) => {
  const router = useRouter();
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const hasCalendarAccounts =
    userProfile?.cuentas_gmail && userProfile.cuentas_gmail.length > 0;

  useEffect(() => {
    if (hasCalendarAccounts) {
      loadUpcomingEvents();
    }
  }, [hasCalendarAccounts, userProfile]);

  const loadUpcomingEvents = async () => {
    if (!userProfile?.cuentas_gmail || userProfile.cuentas_gmail.length === 0)
      return;

    setLoading(true);
    try {
      const firstAccount = userProfile.cuentas_gmail[0];
      const events = await getUpcomingEvents(firstAccount.id.toString(), 7, 2);
      setUpcomingEvents(events || []);
    } catch (error) {
      console.error("Error loading upcoming events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    await connectGoogleCalendar();
    onConnect();
  };

  const handleCardClick = () => {
    if (hasCalendarAccounts) {
      router.push("/dashboard/calendar");
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Hoy";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Mañana";
    } else {
      return date.toLocaleDateString("es-ES", {
        month: "long",
        day: "numeric",
      });
    }
  };

  const formatEventTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  if (!hasCalendarAccounts) {
    return (
      <Card
        className="dashboard-card disconnected"
        style={{ height: "300px", cursor: "default" }}
      >
        <div
          className="card-content"
          style={{
            display: "flex",
          }}
        >
          <div className="card-header">
            <CalendarOutlined className="card-icon" />
            <div>
              <Title
                level={4}
                style={{ margin: 0, fontFamily: "Montserrat, sans-serif" }}
              >
                Calendario
              </Title>
              <Text
                style={{ color: "#666", fontFamily: "Montserrat, sans-serif" }}
              >
                Organiza tus eventos, reuniones y recordatorios.
              </Text>
            </div>
          </div>

          <div
            style={{
              justifyContent: "center",
              alignItems: "center",
              display: "flex",
              marginTop: "auto",
              paddingTop: "20px",
            }}
          >
            <Button
              type="primary"
              onClick={handleConnect}
              style={{
                backgroundColor: "#344BFF",
                borderColor: "#344BFF",
                fontFamily: "Montserrat, sans-serif",
                fontSize: "16px",
                fontWeight: 700,
                fontStyle: "bold",
                borderRadius: "6px",
              }}
            >
              Vincular calendario
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className="dashboard-card connected"
      style={{ height: "300px", cursor: "pointer" }}
      onClick={handleCardClick}
    >
      <div className="card-content">
        <div className="card-header">
          <CalendarOutlined className="card-icon connected" />
          <div>
            <Title
              level={4}
              style={{ margin: 0, fontFamily: "Montserrat, sans-serif" }}
            >
              Calendario
            </Title>
            <Text
              style={{ color: "#666", fontFamily: "Montserrat, sans-serif" }}
            >
              Organiza tus eventos, reuniones y recordatorios.
            </Text>
          </div>
        </div>

        <div className="recent-items">
          {loading ? (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <Text
                style={{ color: "#999", fontFamily: "Montserrat, sans-serif" }}
              >
                Cargando eventos...
              </Text>
            </div>
          ) : upcomingEvents.length > 0 ? (
            upcomingEvents.map((event, index) => (
              <div key={index} className="recent-item">
                <div className="event-date-section">
                  <Text
                    style={{
                      fontSize: "12px",
                      color: "#344BFF",
                      fontFamily: "Montserrat, sans-serif",
                      fontWeight: "600",
                    }}
                  >
                    {formatEventDate(event.startTime)}
                  </Text>
                  <Text
                    style={{
                      fontSize: "12px",
                      color: "#999",
                      fontFamily: "Montserrat, sans-serif",
                      marginLeft: "8px",
                    }}
                  >
                    {formatEventTime(event.startTime)}
                  </Text>
                </div>
                <Title
                  level={5}
                  style={{
                    margin: "4px 0",
                    fontFamily: "Montserrat, sans-serif",
                    color: "#1F4788",
                  }}
                >
                  {event.summary || "Sin título"}
                </Title>
              </div>
            ))
          ) : (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <Text
                style={{ color: "#999", fontFamily: "Montserrat, sans-serif" }}
              >
                No hay eventos próximos
              </Text>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

// Componente para la card de WhatsApp
const WhatsAppCard = ({ onConnect }: { onConnect: () => void }) => {
  const router = useRouter();

  const handleConnect = () => {
    onConnect();
  };

  //!!! Sin funcionalidad por ahora
  const handleCardClick = () => {
    router.push("/dashboard/whatsapp");
  };

  return (
    <Card
      className="dashboard-card disconnected"
      style={{ height: "300px", cursor: "default" }}
    >
      <div className="card-content">
        <div className="card-header">
          <MessageOutlined className="card-icon" />
          <div>
            <Title
              level={4}
              style={{ margin: 0, fontFamily: "Montserrat, sans-serif" }}
            >
              Whatsapp
            </Title>
            <Text
              style={{ color: "#666", fontFamily: "Montserrat, sans-serif" }}
            >
              Conecta y responde tus chats de whatsapp directamente.
            </Text>
          </div>
        </div>

        <div
          style={{
            justifyContent: "center",
            alignItems: "center",
            display: "flex",
            marginTop: "auto",
            paddingTop: "20px",
          }}
        >
          <Button
            type="primary"
            onClick={handleConnect}
            style={{
              backgroundColor: "#344BFF",
              borderColor: "#344BFF",
              fontFamily: "Montserrat, sans-serif",
              fontSize: "16px",
              fontWeight: 700,
              fontStyle: "bold",
              borderRadius: "6px",
            }}
          >
            Vincular whatsapp
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Componente principal del Dashboard
const DashboardInterface = () => {
  const { userProfile } = useAuthStore();
  const [notifications, setNotifications] = useState<string[]>([]);

  const showNotification = (type: string) => {
    setNotifications((prev) => [...prev, type]);
  };

  const removeNotification = (type: string) => {
    setNotifications((prev) => prev.filter((n) => n !== type));
  };

  const hasConnectedAccounts =
    userProfile?.cuentas_gmail && userProfile.cuentas_gmail.length > 0;

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap");

        .dashboard-card {
          border-radius: 12px !important;
          border: 1px solid #e8e8e8 !important;
          transition: all 0.3s ease !important;
          font-family: "Montserrat", sans-serif !important;
        }

        .dashboard-card.connected:hover {
          border-color: #344bff !important;
          box-shadow: 0 4px 20px rgba(52, 75, 255, 0.1) !important;
          transform: translateY(-2px) !important;
        }

        .dashboard-card .card-content {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .dashboard-card .card-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 16px;
        }

        .dashboard-card .card-icon {
          font-size: 24px;
          color: #999;
          margin-top: 4px;
        }

        .dashboard-card .card-icon.connected {
          color: #344bff;
        }

        .dashboard-card .recent-items {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .dashboard-card .recent-item {
          padding: 12px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 3px solid #344bff;
        }

        .dashboard-card .item-meta {
          margin-bottom: 4px;
        }

        .dashboard-card .event-date-section {
          display: flex;
          align-items: center;
          margin-bottom: 4px;
        }

        .ant-card-body {
          height: 100% !important;
          padding: 24px !important;
        }
      `}</style>

      <div style={{ padding: "40px", fontFamily: "Montserrat, sans-serif" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Header */}
          <div style={{ marginBottom: "40px" }}>
            <Title
              level={1}
              style={{
                fontSize: "40px",
                fontWeight: "600",
                color: "#1F4788",
                marginBottom: "12px",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              Dashboard
            </Title>
            <Text
              style={{
                fontSize: "16px",
                color: "#666666",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              Bienvenido a tu centro de control. Desde aquí podrás acceder a
              todos tus módulos
            </Text>
          </div>

          {/* Stats Section */}
          {hasConnectedAccounts && (
            <div style={{ marginBottom: "40px" }}>
              <Title
                level={3}
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  color: "#1F4788",
                  marginBottom: "20px",
                }}
              >
                Invitaciones realizadas
              </Title>
              <Row gutter={[24, 24]}>
                <Col xs={24} sm={12} md={8}>
                  <Card style={{ textAlign: "center", borderRadius: "12px" }}>
                    <Avatar
                      size={48}
                      style={{
                        backgroundColor: "#344BFF",
                        marginBottom: "12px",
                      }}
                      icon={<MailOutlined />}
                    />
                    <Title
                      level={2}
                      style={{
                        margin: "8px 0 4px",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      10
                    </Title>
                    <Text
                      style={{
                        color: "#666",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      Enviadas
                    </Text>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card style={{ textAlign: "center", borderRadius: "12px" }}>
                    <Avatar
                      size={48}
                      style={{
                        backgroundColor: "#344BFF",
                        marginBottom: "12px",
                      }}
                      icon={<UserOutlined />}
                    />
                    <Title
                      level={2}
                      style={{
                        margin: "8px 0 4px",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      10
                    </Title>
                    <Text
                      style={{
                        color: "#666",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      Aceptadas
                    </Text>
                  </Card>
                </Col>
              </Row>
            </div>
          )}

          {/* Cards Grid */}
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <EmailCard
                userProfile={userProfile}
                onConnect={() => showNotification("email")}
              />
            </Col>
            <Col xs={24} lg={12}>
              <CalendarCard
                userProfile={userProfile}
                onConnect={() => showNotification("calendar")}
              />
            </Col>
            <Col xs={24} lg={12}>
              <WhatsAppCard onConnect={() => showNotification("whatsapp")} />
            </Col>
          </Row>
        </div>
      </div>

      {/* Notifications */}
      {notifications.map((type, index) => (
        <SuccessNotification
          key={`${type}-${index}`}
          type={type}
          onClose={() => removeNotification(type)}
        />
      ))}
    </>
  );
};

export default DashboardInterface;
