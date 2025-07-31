import { useEffect, useState } from "react";
import { getGmailCuentas, getUserData } from "../lib/auth";

export interface IUserBack {
  id: number;
  email: string;
  nombre: string;
  fecha_registro: string;
  estado: string;
  email_verificado: boolean;
}

export interface IUser {
  id: number;
  name: string;
  email: string;
  state: string;
  isEmailVerified: boolean;
  createdAt: string;
}

export interface ICuentaGmailBack {
  id: number;
  email_gmail: string;
  nombre_cuenta: string;
  alias_personalizado: string;
  fecha_conexion: string;
  ultima_sincronizacion: Date;
  esta_activa: boolean;
  emails_count: string;
}

export interface ICuentaGmail {
  id: string;
  emailGmail: string;
  nameGmail: string;
  alias: string;
  createdAt: string;
  lastSync: Date | string;
  isActive: "Activo" | "Inactivo";
  emailsCount: number;
}

export const useAuth = () => {
  const [token, setToken] = useState("");
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      setToken(token);
    }
  }, []);

  const saveToken = (token: string) => {
    localStorage.setItem("token", token);
    setToken(token);
  };

  const remuveToken = () => {
    localStorage.removeItem("token");
    setToken("");
  };

  return { token, saveToken, remuveToken };
};

export const useUserData = () => {
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [userData, setUserData] = useState<IUser>({} as IUser);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const getUser = async () => {
        try {
          const userResponse = await getUserData(token);
          const userData = userResponse.usuario as IUserBack;

          const user: IUser = {
            id: userData.id,
            name: userData.nombre,
            email: userData.email,
            state: userData.estado,
            isEmailVerified: userData.email_verificado,
            createdAt: userData.fecha_registro,
          };

          setUserData(user);
        } catch (error) {
          console.log(error);
        } finally {
          setLoadingProfile(false);
        }
      };
      getUser();
    }
  }, []);

  return { userData, loadingProfile };
};

export const useCuentasGmail = () => {
  const [cuentasGmail, setCuentasGmail] = useState<ICuentaGmail[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const getCuentasGmail = async () => {
        const gmailResponse = await getGmailCuentas(token);
        const cuentas = gmailResponse.cuentas as ICuentaGmailBack[];
        const cuentasGmail: ICuentaGmail[] = cuentas.map((cuenta) => ({
          id: cuenta.id.toString(),
          emailGmail: cuenta.email_gmail,
          nameGmail: cuenta.nombre_cuenta,
          alias: cuenta.alias_personalizado || "Sin alias",
          createdAt: cuenta.fecha_conexion,
          lastSync: cuenta.ultima_sincronizacion || "Sin sincronizar",
          isActive: cuenta.esta_activa ? "Activo" : "Inactivo",
          emailsCount: parseInt(cuenta.emails_count),
        }));
        setCuentasGmail(cuentasGmail);
        // console.log("📧 Cuentas Gmail:", gmailResponse.cuentas);
      };
      getCuentasGmail();
    }
  }, []);

  return {
    cuentasGmail,
  };
};
