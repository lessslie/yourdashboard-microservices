import './globals.css'

export const metadata = {
  title: 'YourDashboard - Gestión de Comunicaciones',
  description: 'Dashboard unificado para gestionar emails, WhatsApp y calendario',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  )
}

/* 
🧠 EXPLICACIÓN COMPLETA DEL LAYOUT:

1. ¿QUÉ ES UN LAYOUT?
   - Es como el "marco" de un cuadro
   - Se aplica a TODAS las páginas
   - Contiene elementos que siempre están presentes

2. ¿QUÉ HACE ESTE LAYOUT?
   - Define la estructura HTML básica
   - Aplica estilos globales (fuente, colores)
   - Configura metadata (título, descripción)
   - Envuelve todo el contenido con {children}

3. ¿CÓMO FUNCIONA {children}?
   - Es donde se "inyecta" el contenido de cada página
   - Si vas a /login → children = <LoginPage />
   - Si vas a / → children = <DashboardPage />

4. METADATA:
   - Se convierte en <title>, <meta description>, etc.
   - Importante para SEO y cuando compartes links

5. CLASES DE TAILWIND:
   - h-full → height: 100%
   - bg-gray-50 → background gris claro
   - antialiased → texto más suave

¿DÓNDE VA ESTE ARCHIVO?
- app/layout.tsx (reemplaza el que viene por defecto)
*/