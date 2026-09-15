'use client';

import React from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { MoneyDisplay } from '../financial/MoneyDisplay';
import { CommitImportResult } from '@/infrastructure/api/imports.api';
import styles from './ImportSummaryModal.module.css';

export interface ImportSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: CommitImportResult | null;
  accountName?: string;
  onGoToDashboard: () => void;
}

export const ImportSummaryModal: React.FC<ImportSummaryModalProps> = ({
  isOpen,
  onClose,
  result,
  accountName,
  onGoToDashboard,
}) => {
  if (!result) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Conciliación Completada" size="md">
      <div className={styles.content}>
        <div className={styles.successIconWrapper}>
          <CheckCircle2 size={40} />
        </div>

        <h3 className={styles.title}>¡Importación Completada!</h3>
        <p className={styles.subtitle}>
          Se han procesado y conciliado tus transacciones bancarias correctamente
          {accountName ? ` en la cuenta "${accountName}"` : ''}.
        </p>

        <div className={styles.summaryCards}>
          <div className={styles.summaryCard}>
            <span className={styles.cardLabel}>Importadas</span>
            <span className={styles.cardValue} style={{ color: 'var(--brand-primary)' }}>
              {result.importedCount}
            </span>
          </div>

          <div className={styles.summaryCard}>
            <span className={styles.cardLabel}>Duplicados Omitidos</span>
            <span className={styles.cardValue} style={{ color: 'var(--status-warning)' }}>
              {result.skippedCount}
            </span>
          </div>
        </div>

        <div className={styles.balanceBox}>
          <span className={styles.balanceLabel}>Nuevo Saldo Consolidado:</span>
          <MoneyDisplay cents={result.newAccountBalanceCents} size="md" />
        </div>

        <div className={styles.modalActions}>
          <Button variant="primary" icon={<ArrowRight size={16} />} onClick={onGoToDashboard}>
            Volver al Dashboard
          </Button>
        </div>
      </div>
    </Modal>
  );
};
