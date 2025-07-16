'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, saveToken } from '../lib/auth'; // ✅ AGREGADO saveToken

interface UserProfile {
  id: number;
  email: string;
  name: string;
  isEmailVerified: boolean;
  createdAt?: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const router = useRouter();
  const { isLoggedIn, logout, getProfile } = useAuth();

  // ✅ NUEVO: useEffect para manejar callback OAuth + cargar datos
  useEffect(() => {
    // ✅ PASO 1: Manejar callback OAuth con JWT
    const handleOAuthCallback = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const authStatus = urlParams.get('auth');
      const token = urlParams.get('token');
      const userId = urlParams.get('userId');
      const provider = urlParams.get('provider');

      if (authStatus === 'success' && token && userId) {
        console.log('✅ OAuth callback exitoso, guardando JWT...');
        console.log('🔑 Token recibido:', token.substring(0, 50) + '...');
        console.log('👤 UserId:', userId);
        
        // Guardar JWT como cualquier usuario tradicional
        saveToken(token);
        
        // Guardar datos del usuario para acceso rápido
        const userData = {
          id: parseInt(userId),
          provider: provider || 'google',
          authenticatedAt: new Date().toISOString()
        };
        localStorage.setItem('user_data', JSON.stringify(userData));
        
        console.log(`✅ Sesión OAuth establecida para userId: ${userId}`);
        
        // Limpiar parámetros de URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Recargar datos del usuario
        window.location.reload();
        return true; // Indica que se manejó OAuth
      }

      if (authStatus === 'error') {
        const errorMessage = urlParams.get('message');
        console.error('❌ Error en OAuth:', errorMessage);
        setError(decodeURIComponent(errorMessage || 'Error en autenticación OAuth'));
        
        // Limpiar parámetros de URL
        window.history.replaceState({}, document.title, window.location.pathname);
        setIsLoading(false);
        return true; // Indica que se manejó OAuth (con error)
      }

      return false; // No había callback OAuth
    };

    // ✅ PASO 2: Ejecutar manejo OAuth PRIMERO
    const wasOAuthCallback = handleOAuthCallback();
    
    // Si fue callback OAuth, no continuar (se va a recargar)
    if (wasOAuthCallback) {
      return;
    }

    // ✅ PASO 3: Cargar datos normalmente si no fue callback OAuth
    const loadUserData = async () => {
      if (!isLoggedIn) {
        console.log('❌ Usuario no autenticado, redirigiendo al login...');
        router.push('/login');
        return;
      }

      try {
        console.log('🔵 Obteniendo perfil del usuario...');
        const profileData = await getProfile();
        
        if (profileData.success) {
          setUser(profileData.user);
          console.log('✅ Perfil obtenido:', profileData.user.name);
        } else {
          throw new Error('Error obteniendo perfil');
        }
      } catch (err: any) {
        console.error('❌ Error cargando perfil:', err);
        setError('Error cargando datos del usuario');
        logout().catch(console.error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []); // ✅ Array vacío para ejecutar solo una vez

  // ✅ MANTENER: useEffect separado para manejar cambios de autenticación
  useEffect(() => {
    if (!isLoggedIn && !isLoading) {
      router.push('/login');
    }
  }, [isLoggedIn, isLoading, router]);

  const handleLogout = async () => {
    try {
      console.log('🔵 Cerrando sesión...');
      await logout();
    } catch (err) {
      console.error('❌ Error cerrando sesión:', err);
    }
  };

  const navigateToModule = (module: string) => {
    console.log(`🔵 Navegando a módulo: ${module}`);
    router.push(`/${module}`);
  };

  const handleConnectService = async (service: string) => {
    if (service === 'gmail') {
      console.log('🔵 Conectando con Gmail...');
      const authUrl = `${process.env.NEXT_PUBLIC_MS_AUTH_URL}/auth/google`;
      window.location.href = authUrl;
    } else {
      console.log(`🔵 ${service} aún no implementado`);
      alert(`Conexión con ${service} próximamente disponible`);
    }
  };

  // ✅ MANTENER: Early return si no está autenticado
  if (!isLoggedIn && !isLoading) {
    return null; // El useEffect ya redirige
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">YourDashboard</h1>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">🔔</span>
            <span className="text-sm text-gray-600">⚙️</span>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">👤</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="text-sm text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
                title="Cerrar sesión"
              >
                🚪
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto py-8 px-4">
        {/* Bienvenida */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            ¡Hola, {user?.name?.split(' ')[0]}! 👋
          </h2>
          <p className="mt-2 text-gray-600">
            Gestiona todas tus comunicaciones desde un solo lugar
          </p>
        </div>

        {/* Grid de módulos */}
        <div className="grid grid-cols-1 gap-6 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          
          {/* Módulo Emails */}
          <div className="card">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <span className="text-2xl">📧</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Emails</h3>
                <p className="text-sm text-gray-500">Gmail integrado</p>
              </div>
            </div>
            
            <p className="text-gray-600 mb-4">
              Gestiona tus correos electrónicos con paginación y búsqueda en tiempo real
            </p>
            
            <div className="space-y-2">
              <button
                onClick={() => navigateToModule('emails')}
                className="btn btn-blue w-full"
              >
                Ver Emails
              </button>
              
              <button
                onClick={() => handleConnectService('gmail')}
                className="btn btn-secondary w-full"
              >
                Conectar Gmail
              </button>
            </div>
          </div>

          {/* Módulo WhatsApp */}
          <div className="card">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <span className="text-2xl">💬</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">WhatsApp</h3>
                <p className="text-sm text-gray-500">Próximamente</p>
              </div>
            </div>
            
            <p className="text-gray-600 mb-4">
              Gestiona tus conversaciones de WhatsApp Business
            </p>
            
            <div className="space-y-2">
              <button
                disabled
                className="btn w-full"
                style={{ backgroundColor: '#d1d5db', color: '#6b7280', cursor: 'not-allowed' }}
              >
                Próximamente
              </button>
            </div>
          </div>

          {/* Módulo Calendar */}
          <div className="card">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <span className="text-2xl">📅</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Calendar</h3>
                <p className="text-sm text-gray-500">Próximamente</p>
              </div>
            </div>
            
            <p className="text-gray-600 mb-4">
              Sincroniza y gestiona tus eventos de Google Calendar
            </p>
            
            <div className="space-y-2">
              <button
                disabled
                className="btn w-full"
                style={{ backgroundColor: '#d1d5db', color: '#6b7280', cursor: 'not-allowed' }}
              >
                Próximamente
              </button>
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado de la cuenta</h3>
          <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Estado de verificación</p>
              <span className={user?.isEmailVerified ? 'badge badge-green' : 'badge badge-yellow'}>
                {user?.isEmailVerified ? 'Verificado' : 'Pendiente de verificación'}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}