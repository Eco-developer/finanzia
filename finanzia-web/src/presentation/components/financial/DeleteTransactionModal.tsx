'use client';

import React, { useState } from 'react';
import { Modal } from '@/presentation/components/ui/Modal';
import { Badge } from '@/presentation/components/ui/Badge';
import { MoneyDisplay } from './MoneyDisplay';
import { Trash2, AlertTriangle } from 'lucide-react';
import type { TransactionItem } from '@/infrastructure/api/transactions.api';
import type { AccountItem } from '@/infrastructure/api/accounts.api';
import type { CategoryItem } from '@/infrastructure/api/categories.api';
import styles from './DeleteTransactionModal.module.css';

export interface DeleteTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  transactions: TransactionItem[];
  accounts: AccountItem[];
  categories: CategoryItem[];
}

export function DeleteTransactionModal({
  isOpen,
  onClose,
  onConfirm,
  transactions,
  accounts,
  categories,
}: DeleteTransactionModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const count = transactions.length;
  const isMultiple = count > 1;

  const totalCents = transactions.reduce((acc, t) => acc + t.amountCents, 0);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isMultiple ? `¿Eliminar ${count} transacciones?` : '¿Eliminar transacción?'}
      description="Por favor, confirma la eliminación del movimiento seleccionado."
      size={isMultiple ? 'lg' : 'md'}
    >
      <div className={styles.container}>
        <div className={styles.warningBox}>
          <AlertTriangle size={18} className={styles.warningIcon} />
          <span>
            Esta acción eliminará de forma irreversible el movimiento y revertirá
            automáticamente el saldo en la cuenta correspondiente.
          </span>
        </div>

        {!isMultiple && transactions[0] ? (
          (() => {
            const tx = transactions[0];
            const accountName = accountMap.get(tx.accountId) || 'Cuenta no encontrada';
            const categoryName = tx.categoryId ? categoryMap.get(tx.categoryId) : null;

            return (
              <div className={styles.singleCard}>
                <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                  <span className={styles.fieldLabel}>Concepto / Detalle</span>
                  <span className={styles.fieldValue}>{tx.description}</span>
                </div>

                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Cuenta</span>
                  <span className={styles.fieldValue}>{accountName}</span>
                </div>

                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Categoría</span>
                  <div>
                    {categoryName ? (
                      <Badge variant={tx.type === 'INCOME' ? 'income' : 'expense'} size="sm">
                        {categoryName}
                      </Badge>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Sin categoría
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                  <span className={styles.fieldLabel}>Importe</span>
                  <MoneyDisplay cents={tx.amountCents} size="md" />
                </div>
              </div>
            );
          })()
        ) : (
          <div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th>Cuenta</th>
                    <th>Categoría</th>
                    <th style={{ textAlign: 'right' }}>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const accountName = accountMap.get(tx.accountId) || 'Cuenta';
                    const categoryName = tx.categoryId ? categoryMap.get(tx.categoryId) : null;

                    return (
                      <tr key={tx.id}>
                        <td style={{ fontWeight: 500 }}>{tx.description}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{accountName}</td>
                        <td>
                          {categoryName ? (
                            <Badge variant={tx.type === 'INCOME' ? 'income' : 'expense'} size="sm">
                              {categoryName}
                            </Badge>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <MoneyDisplay cents={tx.amountCents} size="sm" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.totalSummary}>
              <span>Total seleccionadas: <strong>{count}</strong></span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span>Impacto neto:</span>
                <MoneyDisplay cents={totalCents} size="sm" />
              </div>
            </div>
          </div>
        )}

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
            {isDeleting
              ? 'Eliminando...'
              : isMultiple
              ? `Eliminar ${count} transacciones`
              : 'Eliminar transacción'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
