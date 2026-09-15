'use client';

import React from 'react';
import { useAuth } from '@/core/application/auth/auth.context';
import styles from './MobileNav.module.css';

export function MobileTopBar() {
  const { user } = useAuth();
  const initial = user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'M';

  return (
    <header className={styles.topBar}>
      <div className={styles.topBarBrand}>
        <div className={styles.topBarAvatar}>{initial}</div>
        <div className={styles.topBarTitles}>
          <div className={styles.topBarLogo}>
            Finan<span>ZIA</span>
          </div>
          <div className={styles.topBarSub}>FINANZAS CON IA</div>
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
