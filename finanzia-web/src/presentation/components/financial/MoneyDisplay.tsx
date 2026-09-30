import React from 'react';
import { formatCentsToCurrency } from '@/core/domain/formatters/money.formatter';
import styles from './MoneyDisplay.module.css';

export interface MoneyDisplayProps {
  cents?: number | bigint | string;
  amountCents?: number | bigint | string;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showSign?: boolean;
  colorCoded?: boolean;
  className?: string;
}

const SIZE_CLASS_MAP: Record<string, string> = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
  xl: styles.xl,
  '2xl': styles.xxl,
};

export const MoneyDisplay: React.FC<MoneyDisplayProps> = ({
  cents,
  amountCents,
  currency = 'EUR',
  size = 'md',
  showSign = false,
  colorCoded = true,
  className = ''
}) => {
  const value = cents !== undefined ? cents : (amountCents !== undefined ? amountCents : 0);
  const numCents = typeof value === 'bigint' ? Number(value) : (typeof value === 'string' ? Number(value) : value);
  const formatted = formatCentsToCurrency(numCents, { currency, showSign });

  let toneClass = styles.neutral;
  if (colorCoded) {
    if (numCents > 0) toneClass = styles.income;
    if (numCents < 0) toneClass = styles.expense;
  }

  const sizeClass = SIZE_CLASS_MAP[size] || styles.md;

  return (
    <span
      className={`${styles.moneyDisplay} ${toneClass} ${sizeClass} ${className}`}
      data-testid="money-display"
      data-cents={numCents}
    >
      {formatted}
    </span>
  );
};
