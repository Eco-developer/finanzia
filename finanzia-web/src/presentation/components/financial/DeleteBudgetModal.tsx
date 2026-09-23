'use client';

import React, { useState } from 'react';
import { Modal } from '@/presentation/components/ui/Modal';
import { Badge } from '@/presentation/components/ui/Badge';
import { MoneyDisplay } from './MoneyDisplay';
import { Trash2, AlertTriangle } from 'lucide-react';
import type { BudgetPacingItem } from '@/infrastructure/api/budgets.api';
import styles from './DeleteBudgetModal.module.css';

export interface DeleteBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  budget: BudgetPacingItem | null;
}

export function DeleteBudgetModal({
  isOpen,
  onClose,
  onConfirm,
  budget,
}: DeleteBudgetModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!budget) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  let statusBadgeVariant: 'success' | 'warning' | 'danger' = 'success';
  let statusText = 'En regla';
  if (budget.status === 'EXCEEDED' || budget.percentageUsed >= 90) {
    statusBadgeVariant = 'danger';
    statusText = budget.percentageUsed > 100 ? 'Superado' : 'Alerta crítica';
  } else if (budget.status === 'WARNING' || budget.percentageUsed >= 70) {
    statusBadgeVariant = 'warning';
    statusText = 'Atención';
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="¿Eliminar presupuesto?"
      description="Por favor, confirma la eliminación del presupuesto mensual seleccionado."
      size="md"
    >
      <div className={styles.container}>
        <div className={styles.warningBox}>
          <AlertTriangle size={18} className={styles.warningIcon} />
          <span>
            Esta acción eliminará el límite presupuestario y las alertas para esta
            categoría. Las transacciones registradas no se verán afectadas ni se eliminarán.
          </span>
        </div>

        <div className={styles.singleCard}>
          <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
            <span className={styles.fieldLabel}>Categoría</span>
            <div className={styles.fieldValue}>
              <div
                className={styles.categoryTag}
                style={{
                  borderColor: budget.categoryColorHex || 'rgba(255, 255, 255, 0.2)',
                }}
              >
                <span>{budget.categoryIcon || '🎯'}</span>
                <span>{budget.categoryName}</span>
              </div>
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Límite mensual</span>
            <div className={styles.fieldValue}>
              <MoneyDisplay cents={budget.amountLimitCents} size="md" colorCoded={false} />
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Consumo actual</span>
            <div className={styles.fieldValue}>
              <MoneyDisplay cents={budget.spentCents} size="md" colorCoded={false} />
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Estado</span>
            <div>
              <Badge variant={statusBadgeVariant} size="sm">
                {budget.percentageUsed.toFixed(1)}% · {statusText}
              </Badge>
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Umbral de Alerta</span>
            <span className={styles.fieldValue} style={{ fontSize: '0.875rem' }}>
              Al {budget.alertThresholdPct}% de gasto
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
            {isDeleting ? 'Eliminando...' : 'Eliminar presupuesto'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
