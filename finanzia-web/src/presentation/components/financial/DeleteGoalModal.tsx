'use client';

import React, { useState } from 'react';
import { Modal } from '@/presentation/components/ui/Modal';
import { Badge } from '@/presentation/components/ui/Badge';
import { MoneyDisplay } from './MoneyDisplay';
import { Trash2, AlertTriangle, Trophy, Sparkles, Calendar } from 'lucide-react';
import type { GoalItem } from '@/infrastructure/api/goals.api';
import styles from './DeleteGoalModal.module.css';

export interface DeleteGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  goal: GoalItem | null;
}

export function DeleteGoalModal({
  isOpen,
  onClose,
  onConfirm,
  goal,
}: DeleteGoalModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!goal) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const formattedDate = goal.targetDate
    ? new Date(goal.targetDate).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="¿Eliminar meta de ahorro?"
      description="Por favor, confirma la eliminación del objetivo seleccionado."
      size="md"
    >
      <div className={styles.container}>
        <div className={styles.warningBox}>
          <AlertTriangle size={18} className={styles.warningIcon} />
          <span>
            Esta acción eliminará de forma permanente esta meta de ahorro y su historial de
            progreso. Los saldos en tus cuentas bancarias no se modificarán.
          </span>
        </div>

        <div className={styles.singleCard}>
          <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
            <span className={styles.fieldLabel}>Meta de ahorro</span>
            <div className={styles.goalTitle}>
              <div
                className={`${styles.iconWrap} ${
                  goal.isCompleted ? styles.completedIconWrap : ''
                }`}
              >
                {goal.isCompleted ? (
                  <Trophy size={18} color="#10b981" />
                ) : (
                  <Sparkles size={18} color="#a855f7" />
                )}
              </div>
              <span>{goal.name}</span>
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Objetivo total</span>
            <div className={styles.fieldValue}>
              <MoneyDisplay cents={goal.targetAmountCents} size="md" colorCoded={false} />
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Ahorrado acumulado</span>
            <div className={styles.fieldValue}>
              <MoneyDisplay cents={goal.currentAmountCents} size="md" colorCoded={false} />
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Progreso</span>
            <div>
              <Badge
                variant={goal.isCompleted ? 'success' : 'primary'}
                size="sm"
              >
                {goal.isCompleted ? '✓ Cumplida' : `${goal.progressPercentage.toFixed(1)}%`}
              </Badge>
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Fecha objetivo</span>
            <span className={styles.fieldValue} style={{ fontSize: '0.85rem' }}>
              {formattedDate ? (
                <>
                  <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                  {formattedDate}
                </>
              ) : (
                'Sin fecha límite'
              )}
            </span>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            <Trash2 size={16} />
            {isDeleting ? 'Eliminando...' : 'Eliminar meta'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
