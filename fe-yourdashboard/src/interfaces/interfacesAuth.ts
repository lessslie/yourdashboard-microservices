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
