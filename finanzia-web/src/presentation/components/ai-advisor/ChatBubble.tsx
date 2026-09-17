'use client';

import React, { useState } from 'react';
import { ChatMessage, ToolCallExecution } from '@/infrastructure/api/advisor.api';
import styles from './ChatBubble.module.css';

interface ChatBubbleProps {
  message: ChatMessage;
}

const TOOL_DISPLAY_NAMES: Record<string, { label: string; icon: string }> = {
  get_financial_summary: { label: 'Resumen Financiero', icon: '📈' },
  get_expenses_by_category: { label: 'Gastos por Categoría', icon: '🛒' },
  get_budget_status: { label: 'Ritmo de Presupuestos', icon: '📊' },
  propose_recommendation: { label: 'Propuesta de Ahorro', icon: '💡' },
};

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'USER';
  const [showToolDetails, setShowToolDetails] = useState(false);

  const toolExecutions: ToolCallExecution[] =
    (message.toolCalls as ToolCallExecution[]) || [];

  return (
    <div className={`${styles.row} ${isUser ? styles.userRow : styles.assistantRow}`}>
      {!isUser && (
        <div className={styles.avatar}>
          <span className={styles.avatarIcon}>✨</span>
        </div>
      )}

      <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.assistantBubble}`}>
        {!isUser && (
          <div className={styles.header}>
            <span className={styles.advisorName}>FinanZIA Advisor</span>
            <span className={styles.verifiedBadge}>
              <span className={styles.pulseDot} /> Cero Alucinaciones
            </span>
          </div>
        )}

        <div className={styles.content}>
          {message.content.split('\n').map((line, i) => {
            if (!line.trim()) return <div key={i} className={styles.spacer} />;
            // Formatear negritas básicas **texto**
            const parts = line.split(/(\*\*.*?\*\*)/g);
            return (
              <p key={i} className={styles.textLine}>
                {parts.map((p, j) => {
                  if (p.startsWith('**') && p.endsWith('**')) {
                    return <strong key={j}>{p.slice(2, -2)}</strong>;
                  }
                  return p;
                })}
              </p>
            );
          })}
        </div>

        {/* Trazabilidad de Herramientas Backend Ejecutadas */}
        {!isUser && toolExecutions.length > 0 && (
          <div className={styles.toolsSection}>
            <button
              type="button"
              className={styles.toolToggleBtn}
              onClick={() => setShowToolDetails(!showToolDetails)}
            >
              <span className={styles.toolShield}>🛡️</span>
              <span>
                {toolExecutions.length} consulta(s) SQL backend verificadas
              </span>
              <span className={styles.toolArrow}>{showToolDetails ? '▲' : '▼'}</span>
            </button>

            {showToolDetails && (
              <div className={styles.toolsList}>
                {toolExecutions.map((t, idx) => {
                  const meta = TOOL_DISPLAY_NAMES[t.toolName] || {
                    label: t.toolName,
                    icon: '⚙️',
                  };
                  return (
                    <div key={idx} className={styles.toolItem}>
                      <div className={styles.toolHeader}>
                        <span className={styles.toolIcon}>{meta.icon}</span>
                        <span className={styles.toolLabel}>{meta.label}</span>
                        <span className={styles.verifiedPill}>100% Determinista</span>
                      </div>
                      <pre className={styles.toolJson}>
                        {JSON.stringify(t.result, null, 2)}
                      </pre>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className={styles.time}>
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>

      {isUser && (
        <div className={`${styles.avatar} ${styles.userAvatar}`}>
          <span>👤</span>
        </div>
      )}
    </div>
  );
}
