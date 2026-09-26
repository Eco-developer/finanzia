'use client';

import React from 'react';
import { MoneyDisplay } from './MoneyDisplay';
import { AccountItem, AccountType } from '@/infrastructure/api/accounts.api';
import { Pencil, Trash2 } from 'lucide-react';
import styles from './AccountCard.module.css';

interface AccountCardProps {
  account: AccountItem;
  isSelected?: boolean;
  onClick?: () => void;
  onEdit?: (account: AccountItem) => void;
  onDelete?: (account: AccountItem) => void;
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

export function AccountCard({
  account,
  isSelected = false,
  onClick,
  onEdit,
  onDelete,
}: AccountCardProps) {
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
        {(onEdit || onDelete) && (
          <div className={styles.actions}>
            {onEdit && (
              <button
                type="button"
                className={styles.actionBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(account);
                }}
                title="Modificar cuenta"
                aria-label={`Modificar ${account.name}`}
              >
                <Pencil size={13} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(account);
                }}
                title="Eliminar cuenta"
                aria-label={`Eliminar ${account.name}`}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
