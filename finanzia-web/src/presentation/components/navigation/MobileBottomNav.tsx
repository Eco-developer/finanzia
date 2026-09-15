'use client';

import React from 'react';
import styles from './MobileNav.module.css';

interface MobileBottomNavProps {
  activeTab?: string;
  onTabChange?: (tabKey: string) => void;
}

export function MobileBottomNav({
  activeTab = 'dashboard',
  onTabChange,
}: MobileBottomNavProps) {
  const tabs = [
    { key: 'dashboard', label: 'Inicio', icon: '📊' },
    { key: 'transactions', label: 'Movimientos', icon: '↕️' },
    { key: 'budgets', label: 'Presupuestos', icon: '🎯' },
    { key: 'ai', label: 'AI Advisor', icon: '🤖', isAI: true },
    { key: 'settings', label: 'Ajustes', icon: '👤' },
  ];

  return (
    <nav className={styles.bottomNav} aria-label="Navegación principal móvil">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            className={`${styles.bottomNavItem} ${isActive ? styles.bottomNavItemActive : ''} ${
              tab.isAI ? styles.bottomNavItemAI : ''
            }`}
            onClick={() => onTabChange?.(tab.key)}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className={styles.bottomNavIcon}>{tab.icon}</span>
            <span className={styles.bottomNavLabel}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
