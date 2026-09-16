'use client';

import React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import styles from './RadixProgress.module.css';

export interface RadixProgressProps {
  value: number; // 0 a 100
  max?: number;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  indicatorClassName?: string;
  indicatorStyle?: React.CSSProperties;
}

export const RadixProgress: React.FC<RadixProgressProps> = ({
  value,
  max = 100,
  variant = 'primary',
  size = 'md',
  className = '',
  indicatorClassName = '',
  indicatorStyle,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <ProgressPrimitive.Root
      className={`${styles.root} ${styles[size]} ${className}`}
      value={value}
      max={max}
    >
      <ProgressPrimitive.Indicator
        className={`${styles.indicator} ${styles[variant]} ${indicatorClassName}`}
        style={{
          transform: `translateX(-${100 - percentage}%)`,
          ...indicatorStyle,
        }}
      />
    </ProgressPrimitive.Root>
  );
};
