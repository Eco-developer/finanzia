'use client';

import React, { useState } from 'react';
import { Modal } from '@/presentation/components/ui/Modal';
import { Button } from '@/presentation/components/ui/Button';
import { MoneyDisplay } from './MoneyDisplay';
import { debtsApi, DebtItem } from '@/infrastructure/api/debts.api';
import { AlertTriangle, Trash2, Lock } from 'lucide-react';
import styles from './DeleteDebtModal.module.css';

interface DeleteDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  debt: DebtItem | null;
}

export function DeleteDebtModal({
  isOpen,
  onClose,
  onSuccess,
  debt,
}: DeleteDebtModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!debt) return null;

  const isImmutable = debt.isImmutable || debt.status === 'PAID_OFF';

  const handleDelete = async () => {
    if (isImmutable) {
      setError('Esta deuda está sellada al 100% en el historial inmutable y no puede eliminarse.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await debtsApi.deleteDebt(debt.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar la deuda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isImmutable ? 'Deuda Protegida en Historial Inmutable' : 'Eliminar Deuda o Préstamo'}
    >
      <div className={styles.modalBody}>
        {error && <div className={styles.errorBanner}>{error}</div>}

        {isImmutable ? (
          <div className={styles.warningBox}>
            <Lock size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Operación Prohibida:</strong>
              <div>
                Esta deuda ha sido amortizada en su totalidad y forma parte del historial inmutable de FinanZIA. Por directrices de trazabilidad y auditoría financiera, ningún registro liquidado puede eliminarse.
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.warningBox}>
            <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>¿Estás seguro de que deseas eliminar este pasivo?</strong>
              <div>
                Esta acción eliminará el registro de la deuda activa y su cronograma de amortizaciones asociadas.
              </div>
            </div>
          </div>
        )}

        <div className={styles.debtInfo}>
          <div>
            <div className={styles.debtConcept}>{debt.concept}</div>
            {debt.creditor && (
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                {debt.creditor}
              </div>
            )}
          </div>
          <div className={styles.debtAmount}>
            <MoneyDisplay
              cents={Number(debt.remainingAmountCents)}
              colorCoded={false}
              size="md"
            />
          </div>
        </div>

        <div className={styles.actions}>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {isImmutable ? 'Entendido' : 'Cancelar'}
          </Button>

          {!isImmutable && (
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={handleDelete}
              disabled={isLoading}
            >
              <Trash2 size={16} />
              <span>{isLoading ? 'Eliminando...' : 'Eliminar Deuda'}</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
