'use client';

import React from 'react';
import { useAuth } from '@/presentation/context/auth.context';
import { Menu } from 'lucide-react';
import styles from './MobileNav.module.css';

interface MobileTopBarProps {
  onOpenMenu?: () => void;
}

export function MobileTopBar({ onOpenMenu }: MobileTopBarProps) {
  const { user } = useAuth();
  const initial = user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'M';

  return (
    <header className={styles.topBar}>
      <div className={styles.topBarLeft}>
        {onOpenMenu && (
          <button
            type="button"
            className={styles.menuBtn}
            onClick={onOpenMenu}
            aria-label="Abrir menú de navegación"
            title="Menú"
          >
            <Menu size={18} />
          </button>
        )}
        <div className={styles.topBarBrand}>
          <div className={styles.topBarAvatar}>{initial}</div>
          <div className={styles.topBarTitles}>
            <div className={styles.topBarLogo}>
              Finan<span>ZIA</span>
            </div>
            <div className={styles.topBarSub}>FINANZAS CON IA</div>
          </div>
        </div>
      </div>

      <div className={styles.topBarRight}>
        <button
          type="button"
          className={styles.notificationBtn}
          title="Conexión en vivo con el motor determinista"
          aria-label="Notificaciones y estado"
        >
          <span>🔔</span>
          <span className={styles.statusDot} />
        </button>
      </div>
    </header>
  );
}
