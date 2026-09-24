'use client';

import React from 'react';
import { DebtItem } from '@/infrastructure/api/debts.api';
import { MoneyDisplay } from './MoneyDisplay';
import { Lock, ShieldCheck, CheckCircle2, History } from 'lucide-react';
import styles from './DebtHistoryTable.module.css';

interface DebtHistoryTableProps {
  debts: DebtItem[];
}

export const DebtHistoryTable: React.FC<DebtHistoryTableProps> = ({ debts }) => {
  return (
    <div className={styles.container}>
      {/* Banner Informativo de Inmutabilidad */}
      <div className={styles.banner}>
        <ShieldCheck size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Historial Protegido de Deudas Liquidadas:</strong>
          <div>
            Cuando el saldo pendiente de una deuda llega a cero, el registro se sella de forma inmutable con fecha y hora exacta. Queda protegido contra modificaciones o eliminaciones accidentales para garantizar la integridad contable y la trazabilidad financiera.
          </div>
        </div>
      </div>

      <div className={styles.tableWrap}>
        {debts.length === 0 ? (
          <div className={styles.emptyState}>
            <History size={36} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
            <div>Aún no tienes deudas amortizadas al 100% en tu historial inmutable.</div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: '#475569' }}>
              Cuando amortices por completo un pasivo activo, aparecerá archivado aquí de forma automática.
            </div>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Concepto / Entidad</th>
                <th>Importe Original</th>
                <th>Total Amortizado</th>
                <th>Fecha de Liquidación</th>
                <th>Amortizaciones</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {debts.map((debt) => {
                const paidOffDate = debt.paidOffAt
                  ? new Date(debt.paidOffAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Liquidada';

                return (
                  <tr key={debt.id}>
                    <td>
                      <div className={styles.conceptCell}>
                        <span className={styles.conceptName}>{debt.concept}</span>
                        {debt.creditor && (
                          <span className={styles.creditorName}>{debt.creditor}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <MoneyDisplay
                        cents={Number(debt.initialAmountCents)}
                        colorCoded={false}
                        size="sm"
                      />
                    </td>
                    <td>
                      <MoneyDisplay
                        cents={Number(debt.paidAmountCents || debt.initialAmountCents)}
                        colorCoded={false}
                        size="sm"
                      />
                    </td>
                    <td>{paidOffDate}</td>
                    <td>{debt.amortizations?.length || 1} abonos</td>
                    <td>
                      <div className={styles.paidOffBadge}>
                        <Lock size={12} />
                        <span>100% Pagada (Inmutable)</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
