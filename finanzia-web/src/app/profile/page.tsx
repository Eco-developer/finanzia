'use client';

import React, { useState } from 'react';
import { useAuth } from '@/presentation/context/auth.context';
import { Sidebar } from '@/presentation/components/navigation/Sidebar';
import { MobileTopBar } from '@/presentation/components/navigation/MobileTopBar';
import { MobileBottomNav } from '@/presentation/components/navigation/MobileBottomNav';
import { ProfileView } from '@/presentation/components/profile/ProfileView';
import accountsStyles from '../accounts/accounts.module.css';

export default function ProfilePage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (isAuthLoading) {
    return (
      <div className={accountsStyles.appContainer}>
        <div style={{ padding: '3rem', color: '#94a3b8' }}>
          <span>Cargando perfil...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={accountsStyles.appContainer}>
      {/* Sidebar Desktop */}
      <Sidebar
        activeSection="profile"
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Barra Superior Móvil */}
      <MobileTopBar onOpenMenu={() => setIsMobileMenuOpen(true)} />

      {/* Contenido Principal */}
      <main className={accountsStyles.mainContent}>
        <header className={accountsStyles.header}>
          <div className={accountsStyles.headerTitles}>
            <h1 className={accountsStyles.pageTitle}>Mi Perfil de Usuario</h1>
            <p className={accountsStyles.pageSubtitle}>
              Consulta y modifica tus datos de registro, metas financieras, contexto económico y condiciones de privacidad.
            </p>
          </div>
        </header>

        <ProfileView />
      </main>

      {/* Navegación Inferior Móvil */}
      <MobileBottomNav />
    </div>
  );
}
