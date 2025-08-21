import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { getUserData, getGmailCuentas } from "@/services/auth/auth";
import {
  ICuentaGmail,
  ICuentaGmailBack,
  IUser,
  IUserBack,
} from "@/interfaces/interfacesAuth";

export const useAuth = () => {
  const { accessToken, setToken, clearAuth } = useAuthStore();

  const saveToken = (token: string) => {
    setToken(token);
  };

  const remuveToken = () => {
    clearAuth();
  };

  return {
    token: accessToken || "",
    accessToken,
    saveToken,
    remuveToken,
    clearAuth,
  };
};

export const useUserData = () => {
  const [loadingProfile, setLoadingProfile] = useState(true);
  const { userProfile, setUserProfile, accessToken } = useAuthStore();

  const userData: IUser = userProfile
    ? {
        id: userProfile.usuario.id,
        name: userProfile.usuario.nombre,
        email: userProfile.usuario.email,
        state: userProfile.usuario.estado,
        isEmailVerified: userProfile.usuario.email_verificado,
        createdAt: userProfile.usuario.fecha_registro,
      }
    : ({} as IUser);

  useEffect(() => {
    if (accessToken && !userProfile) {
      const getUser = async () => {
        try {
          const userResponse = await getUserData(accessToken);

          setUserProfile(userResponse);
        } catch (error) {
          console.log(error);
        } finally {
          setLoadingProfile(false);
        }
      };
      getUser();
    } else if (userProfile) {
      setLoadingProfile(false);
    }
  }, [accessToken, userProfile, setUserProfile]);

  return { userData, loadingProfile };
};

export const useCuentasGmail = () => {
  const { getGmailAccounts } = useAuthStore();

  const cuentasGmail: ICuentaGmail[] = getGmailAccounts().map((cuenta) => ({
    id: cuenta.id.toString(),
    emailGmail: cuenta.email_gmail,
    nameGmail: cuenta.nombre_cuenta,
    alias: cuenta.alias_personalizado || "Sin alias",
    createdAt: cuenta.fecha_conexion,
    lastSync: cuenta.ultima_sincronizacion || "Sin sincronizar",
    isActive: cuenta.esta_activa ? "Activo" : "Inactivo",
    emailsCount: cuenta.emails_count,
  }));

  return {
    cuentasGmail,
  };
};
