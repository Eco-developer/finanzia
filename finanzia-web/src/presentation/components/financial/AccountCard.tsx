'use client';

import React from 'react';
import { MoneyDisplay } from './MoneyDisplay';
import { AccountItem, AccountType } from '@/infrastructure/api/accounts.api';
import styles from './AccountCard.module.css';

interface AccountCardProps {
  account: AccountItem;
  isSelected?: boolean;
  onClick?: () => void;
}

const TYPE_BADGE_STYLES: Record<AccountType, string> = {
  CHECKING: styles.typeBadgeChecking,
  SAVINGS: styles.typeBadgeSavings,
  CREDIT_CARD: styles.typeBadgeCredit,
  CASH: styles.typeBadgeOther,
  INVESTMENT: styles.typeBadgeCredit,
};

const TYPE_GRADIENT_STYLES: Record<AccountType, string> = {
  CHECKING: styles.checking,
  SAVINGS: styles.savings,
  CREDIT_CARD: styles.creditCard,
  CASH: styles.cash,
  INVESTMENT: styles.investment,
};

const TYPE_SUBTITLES: Record<AccountType, string> = {
  CHECKING: 'EUR • Cuenta Principal',
  SAVINGS: 'Rentabilidad activa • Ahorro',
  CREDIT_CARD: 'Límite de crédito mensual',
  CASH: 'Efectivo en mano',
  INVESTMENT: 'Cartera de inversión',
};

export function AccountCard({ account, isSelected = false, onClick }: AccountCardProps) {
  const gradientClass = TYPE_GRADIENT_STYLES[account.type] || styles.checking;
  const badgeClass = TYPE_BADGE_STYLES[account.type] || styles.typeBadgeOther;
  const subtitle = TYPE_SUBTITLES[account.type] || 'EUR • Saldo disponible';

  return (
    <div
      className={`${styles.card} ${gradientClass} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={styles.topRow}>
        <h3 className={styles.accountName} title={account.name}>
          {account.name}
        </h3>
        <span className={`${styles.typeBadge} ${badgeClass}`}>
          {account.type}
        </span>
      </div>

      <div className={styles.balanceRow}>
        <MoneyDisplay cents={account.currentBalanceCents} size="lg" colorCoded={false} />
      </div>

      <div className={styles.cardFooter}>
        <span>{subtitle}</span>
      </div>
    </div>
  );
}
