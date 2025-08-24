"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getMyProfile } from "@/services/auth/auth";
import { message, Spin } from "antd";
import {
  UserOutlined,
  LinkOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";

import GoogleConnectButton from "@/components/Calendar/GoogleConnectButton";
import EnhancedCalendarView from "@/components/Calendar/EnhancedCalendarView";
import AccountManager from "@/components/Calendar/ccountManager";
import { CalendarEvent } from "@/interfaces/interfacesCalendar";

export default function CalendarioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    accessToken,
    userProfile,
    setUserProfile,
    clearAuth,
    hasGmailAccounts,
    getActiveGmailAccount,
  } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [showUnified, setShowUnified] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (accessToken !== undefined) {
      setIsHydrated(true);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!accessToken) {
      router.push("/auth");
      return;
    }

    const loadProfile = async () => {
      if (!userProfile) {
        try {
          setIsLoading(true);
          const profileData = await getMyProfile();
          setUserProfile(profileData);
        } catch (error) {
          console.error("Error al cargar el perfil:", error);
          clearAuth();
          router.push("/auth");
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [isHydrated, accessToken, userProfile, setUserProfile, clearAuth, router]);

  useEffect(() => {
    const authStatus = searchParams.get("auth");
    const gmailConnected = searchParams.get("gmail");
      const successParam = searchParams.get("success");      // ✨ 
      const refreshParam = searchParams.get("refresh");      // ✨ 

  // ✨  CONDICIÓN:
  if (successParam === "true" && refreshParam === "profile") {
    console.log('🔄 Calendar OAuth exitoso, refrescando perfil...');
    
    message.success({
      content: "¡Google Calendar conectado exitosamente!",
      duration: 5,
    });

    const reloadProfile = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const updatedProfile = await getMyProfile();
        setUserProfile(updatedProfile);
      } catch (error) {
        console.error("Error recargando perfil:", error);
      }
    };

    reloadProfile();
    router.replace("/dashboard/calendar");
    return; // ✨ IMPORTANTE: return para no ejecutar el resto
  }

    if (authStatus === "success" || gmailConnected) {
      message.success({
        content: `¡Cuenta ${
          gmailConnected || "de Google"
        } conectada exitosamente!`,
        duration: 5,
      });

      const reloadProfile = async () => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const updatedProfile = await getMyProfile();
          setUserProfile(updatedProfile);
        } catch (error) {
          console.error("Error recargando perfil:", error);
        }
      };

      reloadProfile();
      router.replace("/dashboard/calendar");
    }

    if (authStatus === "error") {
      const authMessage = searchParams.get("message");
      const decodedMessage = decodeURIComponent(
        authMessage || "Error desconocido"
      );
      message.error(`Error de autenticación: ${decodedMessage}`);
      router.replace("/dashboard/calendar");
    }
  }, [searchParams, setUserProfile, router]);

  useEffect(() => {
    if (userProfile && hasGmailAccounts() && !selectedAccountId) {
      const activeAccount = getActiveGmailAccount();
      if (activeAccount) {
        setSelectedAccountId(activeAccount.id.toString());
      }
    }
  }, [userProfile, hasGmailAccounts, getActiveGmailAccount, selectedAccountId]);

  const handleAccountChange = (accountId: string) => {
    if (accountId === "unified") {
      setShowUnified(true);
      setSelectedAccountId("");
    } else {
      setShowUnified(false);
      setSelectedAccountId(accountId);
    }
  };

  const handleAccountDisconnect = (accountId: string) => {
    if (selectedAccountId === accountId) {
      const remainingAccounts =
        userProfile?.cuentas_gmail?.filter(
          (acc) => acc.id.toString() !== accountId
        ) || [];

      if (remainingAccounts.length > 0) {
        setSelectedAccountId(remainingAccounts[0].id.toString());
        setShowUnified(false);
      } else {
        setSelectedAccountId("");
        setShowUnified(false);
      }
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    console.log("📅 Evento seleccionado:", event);
  };

  const handleDateSelect = (date: Date) => {
    console.log("📅 Fecha seleccionada para crear evento:", date);
  };

  if (!isHydrated || isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <Spin size="large" />
          <h3>{!isHydrated ? "Inicializando..." : "Cargando calendario..."}</h3>
          <p>Por favor espera un momento</p>
        </div>

        <style jsx>{`
          .loading-screen {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }

          .loading-content {
            text-align: center;
            background: white;
            padding: 48px;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          }

          .loading-content h3 {
            margin: 24px 0 8px 0;
            color: #262626;
            font-weight: 600;
          }

          .loading-content p {
            margin: 0;
            color: #8c8c8c;
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="brand">
            <div className="brand-icon">📅</div>
            <div className="brand-info">
              <h1>Calendar Dashboard</h1>
              {userProfile && (
                <span className="welcome-text">
                  <UserOutlined /> {userProfile.usuario.nombre}
                </span>
              )}
            </div>
          </div>

          <AccountManager
            selectedAccountId={showUnified ? "unified" : selectedAccountId}
            onAccountChange={handleAccountChange}
            onAccountDisconnect={handleAccountDisconnect}
            showUnifiedOption={
              userProfile?.cuentas_gmail && userProfile.cuentas_gmail.length > 1
            }
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-content">
        {hasGmailAccounts() ? (
          <>
            {/* Calendario Mejorado */}
            <EnhancedCalendarView
              accountId={showUnified ? undefined : selectedAccountId}
              showUnified={showUnified}
              height={600}
              onEventClick={handleEventClick}
              onDateSelect={handleDateSelect}
            />

            {/* Stats Cards */}
            {userProfile && (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">
                    <LinkOutlined />
                  </div>
                  <div className="stat-content">
                    <h3>{userProfile.estadisticas.total_cuentas_gmail}</h3>
                    <p>Cuentas Conectadas</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon active">
                    <CheckCircleOutlined />
                  </div>
                  <div className="stat-content">
                    <h3>{userProfile.estadisticas.cuentas_gmail_activas}</h3>
                    <p>Cuentas Activas</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon synced">
                    <UserOutlined />
                  </div>
                  <div className="stat-content">
                    <h3>
                      {userProfile.estadisticas.total_emails_sincronizados}
                    </h3>
                    <p>Eventos Sincronizados</p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="connect-state">
            <div className="connect-content">
              <div className="connect-icon">🔗</div>
              <h2>Conecta tu cuenta de Google</h2>
              <p>
                Para comenzar a ver y gestionar tus eventos de calendario,
                conecta tu cuenta de Google.
              </p>
              <GoogleConnectButton />
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .dashboard-layout {
          min-height: 100vh;
          background: #f8fafc;
        }

        .dashboard-header {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .brand-icon {
          font-size: 32px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .brand-info h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .welcome-text {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: #64748b;
          margin-top: 2px;
        }

        .dashboard-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .connect-state {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }

        .connect-content {
          text-align: center;
          background: white;
          padding: 48px;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          max-width: 400px;
          width: 100%;
        }

        .connect-icon {
          font-size: 48px;
          margin-bottom: 24px;
        }

        .connect-content h2 {
          margin: 0 0 12px 0;
          font-size: 24px;
          font-weight: 600;
          color: #1e293b;
        }

        .connect-content p {
          margin: 0 0 32px 0;
          color: #64748b;
          line-height: 1.6;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .stat-card {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          display: flex;
          align-items: center;
          gap: 16px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          background: #f1f5f9;
          color: #64748b;
        }

        .stat-icon.active {
          background: #dcfce7;
          color: #16a34a;
        }

        .stat-icon.synced {
          background: #ede9fe;
          color: #7c3aed;
        }

        .stat-content h3 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
        }

        .stat-content p {
          margin: 4px 0 0 0;
          font-size: 14px;
          color: #64748b;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .header-content {
            padding: 0 16px;
            flex-direction: column;
            height: auto;
            padding-top: 16px;
            padding-bottom: 16px;
            gap: 16px;
          }

          .dashboard-content {
            padding: 20px 16px;
          }

          .brand-info h1 {
            font-size: 20px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
