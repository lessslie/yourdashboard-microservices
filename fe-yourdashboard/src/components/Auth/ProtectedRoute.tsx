// components/ProtectedRoute.tsx
"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { Spin } from "antd";
import { useAuthStoreHydrated } from "@/store/authStore";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { hasHydrated, isAuthenticated } = useAuthStoreHydrated();
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace("/login"); 
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
