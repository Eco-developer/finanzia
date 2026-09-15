'use client';

import React, { useState } from 'react';
import { Sparkles, CheckCircle2, X } from 'lucide-react';
import styles from './RecommendationCard.module.css';

interface RecommendationCardProps {
  title?: string;
  description?: string;
  onApprove?: () => void;
  onDismiss?: () => void;
}

export function RecommendationCard({
  title = "Potenciar Meta 'Fondo Emergencia'",
  description = 'Tienes un excedente de liquidez en tu cuenta corriente. Te recomendamos aportar 150,00 € a tu meta de ahorro.',
  onApprove,
  onDismiss,
}: RecommendationCardProps) {
  const [state, setState] = useState<'PROPOSED' | 'APPROVED' | 'DISMISSED'>('PROPOSED');

  const handleApprove = () => {
    setState('APPROVED');
    onApprove?.();
  };

  const handleDismiss = () => {
    setState('DISMISSED');
    onDismiss?.();
  };

  if (state === 'APPROVED') {
    return (
      <div className={`${styles.card} ${styles.statusApproved}`}>
        <div className={styles.headerRow}>
          <div className={styles.aiBadge}>
            <CheckCircle2 size={13} />
            <span>PROPUESTA APLICADA</span>
          </div>
        </div>
        <h4 className={styles.title}>{title}</h4>
        <p className={styles.description}>
          ✓ La recomendación ha sido verificada y registrada en el sistema.
        </p>
      </div>
    );
  }

  if (state === 'DISMISSED') {
    return (
      <div className={`${styles.card} ${styles.statusDismissed}`}>
        <div className={styles.headerRow}>
          <div className={styles.aiBadge}>
            <X size={13} />
            <span>DESCARTADA</span>
          </div>
          <button
            type="button"
            className={styles.dismissBtn}
            onClick={() => setState('PROPOSED')}
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.6875rem' }}
          >
            Restaurar
          </button>
        </div>
        <p className={styles.description}>
          Has descartado esta sugerencia. El asesor la considerará en tu próximo balance.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.headerRow}>
        <div className={styles.aiBadge}>
          <Sparkles size={13} />
          <span>⚡ FINANZIA AI PROPUESTA</span>
        </div>
      </div>

      <div>
        <h4 className={styles.title}>{title}</h4>
        <p className={styles.description}>{description}</p>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.approveBtn}
          onClick={handleApprove}
        >
          ✓ Aprobar y Aplicar
        </button>
        <button
          type="button"
          className={styles.dismissBtn}
          onClick={handleDismiss}
        >
          Descartar
        </button>
      </div>
    </div>
  );
}
