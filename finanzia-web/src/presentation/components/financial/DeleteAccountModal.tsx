'use client';

import React, { useState } from 'react';
import { Modal } from '@/presentation/components/ui/Modal';
import { Badge } from '@/presentation/components/ui/Badge';
import { MoneyDisplay } from './MoneyDisplay';
import { Trash2, AlertTriangle, CreditCard } from 'lucide-react';
import type { AccountItem, AccountType } from '@/infrastructure/api/accounts.api';
import styles from './DeleteAccountModal.module.css';

export interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  account: AccountItem | null;
}

const TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: 'Cuenta Corriente',
  SAVINGS: 'Cuenta de Ahorro',
  CREDIT_CARD: 'Tarjeta de Crédito',
  CASH: 'Efectivo',
  INVESTMENT: 'Inversión',
};

export function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
  account,
}: DeleteAccountModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!account) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const typeLabel = TYPE_LABELS[account.type] || account.type;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="¿Eliminar cuenta financiera?"
      description="Por favor, confirma la eliminación de la cuenta seleccionada."
      size="md"
    >
      <div className={styles.container}>
        <div className={styles.warningBox}>
          <AlertTriangle size={18} className={styles.warningIcon} />
          <span>
            Esta cuenta se archivará y dejará de aparecer en tus listas activas.
            El historial de movimientos y transacciones previas se mantendrá protegido para
            garantizar la integridad contable.
          </span>
        </div>

        <div className={styles.singleCard}>
          <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
            <span className={styles.fieldLabel}>Cuenta Financiera</span>
            <div className={styles.accountTitle}>
              <div className={styles.iconWrap}>
                <CreditCard size={18} />
              </div>
              <span>{account.name}</span>
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Tipo de Cuenta</span>
            <div>
              <Badge variant="transfer" size="sm">
                {typeLabel}
              </Badge>
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Saldo Actual</span>
            <div className={styles.fieldValue}>
              <MoneyDisplay cents={account.currentBalanceCents} size="md" colorCoded={false} />
            </div>
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
            {isDeleting ? 'Eliminando...' : 'Eliminar cuenta'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
