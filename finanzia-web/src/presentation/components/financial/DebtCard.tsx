'use client';

import React from 'react';
import type { DebtItem } from '@/presentation/hooks/useDebts';
import { MoneyDisplay } from './MoneyDisplay';
import { RadixProgress } from '../ui/RadixProgress';
import {
  CreditCard,
  Building,
  Percent,
  Calendar,
  Lock,
  PlusCircle,
  Pencil,
  Trash2,
  CheckCircle2,
  TrendingDown,
} from 'lucide-react';
import styles from './DebtCard.module.css';

export interface DebtCardProps {
  debt: DebtItem;
  onAmortize: (debt: DebtItem) => void;
  onEdit?: (debt: DebtItem) => void;
  onDelete?: (debt: DebtItem) => void;
}

export const DebtCard: React.FC<DebtCardProps> = ({
  debt,
  onAmortize,
  onEdit,
  onDelete,
}) => {
  const {
    id,
    concept,
    creditor,
    initialAmountCents,
    remainingAmountCents,
    progressPercentage,
    interestRateBasisPts,
    interestRateType,
    estimatedMonthlyInterestCents,
    minimumMonthlyPaymentCents,
    dueDate,
    status,
    isImmutable,
  } = debt;

  const isPaidOff = status === 'PAID_OFF' || isImmutable;
  const ratePercent = (interestRateBasisPts / 100).toFixed(2).replace('.', ',');
  const formattedDueDate = dueDate
    ? new Date(dueDate).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div
      className={`${styles.card} ${isPaidOff ? styles.completedCard : ''}`}
      data-testid={`debt-card-${id}`}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div
            className={`${styles.iconWrap} ${
              isPaidOff ? styles.completedIconWrap : ''
            }`}
          >
            {isPaidOff ? (
              <CheckCircle2 size={22} />
            ) : (
              <TrendingDown size={22} />
            )}
          </div>
          <div>
            <h3 className={styles.conceptTitle}>{concept}</h3>
            {creditor && (
              <div className={styles.creditorBadge}>
                <Building size={13} />
                <span>{creditor}</span>
              </div>
            )}
          </div>
        </div>

        {isPaidOff ? (
          <div className={styles.immutableBadge} title="Deuda amortizada al 100%. Blindada en historial inmutable.">
            <Lock size={12} />
            <span>100% Pagada</span>
          </div>
        ) : (
          <div className={styles.rateBadge}>
            {ratePercent}% {interestRateType === 'MONTHLY' ? 'mensual' : 'TAE'}
          </div>
        )}
      </div>

      {/* Grid de Importes */}
      <div className={styles.amountGrid}>
        <div className={styles.amountBox}>
          <span className={styles.amountLabel}>Saldo Vivo</span>
          <div className={isPaidOff ? styles.paidOffAmount : styles.remainingAmount}>
            <MoneyDisplay
              cents={Number(remainingAmountCents)}
              colorCoded={false}
              size="lg"
            />
          </div>
        </div>
        <div className={styles.amountBox}>
          <span className={styles.amountLabel}>Importe Original</span>
          <div className={styles.initialAmount}>
            <MoneyDisplay
              cents={Number(initialAmountCents)}
              colorCoded={false}
              size="md"
            />
          </div>
        </div>
      </div>

      {/* Barra de progreso de amortización */}
      <div className={styles.progressSection}>
        <div className={styles.progressMeta}>
          <span className={styles.progressLabel}>Progreso amortizado</span>
          <span className={styles.progressPercent}>{progressPercentage.toFixed(1)}%</span>
        </div>
        <RadixProgress value={progressPercentage} />
      </div>

      {/* Detalles complementarios */}
      <div className={styles.detailsGrid}>
        <div>
          <span>Cuota mensual: </span>
          <strong>
            {minimumMonthlyPaymentCents ? (
              <MoneyDisplay
                cents={Number(minimumMonthlyPaymentCents)}
                colorCoded={false}
                size="sm"
              />
            ) : (
              'Flexible'
            )}
          </strong>
        </div>

        <div>
          <span>Coste intereses: </span>
          <strong>
            ~
            <MoneyDisplay
              cents={Number(estimatedMonthlyInterestCents)}
              colorCoded={false}
              size="sm"
            />
            /mes
          </strong>
        </div>

        {formattedDueDate && (
          <div className={styles.detailItem} style={{ gridColumn: 'span 2' }}>
            <Calendar size={13} />
            <span>Vencimiento: <strong>{formattedDueDate}</strong></span>
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.amortizeBtn}
          onClick={() => onAmortize(debt)}
          disabled={isPaidOff}
          title={isPaidOff ? 'Deuda 100% amortizada' : 'Amortizar capital o intereses'}
        >
          <PlusCircle size={16} />
          <span>{isPaidOff ? 'Totalmente Amortizada' : 'Amortizar'}</span>
        </button>

        {onEdit && (
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => onEdit(debt)}
            disabled={isPaidOff}
            title={isPaidOff ? 'Historial inmutable: edición bloqueada' : 'Editar datos de deuda'}
            aria-label="Editar deuda"
          >
            {isPaidOff ? <Lock size={15} /> : <Pencil size={15} />}
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
            onClick={() => onDelete(debt)}
            disabled={isPaidOff}
            title={isPaidOff ? 'Historial inmutable: eliminación prohibida' : 'Eliminar deuda'}
            aria-label="Eliminar deuda"
          >
            {isPaidOff ? <Lock size={15} /> : <Trash2 size={15} />}
          </button>
        )}
      </div>
    </div>
  );
};
