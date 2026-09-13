'use client';

import React from 'react';
import { MoneyDisplay } from './MoneyDisplay';
import { Badge } from '@/presentation/components/ui/Badge';
import { Landmark, PiggyBank, CreditCard, Wallet, TrendingUp } from 'lucide-react';
import { AccountItem, AccountType } from '@/infrastructure/api/accounts.api';
import styles from './AccountCard.module.css';

interface AccountCardProps {
  account: AccountItem;
  isSelected?: boolean;
  onClick?: () => void;
}

const TYPE_ICONS: Record<AccountType, React.ReactNode> = {
  CHECKING: <Landmark size={18} />,
  SAVINGS: <PiggyBank size={18} />,
  CREDIT_CARD: <CreditCard size={18} />,
  CASH: <Wallet size={18} />,
  INVESTMENT: <TrendingUp size={18} />,
};

const TYPE_NAMES: Record<AccountType, string> = {
  CHECKING: 'Corriente',
  SAVINGS: 'Ahorro',
  CREDIT_CARD: 'Tarjeta',
  CASH: 'Efectivo',
  INVESTMENT: 'Inversión',
};

export function AccountCard({ account, isSelected = false, onClick }: AccountCardProps) {
  return (
    <div
      className={`${styles.card} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={styles.topRow}>
        <div className={styles.iconWrapper}>{TYPE_ICONS[account.type] || <Landmark size={18} />}</div>
        <Badge variant="neutral" size="sm">
          {TYPE_NAMES[account.type] || account.type}
        </Badge>
      </div>

      <div className={styles.info}>
        <h3 className={styles.accountName}>{account.name}</h3>
        <div className={styles.balance}>
          <MoneyDisplay cents={account.currentBalanceCents} size="md" colorCoded={false} />
        </div>
      </div>
    </div>
  );
}
