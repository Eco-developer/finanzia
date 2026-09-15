import React from 'react';
import styles from './Badge.module.css';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'income' | 'expense' | 'transfer' | 'warning' | 'ai' | 'neutral' | 'success';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md'
}) => {
  const variantClass = styles[variant] || styles.neutral;
  return (
    <span className={`${styles.badge} ${variantClass} ${styles[size]}`}>
      <span className={styles.dot} />
      {children}
    </span>
  );
};
