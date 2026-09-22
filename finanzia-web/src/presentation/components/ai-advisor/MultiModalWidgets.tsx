'use client';

import React from 'react';
import { ToolCallExecution } from '@/infrastructure/api/advisor.api';
import styles from './MultiModalWidgets.module.css';

interface MultiModalWidgetsProps {
  toolExecutions?: ToolCallExecution[] | null;
}

export function MultiModalWidgets({ toolExecutions }: MultiModalWidgetsProps) {
  if (!toolExecutions || toolExecutions.length === 0) return null;

  // 1. Verificar si hay desglose de gastos por categoría
  const categoryTool = toolExecutions.find(
    (t) => t.toolName === 'get_expenses_by_category' && t.result?.categories?.length > 0,
  );

  // 2. Verificar si hay metas de ahorro
  const goalsTool = toolExecutions.find(
    (t) => t.toolName === 'get_savings_goals' && t.result?.goals?.length > 0,
  );

  // 3. Verificar si hay cálculo de plan multi-paso
  const planTool = toolExecutions.find(
    (t) => t.toolName === 'calculate_savings_plan' && t.result?.monthlyQuotaCents,
  );

  return (
    <div className={styles.widgetWrapper}>
      {/* Widget 1: Desglose Visual de Categorías */}
      {categoryTool && (
        <div className={styles.widgetContainer}>
          <div className={styles.widgetTitle}>
            <span>📊</span>
            <span>Desglose Visual de Gastos</span>
          </div>
          <div className={styles.categoryList}>
            {categoryTool.result.categories.slice(0, 5).map((cat: any, i: number) => {
              const amountEur = (cat.totalAmountCents / 100).toFixed(2).replace('.', ',');
              const pct = cat.percentageOfTotal || 0;
              return (
                <div key={i} className={styles.categoryItem}>
                  <div className={styles.categoryMeta}>
                    <span className={styles.categoryName}>{cat.categoryName}</span>
                    <span className={styles.categoryAmount}>{amountEur} € ({pct}%)</span>
                  </div>
                  <div className={styles.categoryTrack}>
                    <div
                      className={styles.categoryBar}
                      style={{ width: `${Math.max(4, Math.min(100, pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Widget 2: Indicador Visual de Progreso de Metas */}
      {goalsTool && (
        <div className={styles.widgetContainer}>
          <div className={styles.widgetTitle}>
            <span>🎯</span>
            <span>Progreso de Metas de Ahorro</span>
          </div>
          <div className={styles.goalsList}>
            {goalsTool.result.goals.map((g: any, i: number) => {
              const curEur = (g.currentAmountCents / 100).toFixed(2).replace('.', ',');
              const targetEur = (g.targetAmountCents / 100).toFixed(2).replace('.', ',');
              const pct = g.progressPercent || 0;
              return (
                <div key={i} className={styles.goalCard}>
                  <div className={styles.goalHeader}>
                    <span className={styles.goalName}>{g.name}</span>
                    <span className={styles.goalBadge}>
                      {g.isCompleted ? '✓ Completada' : `${pct}%`}
                    </span>
                  </div>
                  <div className={styles.goalTrack}>
                    <div
                      className={styles.goalBar}
                      style={{ width: `${Math.max(3, Math.min(100, pct))}%` }}
                    />
                  </div>
                  <div className={styles.goalAmounts}>
                    <span>{curEur} € acumulados</span>
                    <span>Objetivo: {targetEur} €</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Widget 3: Tarjeta de Plan de Ahorro Multi-Paso */}
      {planTool && (
        <div className={styles.widgetContainer}>
          <div className={styles.widgetTitle}>
            <span>💡</span>
            <span>Hoja de Ruta: {planTool.result.goalName}</span>
          </div>
          <div className={styles.planCard}>
            <div className={styles.planMetrics}>
              <div className={styles.planMetricBox}>
                <span className={styles.planMetricLabel}>Cuota Requerida</span>
                <span className={styles.planMetricValue}>
                  {(planTool.result.monthlyQuotaCents / 100).toFixed(2).replace('.', ',')} €/mes
                </span>
              </div>
              <div className={styles.planMetricBox}>
                <span className={styles.planMetricLabel}>Plazo Estimado</span>
                <span className={styles.planMetricValue}>{planTool.result.months} meses</span>
              </div>
            </div>

            {planTool.result.suggestedCuts && planTool.result.suggestedCuts.length > 0 && (
              <div>
                <div className={styles.planCutsTitle}>Recortes Sugeridos en Gastos Variables:</div>
                {planTool.result.suggestedCuts.map((cut: any, i: number) => (
                  <div key={i} className={styles.planCutItem}>
                    <span>✂️</span>
                    <span>
                      <strong>{cut.categoryName}</strong>: reducir{' '}
                      {(cut.suggestedCutCents / 100).toFixed(2).replace('.', ',')} €/mes
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
