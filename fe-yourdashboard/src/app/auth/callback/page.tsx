"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getMyProfile } from "@/services/auth/auth";
import { Spin, message, Alert } from "antd";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, setUserProfile } = useAuthStore();

  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState("Iniciando...");

  const addDebugInfo = (info: string) => {
    console.log(`🐛 DEBUG: ${info}`);
    setDebugInfo((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${info}`,
    ]);
  };

  useEffect(() => {
    const handleCallback = async () => {
      try {
        addDebugInfo("=== INICIO DEL CALLBACK ===");

        addDebugInfo(`Token existe: ${!!accessToken}`);
        if (!accessToken) {
          addDebugInfo("❌ No hay token de acceso - redirigiendo a login");
          router.push("/auth");
          return;
        }

        const authStatus = searchParams.get("auth");
        const authMessage = searchParams.get("message");
        const gmailConnected = searchParams.get("gmail");

        addDebugInfo(
          `Parámetros URL: auth=${authStatus}, message=${authMessage}, gmail=${gmailConnected}`
        );

        if (authStatus === "error") {
          const decodedMessage = decodeURIComponent(
            authMessage || "Error desconocido"
          );
          addDebugInfo(`❌ Error en OAuth: ${decodedMessage}`);
          message.error(`Error de autenticación: ${decodedMessage}`);

          setTimeout(() => {
            router.push("/dashboard/calendar");
          }, 2000);
          return;
        }

        if (authStatus === "success" || gmailConnected) {
          addDebugInfo("✅ OAuth exitoso - iniciando proceso de actualización");
          setCurrentStep("Procesando conexión exitosa...");

          message.loading({
            content: "Conectando cuenta de Google...",
            key: "oauth-success",
          });

          addDebugInfo(
            "⏳ Esperando 2 segundos para que el backend procese..."
          );
          setCurrentStep("Esperando procesamiento del backend...");
          await new Promise((resolve) => setTimeout(resolve, 2000));

          addDebugInfo("🔄 Intentando recargar el perfil...");
          setCurrentStep("Recargando perfil del usuario...");

          try {
            const updatedProfile = await getMyProfile();
            addDebugInfo(
              `✅ Perfil recargado exitosamente. Cuentas Gmail: ${
                updatedProfile?.cuentas_gmail?.length || 0
              }`
            );

            setUserProfile(updatedProfile);

            message.success({
              content: `¡Cuenta ${
                gmailConnected || "de Google"
              } conectada exitosamente!`,
              key: "oauth-success",
              duration: 3,
            });

            addDebugInfo("🎯 Redirigiendo al calendario...");
            setCurrentStep("Redirigiendo al calendario...");

            setTimeout(() => {
              router.replace("/dashboard/calendar");
            }, 1000);
          } catch (profileError) {
            addDebugInfo(`❌ Error al recargar perfil: ${profileError}`);
            setCurrentStep("Error al cargar perfil");

            message.error({
              content:
                "Error al cargar la cuenta conectada. Redirigiendo al calendario...",
              key: "oauth-success",
            });

            setTimeout(() => {
              router.push("/dashboard/calendar");
            }, 2000);
          }
        } else {
          addDebugInfo("⚠️ Caso por defecto - redirigiendo al calendario");
          setCurrentStep("Redirigiendo...");

          setTimeout(() => {
            router.push("/dashboard/calendar");
          }, 1000);
        }
      } catch (error) {
        addDebugInfo(`❌ Error general en callback: ${error}`);
        setCurrentStep("Error en el proceso");

        message.error("Error en el proceso de autenticación");

        setTimeout(() => {
          router.push("/dashboard/calendar");
        }, 2000);
      }
    };

    if (searchParams && accessToken !== undefined) {
      handleCallback();
    }
  }, [searchParams, router, setUserProfile, accessToken]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <Spin size="large" />
      <p className="mt-4 text-lg font-medium">{currentStep}</p>

      {/* Panel de debug - solo en desarrollo */}
      {process.env.NODE_ENV === "development" && debugInfo.length > 0 && (
        <div className="mt-8 w-full max-w-2xl">
          <Alert
            message="Información de Debug"
            description={
              <div className="max-h-64 overflow-y-auto">
                {debugInfo.map((info, index) => (
                  <div key={index} className="text-xs font-mono mb-1">
                    {info}
                  </div>
                ))}
              </div>
            }
            type="info"
            showIcon
          />
        </div>
      )}

      {/* Botón de emergencia */}
      <button
        onClick={() => {
          addDebugInfo("🚨 Botón de emergencia activado");
          router.push("/dashboard/calendar");
        }}
        className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Ir al Calendar (Emergencia)
      </button>
    </div>
  );
}
