'use client';

import React from 'react';
import {
  ONBOARDING_GOALS,
  OnboardingGoalOption,
} from '@/core/domain/constants/onboarding-options';
import {
  Receipt,
  LayoutDashboard,
  PieChart,
  Target,
  TrendingDown,
  Compass,
  Sparkles,
  Bot,
  Zap,
  GraduationCap,
  PlusCircle,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import styles from './OnboardingWizard.module.css';

interface Step1GoalsProps {
  selectedGoals: string[];
  customGoal: string;
  onToggleGoal: (id: string) => void;
  onChangeCustomGoal: (val: string) => void;
  onNext: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Receipt: <Receipt size={20} />,
  LayoutDashboard: <LayoutDashboard size={20} />,
  PieChart: <PieChart size={20} />,
  Target: <Target size={20} />,
  TrendingDown: <TrendingDown size={20} />,
  Compass: <Compass size={20} />,
  Sparkles: <Sparkles size={20} />,
  Bot: <Bot size={20} />,
  Zap: <Zap size={20} />,
  GraduationCap: <GraduationCap size={20} />,
  PlusCircle: <PlusCircle size={20} />,
};

export const Step1Goals: React.FC<Step1GoalsProps> = ({
  selectedGoals,
  customGoal,
  onToggleGoal,
  onChangeCustomGoal,
  onNext,
}) => {
  const isOtherSelected = selectedGoals.includes('other');
  const isValid =
    selectedGoals.length > 0 &&
    (!isOtherSelected || customGoal.trim().length > 0);

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.brandBadge}>
          <Sparkles size={14} /> Personalización Inteligente
        </div>
        <h1 className={styles.title}>¿Cómo te gustaría que Finanzia transforme tus finanzas?</h1>
        <p className={styles.subtitle}>
          Selecciona una o más metas. Calibraremos la plataforma y el comportamiento de tu Asistente IA a tus prioridades.
        </p>
      </div>

      <div className={styles.goalsGrid}>
        {ONBOARDING_GOALS.map((goal: OnboardingGoalOption) => {
          const isSelected = selectedGoals.includes(goal.id);
          const icon = ICON_MAP[goal.iconName] || <Target size={20} />;

          return (
            <div
              key={goal.id}
              role="checkbox"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onToggleGoal(goal.id)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  onToggleGoal(goal.id);
                }
              }}
              className={`${styles.goalCard} ${
                isSelected ? styles.goalCardSelected : ''
              } ${goal.isAi ? styles.goalCardAi : ''}`}
            >
              <div className={styles.goalIconWrapper}>
                <div
                  className={`${styles.goalIcon} ${
                    goal.isAi ? styles.goalIconAi : ''
                  }`}
                >
                  {icon}
                </div>
                {goal.isAi && <span className={styles.aiBadge}>Copilot IA</span>}
                {isSelected && (
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: '#6366f1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                    }}
                  >
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </div>
              <div className={styles.goalTitle}>{goal.title}</div>
              <div className={styles.goalDesc}>{goal.description}</div>
            </div>
          );
        })}
      </div>

      {isOtherSelected && (
        <div className={styles.otherInputContainer}>
          <label htmlFor="customGoalInput" className={styles.label}>
            <span>Detalla tu motivo o necesidad específica:</span>
            <span className={styles.optionalTag}>Máximo 250 caracteres</span>
          </label>
          <textarea
            id="customGoalInput"
            className={styles.textarea}
            placeholder="Ejemplo: Quiero preparar un presupuesto para comprar mi primera vivienda en 2 años..."
            value={customGoal}
            maxLength={250}
            onChange={(e) => onChangeCustomGoal(e.target.value)}
          />
          <span className={styles.charCount}>
            {customGoal.length} / 250
          </span>
        </div>
      )}

      <div className={styles.actionsBar} style={{ justifyContent: 'flex-end' }}>
        <Button
          variant="primary"
          onClick={onNext}
          disabled={!isValid}
          icon={<ArrowRight size={18} />}
        >
          Siguiente: Perfil Financiero
        </Button>
      </div>
    </div>
  );
};
