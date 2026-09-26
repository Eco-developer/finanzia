'use client';

import React, { useState } from 'react';
import { RecommendationItem } from '@/infrastructure/api/recommendations.api';
import styles from './RecommendationCard.module.css';

interface RecommendationCardProps {
  recommendation: RecommendationItem;
  onApply: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}

const TYPE_CONFIG = {
  BUDGET_ADJUSTMENT: {
    label: 'Ajuste Presupuestario',
    icon: '📊',
    color: '#818cf8',
    bg: 'rgba(99, 102, 241, 0.12)',
    border: 'rgba(99, 102, 241, 0.3)',
  },
  SAVINGS_BOOST: {
    label: 'Impulso de Ahorro',
    icon: '💰',
    color: '#34d399',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.3)',
  },
  EXPENSE_ALERT: {
    label: 'Alerta de Optimización',
    icon: '⚡',
    color: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.3)',
  },
  GOAL_CREATION: {
    label: 'Nueva Meta de Ahorro',
    icon: '🎯',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.3)',
  },
};

export function RecommendationCard({
  recommendation,
  onApply,
  onReject,
}: RecommendationCardProps) {
  const [isApplying, setIsApplying] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const cfg = TYPE_CONFIG[recommendation.type] || TYPE_CONFIG.BUDGET_ADJUSTMENT;
  const payload = recommendation.proposedAction || {};

  const handleApply = async () => {
    try {
      setIsApplying(true);
      await onApply(recommendation.id);
    } finally {
      setIsApplying(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsRejecting(true);
      await onReject(recommendation.id);
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span
          className={styles.typeBadge}
          style={{
            color: cfg.color,
            backgroundColor: cfg.bg,
            borderColor: cfg.border,
          }}
        >
          <span className={styles.typeIcon}>{cfg.icon}</span>
          {cfg.label}
        </span>
        <span className={styles.humanLoopBadge}>Supervisión Humana</span>
      </div>

      <h4 className={styles.title}>{recommendation.title}</h4>
      <p className={styles.details}>{recommendation.details}</p>

      {/* Resumen del cambio a aplicar */}
      <div className={styles.actionPreview}>
        <span className={styles.previewLabel}>Acción propuesta:</span>
        {payload.actionType === 'UPDATE_BUDGET_LIMIT' && payload.newLimitCents && (
          <span className={styles.previewValue}>
            Calibrar límite a{' '}
            <strong>
              {(payload.newLimitCents / 100).toFixed(2).replace('.', ',')} €
            </strong>
          </span>
        )}
        {payload.actionType === 'DELETE_BUDGET' && (
          <span className={styles.previewValue}>
            Eliminar límite de{' '}
            <strong>{payload.categoryName || 'categoría'}</strong>
            {payload.amountLimitCents && ` (${(payload.amountLimitCents / 100).toFixed(2).replace('.', ',')} €/mes)`}
          </span>
        )}
        {payload.actionType === 'UPDATE_TRANSACTION' && (
          <span className={styles.previewValue}>
            Modificar movimiento a{' '}
            <strong>
              {(Math.abs(payload.amountCents) / 100).toFixed(2).replace('.', ',')} €
            </strong>
            {payload.description && ` ("${payload.description}")`}
          </span>
        )}
        {payload.actionType === 'DELETE_TRANSACTION' && (
          <span className={styles.previewValue}>
            Eliminar movimiento <strong>&quot;{payload.description || ''}&quot;</strong>
            {payload.amountCents && ` (${(Math.abs(payload.amountCents) / 100).toFixed(2).replace('.', ',')} €)`}
          </span>
        )}
        {payload.actionType === 'UPDATE_SAVINGS_GOAL' && (
          <span className={styles.previewValue}>
            Actualizar objetivo de <strong>&quot;{payload.name || 'meta'}&quot;</strong> a{' '}
            <strong>
              {(payload.targetAmountCents / 100).toFixed(2).replace('.', ',')} €
            </strong>
          </span>
        )}
        {payload.actionType === 'DELETE_SAVINGS_GOAL' && (
          <span className={styles.previewValue}>
            Eliminar meta <strong>&quot;{payload.name || ''}&quot;</strong>
            {payload.targetAmountCents && ` (objetivo: ${(payload.targetAmountCents / 100).toFixed(2).replace('.', ',')} €)`}
          </span>
        )}
        {payload.actionType === 'SAVINGS_CONTRIBUTION' && payload.amountCents && (
          <span className={styles.previewValue}>
            Aportar extraordinario de{' '}
            <strong>
              {(payload.amountCents / 100).toFixed(2).replace('.', ',')} €
            </strong>
          </span>
        )}
        {payload.actionType === 'CREATE_SAVINGS_GOAL' && payload.targetAmountCents && (
          <span className={styles.previewValue}>
            Crear meta &quot;{payload.goalName || 'Meta de Ahorro'}&quot; de{' '}
            <strong>
              {(payload.targetAmountCents / 100).toFixed(2).replace('.', ',')} €
            </strong>
            {payload.targetMonths && ` (${payload.targetMonths} meses)`}
          </span>
        )}
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.rejectBtn}
          onClick={handleReject}
          disabled={isApplying || isRejecting}
        >
          {isRejecting ? 'Descartando...' : 'Descartar'}
        </button>

        <button
          type="button"
          className={styles.applyBtn}
          onClick={handleApply}
          disabled={isApplying || isRejecting}
        >
          {isApplying ? (
            <span className={styles.spinner} />
          ) : (
            '✓ Aprobar y Aplicar'
          )}
        </button>
      </div>
    </div>
  );
}
