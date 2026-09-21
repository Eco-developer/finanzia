'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/presentation/context/auth.context';
import { LogOut, X } from 'lucide-react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  activeSection?: string;
  onNavigateSection?: (section: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  activeSection = 'dashboard',
  onNavigateSection,
  isOpenMobile = false,
  onCloseMobile,
}: SidebarProps) {
  const { user, logout } = useAuth();

  const handleNavClick = (sectionKey: string, href?: string) => {
    if (onNavigateSection && !href) {
      onNavigateSection(sectionKey);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const initial = user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'M';
  const fullName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : 'Usuario FinanZIA';

  return (
    <>
      {/* Backdrop semi-transparente para móvil/tablet */}
      <div
        className={`${styles.backdrop} ${isOpenMobile ? styles.backdropOpen : ''}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        className={`${styles.sidebar} ${isOpenMobile ? styles.sidebarOpen : ''}`}
      >
        <div>
          {/* Brand Header */}
          <div className={styles.brand}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div className={styles.brandIcon}>⚡</div>
              <div className={styles.brandInfo}>
                <div className={styles.brandTitle}>
                  Finan<span>ZIA</span>
                </div>
                <div className={styles.brandSubtitle}>IA VERIFICABLE</div>
              </div>
            </div>

            {/* Botón cerrar para móvil */}
            {onCloseMobile && (
              <button
                type="button"
                className={styles.closeBtn}
                onClick={onCloseMobile}
                aria-label="Cerrar menú lateral"
                title="Cerrar menú"
              >
                <X size={18} />
              </button>
            )}
          </div>

        {/* Navigation Menu */}
        <nav className={styles.navMenu}>
          <Link
            href="/"
            className={`${styles.navItem} ${
              activeSection === 'dashboard' ? styles.navItemActive : ''
            }`}
            onClick={() => handleNavClick('dashboard')}
          >
            <span className={styles.navIcon}>📊</span>
            <span>Dashboard</span>
          </Link>

          <button
            type="button"
            className={`${styles.navItem} ${
              activeSection === 'accounts' ? styles.navItemActive : ''
            }`}
            onClick={() => handleNavClick('accounts')}
          >
            <span className={styles.navIcon}>💳</span>
            <span>Cuentas y Tarjetas</span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${
              activeSection === 'transactions' ? styles.navItemActive : ''
            }`}
            onClick={() => handleNavClick('transactions')}
          >
            <span className={styles.navIcon}>↕️</span>
            <span>Transacciones</span>
          </button>

          <Link
            href="/budgets"
            className={`${styles.navItem} ${
              activeSection === 'budgets' ? styles.navItemActive : ''
            }`}
            onClick={() => handleNavClick('budgets')}
          >
            <span className={styles.navIcon}>🎯</span>
            <span>Presupuestos</span>
          </Link>

          <Link
            href="/goals"
            className={`${styles.navItem} ${
              activeSection === 'goals' ? styles.navItemActive : ''
            }`}
            onClick={() => handleNavClick('goals')}
          >
            <span className={styles.navIcon}>🏆</span>
            <span>Metas de Ahorro</span>
          </Link>

          <Link href="/imports" className={styles.navItem}>
            <span className={styles.navIcon}>📄</span>
            <span>Importar CSV</span>
          </Link>

          <Link
            href="/advisor"
            className={`${styles.navItem} ${styles.navItemAI} ${
              activeSection === 'advisor' || activeSection === 'ai' ? styles.navItemActive : ''
            }`}
            onClick={() => handleNavClick('advisor')}
          >
            <span className={styles.navIcon}>✨</span>
            <span>FinanZIA AI Advisor</span>
          </Link>
        </nav>
      </div>

      {/* Footer con Perfil y Logout */}
      <div className={styles.footer}>
        <div className={styles.userProfile}>
          <div className={styles.userMeta}>
            <div className={styles.avatar}>{initial}</div>
            <div>
              <div className={styles.userName}>{fullName}</div>
              <div className={styles.userRole}>Plan Inteligente</div>
            </div>
          </div>
          <button
            type="button"
            className={styles.logoutBtn}
            onClick={logout}
            title="Cerrar sesión segura"
            aria-label="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  </>
);
}
