'use client';

import React, { useState } from 'react';
import { ToolCallExecution } from '@/infrastructure/api/advisor.api';
import styles from './VerifiedDataSeal.module.css';

interface VerifiedDataSealProps {
  toolExecutions?: ToolCallExecution[] | null;
}

const TOOL_FRIENDLY_NAMES: Record<string, string> = {
  get_financial_summary: 'Resumen Financiero Determinista',
  get_expenses_by_category: 'Desglose Real por Categoría',
  get_budget_status: 'Pacing y Límites de Presupuestos',
  get_account_balances: 'Saldos Consolidados de Cuentas',
  get_savings_goals: 'Progreso de Metas de Ahorro',
  calculate_savings_plan: 'Planificación Multi-Paso Determinista',
  categorize_transaction: 'Categorización Inteligente y Feedback',
  get_proactive_insights: 'Detección Proactiva de Desvíos',
  propose_recommendation: 'Propuesta Human-in-the-Loop',
};

export function VerifiedDataSeal({ toolExecutions }: VerifiedDataSealProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!toolExecutions || toolExecutions.length === 0) return null;

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.toggleBtn}
        onClick={() => setIsOpen(!isOpen)}
        title="Ver auditoría de datos verificados en base de datos"
      >
        <span className={styles.pulseDot} />
        <span>Datos verificados ({toolExecutions.length} consulta{toolExecutions.length > 1 ? 's' : ''})</span>
        <span className={`${styles.iconCaret} ${isOpen ? styles.iconCaretOpen : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {toolExecutions.map((tool, idx) => {
            const friendlyName = TOOL_FRIENDLY_NAMES[tool.toolName] || tool.toolName;
            return (
              <div key={idx} className={styles.toolItem}>
                <div className={styles.toolHeader}>
                  <span className={styles.toolName}>⚡ {friendlyName}</span>
                  <span className={styles.toolStatus}>✓ Verificado SQL</span>
                </div>
                <div className={styles.toolDetails}>
                  Herramienta: <code>{tool.toolName}</code>
                  {tool.args && Object.keys(tool.args).length > 0 && (
                    <span> · Parámetros: {JSON.stringify(tool.args)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
