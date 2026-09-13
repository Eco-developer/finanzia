'use client';

import React from 'react';
import { MoneyDisplay } from './MoneyDisplay';
import { Badge } from '@/presentation/components/ui/Badge';
import { Trash2, ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react';
import { TransactionItem } from '@/infrastructure/api/transactions.api';
import { AccountItem } from '@/infrastructure/api/accounts.api';
import { CategoryItem } from '@/infrastructure/api/categories.api';
import styles from './TransactionTable.module.css';

interface TransactionTableProps {
  transactions: TransactionItem[];
  accounts: AccountItem[];
  categories: CategoryItem[];
  onDelete: (id: string) => Promise<void>;
  isLoading?: boolean;
}

export function TransactionTable({
  transactions,
  accounts,
  categories,
  onDelete,
  isLoading = false,
}: TransactionTableProps) {
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Cargando transacciones...</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyIcon}>💳</div>
        <h3 className={styles.emptyTitle}>Sin transacciones todavía</h3>
        <p className={styles.emptySubtitle}>
          Registra tus primeros ingresos, gastos o transferencias para ver el histórico detallado.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Concepto / Detalle</th>
            <th>Categoría</th>
            <th>Cuenta</th>
            <th style={{ textAlign: 'right' }}>Importe</th>
            <th style={{ textAlign: 'center', width: '50px' }}>Acción</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => {
            const categoryName = tx.categoryId ? categoryMap.get(tx.categoryId) || 'General' : null;
            const accountName = accountMap.get(tx.accountId) || 'Cuenta';

            return (
              <tr key={tx.id} className={styles.row}>
                <td className={styles.dateCell}>{formatDate(tx.transactionDate)}</td>
                <td className={styles.descCell}>
                  <div className={styles.descWrapper}>
                    <span
                      className={`${styles.typeIcon} ${
                        tx.type === 'INCOME'
                          ? styles.typeIncome
                          : tx.type === 'TRANSFER'
                          ? styles.typeTransfer
                          : styles.typeExpense
                      }`}
                    >
                      {tx.type === 'INCOME' ? (
                        <ArrowDownLeft size={14} />
                      ) : tx.type === 'TRANSFER' ? (
                        <ArrowLeftRight size={14} />
                      ) : (
                        <ArrowUpRight size={14} />
                      )}
                    </span>
                    <span className={styles.descriptionText}>{tx.description}</span>
                  </div>
                </td>
                <td>
                  {categoryName ? (
                    <Badge variant={tx.type === 'INCOME' ? 'income' : 'expense'} size="sm">
                      {categoryName}
                    </Badge>
                  ) : tx.type === 'TRANSFER' ? (
                    <Badge variant="ai" size="sm">
                      Traspaso
                    </Badge>
                  ) : (
                    <span className={styles.mutedText}>Sin categoría</span>
                  )}
                </td>
                <td className={styles.accountCell}>{accountName}</td>
                <td style={{ textAlign: 'right' }}>
                  <MoneyDisplay cents={tx.amountCents} size="sm" />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => {
                      if (confirm('¿Eliminar esta transacción y revertir el saldo de la cuenta?')) {
                        onDelete(tx.id);
                      }
                    }}
                    title="Eliminar transacción y revertir saldo"
                    aria-label={`Eliminar ${tx.description}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
