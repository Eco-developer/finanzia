'use client';

import React from 'react';
import styles from './QuickPromptChips.module.css';

interface QuickPromptChipsProps {
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

const PROMPTS = [
  {
    icon: '🎯',
    text: 'Quiero ahorrar 3.000€ en 6 meses para vacaciones',
    label: 'Planificar meta de ahorro',
  },
  {
    icon: '💳',
    text: '¿Cuánto dinero tengo en total en mis cuentas y cuál es mi patrimonio?',
    label: 'Saldos consolidados',
  },
  {
    icon: '📈',
    text: '¿Cuánto he gastado este mes y cuál es mi tasa de ahorro?',
    label: 'Resumen financiero',
  },
  {
    icon: '🛒',
    text: '¿En qué categorías he gastado más dinero este mes?',
    label: 'Desglose de gastos',
  },
  {
    icon: '🏷️',
    text: '¿En qué categoría entra una compra en Decathlon?',
    label: 'Clasificar gasto',
  },
  {
    icon: '🔔',
    text: '¿Hay alertas o repuntes de gasto detectados este mes?',
    label: 'Alertas proactivas',
  },
];

export function QuickPromptChips({ onSelectPrompt, disabled }: QuickPromptChipsProps) {
  return (
    <div className={styles.container}>
      <span className={styles.label}>Preguntas sugeridas:</span>
      <div className={styles.chipsRow}>
        {PROMPTS.map((p, idx) => (
          <button
            key={idx}
            type="button"
            className={styles.chip}
            onClick={() => onSelectPrompt(p.text)}
            disabled={disabled}
            title={p.text}
          >
            <span className={styles.chipIcon}>{p.icon}</span>
            <span className={styles.chipText}>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
