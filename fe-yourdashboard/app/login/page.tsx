'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '../../lib/auth';
import AuthForm from '../../components/AuthForm';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      console.log('✅ Usuario ya autenticado, redirigiendo al dashboard...');
      router.push('/');
    }
  }, [router]);

  return (
    <div>
      <title>Login - YourDashboard</title>
      <AuthForm />
    </div>
  );
}