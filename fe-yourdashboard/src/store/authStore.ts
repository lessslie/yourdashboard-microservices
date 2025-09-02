import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface UserProfile {
  usuario: {
    id: number;
    email: string;
    nombre: string;
    fecha_registro: string;
    estado: string;
    email_verificado: boolean;
  };
  cuentas_gmail: Array<{
    id: number;
    email_gmail: string;
    nombre_cuenta: string;
    alias_personalizado?: string;
    fecha_conexion: string;
    ultima_sincronizacion?: string;
    esta_activa: boolean;
    emails_count: number;
  }>;
  estadisticas: {
    total_cuentas_gmail: number;
    cuentas_gmail_activas: number;
    total_emails_sincronizados: number;
    emails_no_leidos: number;
    ultima_sincronizacion: string;
    cuenta_mas_activa: {
      email_gmail: string;
      emails_count: number;
    };
  };
}

interface AuthState {
  accessToken: string | null;
  userProfile: UserProfile | null;

  _hasHydrated: boolean;

  setToken: (token: string) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  clearAuth: () => void;
  setHasHydrated: (state: boolean) => void;

  getGmailAccounts: () => UserProfile["cuentas_gmail"];
  setGmailAccounts: (cuentas: UserProfile["cuentas_gmail"]) => void;
  getActiveGmailAccount: () => UserProfile["cuentas_gmail"][0] | undefined;
  hasGmailAccounts: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      userProfile: null,
      _hasHydrated: false,

      setToken: (token: string) => set({ accessToken: token }),

      setUserProfile: (profile) => set({ userProfile: profile }),

      clearAuth: () => set({ accessToken: null, userProfile: null }),

      setHasHydrated: (state: boolean) => set({ _hasHydrated: state }),

      getGmailAccounts: () => {
        const state = get();
        return state.userProfile?.cuentas_gmail || [];
      },
      setGmailAccounts: (cuentas) => {
        const state = get();
        if (!state.userProfile) return;
        set({
          userProfile: {
            usuario: state.userProfile.usuario,
            cuentas_gmail: cuentas,
            estadisticas: state.userProfile.estadisticas,
          },
        });
      },

      getActiveGmailAccount: () => {
        const state = get();
        const accounts = state.userProfile?.cuentas_gmail || [];
        return accounts.find((account) => account.esta_activa) || accounts[0];
      },

      hasGmailAccounts: () => {
        const state = get();
        const accounts = state.userProfile?.cuentas_gmail || [];
        return accounts.length > 0;
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),

      onRehydrateStorage: () => (state) => {
        console.log("🔄 Zustand rehydrating...");
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        accessToken: state.accessToken,
        userProfile: state.userProfile,
      }),
    }
  )
);

export const useAuthStoreHydrated = () => {
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const userProfile = useAuthStore((state) => state.userProfile);

  return {
    hasHydrated,
    accessToken,
    userProfile,
    isAuthenticated: !!accessToken && hasHydrated,
  };
};
