'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/context/auth.context';

/**
 * Hook reutilizable para proteger rutas privadas del dashboard y sus submódulos.
 * Si el usuario no está autenticado, lo redirige al login.
 * Si el usuario está autenticado pero aún no completó el onboarding, lo redirige a /onboarding.
 */
export function useOnboardingGuard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (user && !user.onboardingCompleted) {
      router.replace('/onboarding');
    }
  }, [user, isAuthenticated, isLoading, router]);

  return {
    isLoading: isLoading || (isAuthenticated && user && !user.onboardingCompleted),
    isAllowed: isAuthenticated && !!user?.onboardingCompleted,
  };
}
