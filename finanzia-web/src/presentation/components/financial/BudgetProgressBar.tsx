'use client';

import React from 'react';
import { BudgetPacingItem } from '@/infrastructure/api/budgets.api';
import { MoneyDisplay } from './MoneyDisplay';
import { RadixProgress } from '../ui/RadixProgress';
import styles from './BudgetProgressBar.module.css';

export interface BudgetProgressBarProps {
  item: BudgetPacingItem;
  onEdit?: (item: BudgetPacingItem) => void;
  onDelete?: (budgetId: string) => void;
}

export const BudgetProgressBar: React.FC<BudgetProgressBarProps> = ({
  item,
  onEdit,
  onDelete,
}) => {
  const {
    budgetId,
    categoryName,
    categoryColorHex,
    categoryIcon,
    amountLimitCents,
    spentCents,
    remainingCents,
    percentageUsed,
    status,
  } = item;

  // Convención de colores según CA-04.2
  let statusBadgeClass = styles.badgeOnTrack;
  let progressBarClass = styles.barOnTrack;
  let statusLabel = 'En regla';

  if (status === 'EXCEEDED' || percentageUsed >= 90) {
    statusBadgeClass = styles.badgeExceeded;
    progressBarClass = styles.barExceeded;
    statusLabel = percentageUsed > 100 ? 'Superado' : 'Alerta crítica';
  } else if (status === 'WARNING' || percentageUsed >= 70) {
    statusBadgeClass = styles.badgeWarning;
    progressBarClass = styles.barWarning;
    statusLabel = 'Atención';
  }

  const clampedPercentage = Math.min(100, Math.max(0, percentageUsed));
  const isOverBudget = spentCents > amountLimitCents;
  const overAmount = spentCents - amountLimitCents;

  return (
    <div className={styles.card} data-testid={`budget-card-${budgetId}`}>
      <div className={styles.cardHeader}>
        <div className={styles.categoryGroup}>
          <div
            className={styles.categoryBadge}
            style={{
              borderColor: categoryColorHex || 'rgba(255, 255, 255, 0.15)',
              color: categoryColorHex || '#10b981',
            }}
          >
            {categoryIcon || '🎯'}
          </div>
          <span className={styles.categoryName}>{categoryName}</span>
        </div>
        <span className={`${styles.badge} ${statusBadgeClass}`}>
          {percentageUsed.toFixed(1)}% · {statusLabel}
        </span>
      </div>

      {/* Barra de progreso accesible con Radix UI */}
      <div className={styles.progressTrack}>
        <RadixProgress
          value={clampedPercentage}
          max={100}
          size="md"
          indicatorClassName={`${styles.progressBar} ${progressBarClass}`}
        />
      </div>

      {/* Footer con cifras monetarias */}
      <div className={styles.cardFooter}>
        <div className={styles.amountGroup}>
          <span className={styles.amountSpent}>
            <MoneyDisplay cents={spentCents} colorCoded={false} />
          </span>
          <span className={styles.amountLimit}>
            / <MoneyDisplay cents={amountLimitCents} colorCoded={false} />
          </span>
        </div>

        <div className={styles.remainingInfo}>
          {isOverBudget ? (
            <>
              <span className={styles.remainingLabel}>Exceso:</span>
              <span className={`${styles.remainingValue} ${styles.remainingOver}`}>
                +<MoneyDisplay cents={overAmount} colorCoded={false} />
              </span>
            </>
          ) : (
            <>
              <span className={styles.remainingLabel}>Disponible:</span>
              <span className={`${styles.remainingValue} ${styles.remainingPositive}`}>
                <MoneyDisplay cents={remainingCents} colorCoded={false} />
              </span>
            </>
          )}
        </div>
      </div>

      {/* Acciones */}
      {(onEdit || onDelete) && (
        <div className={styles.actionsRow}>
          {onEdit && (
            <button
              type="button"
              className={styles.btnAction}
              onClick={() => onEdit(item)}
            >
              Editar límite
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className={`${styles.btnAction} ${styles.btnDelete}`}
              onClick={() => onDelete(budgetId)}
            >
              Eliminar
            </button>
          )}
        </div>
      )}
    </div>
  );
};
