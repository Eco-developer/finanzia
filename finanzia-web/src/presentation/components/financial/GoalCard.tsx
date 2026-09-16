'use client';

import React from 'react';
import { GoalItem } from '@/infrastructure/api/goals.api';
import { MoneyDisplay } from './MoneyDisplay';
import { RadixProgress } from '../ui/RadixProgress';
import { PlusCircle, Calendar, Trophy, Sparkles } from 'lucide-react';
import styles from './GoalCard.module.css';

export interface GoalCardProps {
  goal: GoalItem;
  onContribute: (goal: GoalItem) => void;
  onEdit?: (goal: GoalItem) => void;
  onDelete?: (goalId: string) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  onContribute,
  onEdit,
  onDelete,
}) => {
  const {
    id,
    name,
    targetAmountCents,
    currentAmountCents,
    remainingCents,
    progressPercentage,
    targetDate,
    daysRemaining,
    isCompleted,
  } = goal;

  const formattedDate = targetDate
    ? new Date(targetDate).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div
      className={`${styles.card} ${isCompleted ? styles.completedCard : ''}`}
      data-testid={`goal-card-${id}`}
    >
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div
            className={`${styles.iconWrap} ${
              isCompleted ? styles.completedIconWrap : ''
            }`}
          >
            {isCompleted ? <Trophy size={20} color="#10b981" /> : <Sparkles size={20} color="#a855f7" />}
          </div>
          <div>
            <h3 className={styles.name}>{name}</h3>
            {formattedDate && (
              <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <Calendar size={12} /> Meta: {formattedDate}
              </span>
            )}
          </div>
        </div>

        <span className={isCompleted ? styles.badgeCompleted : styles.badgeActive}>
          {isCompleted ? '✓ Cumplida' : `${progressPercentage.toFixed(1)}%`}
        </span>
      </div>

      {/* Barra de progreso y montos */}
      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <div className={styles.currentText}>
            <MoneyDisplay cents={currentAmountCents} colorCoded={false} />
          </div>
          <div className={styles.targetText}>
            de <MoneyDisplay cents={targetAmountCents} colorCoded={false} />
          </div>
        </div>

        <div className={styles.progressTrack}>
          <RadixProgress
            value={Math.min(100, progressPercentage)}
            max={100}
            size="md"
            indicatorClassName={`${styles.progressBar} ${
              isCompleted ? styles.progressCompleted : ''
            }`}
          />
        </div>

        <div className={styles.metaRow}>
          <span>
            {isCompleted ? (
              <strong style={{ color: '#10b981' }}>¡Objetivo alcanzado!</strong>
            ) : (
              <>
                Faltan:{' '}
                <strong className={styles.highlightMeta}>
                  <MoneyDisplay cents={remainingCents} colorCoded={false} />
                </strong>
              </>
            )}
          </span>

          {daysRemaining !== null && !isCompleted && (
            <span>
              {daysRemaining > 0 ? `${daysRemaining} días restantes` : 'Fecha límite alcanzada'}
            </span>
          )}
        </div>
      </div>

      {/* Botones de acción */}
      <div className={styles.actions}>
        {!isCompleted ? (
          <button
            type="button"
            className={styles.btnContribute}
            onClick={() => onContribute(goal)}
          >
            <PlusCircle size={16} /> Aportar Fondos
          </button>
        ) : (
          <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>
            🎉 Meta completada con éxito
          </span>
        )}

        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {onEdit && (
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => onEdit(goal)}
            >
              Editar
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className={`${styles.btnSecondary} ${styles.btnDelete}`}
              onClick={() => onDelete(id)}
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
