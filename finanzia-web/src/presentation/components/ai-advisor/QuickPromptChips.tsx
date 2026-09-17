'use client';

import React from 'react';
import styles from './QuickPromptChips.module.css';

interface QuickPromptChipsProps {
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

const PROMPTS = [
  {
    icon: '📈',
    text: '¿Cuánto he gastado este mes y cuál es mi tasa de ahorro?',
    label: 'Resumen mensual',
  },
  {
    icon: '🛒',
    text: '¿En qué categorías he tenido más gastos este mes?',
    label: 'Desglose por categoría',
  },
  {
    icon: '📊',
    text: '¿Cómo van mis presupuestos y cuáles están en riesgo?',
    label: 'Ritmo presupuestario',
  },
  {
    icon: '💡',
    text: '¿Qué recomendaciones me sugieres para optimizar mis finanzas?',
    label: 'Propuestas de ahorro',
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
