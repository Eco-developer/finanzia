import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GoalCard } from '../../src/presentation/components/financial/GoalCard';
import { GoalItem } from '../../src/infrastructure/api/goals.api';

describe('GoalCard Component (React Testing Library)', () => {
  const mockGoal: GoalItem = {
    id: 'goal-1',
    name: 'Fondo de Emergencia',
    targetAmountCents: 300000,
    currentAmountCents: 150000,
    remainingCents: 150000,
    progressPercentage: 50.0,
    targetDate: '2027-01-01T00:00:00.000Z',
    daysRemaining: 106,
    isCompleted: false,
    createdAt: '2026-09-16T12:00:00.000Z',
    updatedAt: '2026-09-16T12:00:00.000Z',
  };

  it('debe renderizar el nombre de la meta y porcentaje de avance', () => {
    const onContribute = vi.fn();
    render(<GoalCard goal={mockGoal} onContribute={onContribute} />);

    expect(screen.getByText('Fondo de Emergencia')).toBeDefined();
    expect(screen.getByText('50.0%')).toBeDefined();
    expect(screen.getByText(/106 días restantes/)).toBeDefined();
  });

  it('debe invocar onContribute al pulsar en Aportar Fondos', () => {
    const onContribute = vi.fn();
    render(<GoalCard goal={mockGoal} onContribute={onContribute} />);

    const contributeBtn = screen.getByText(/Aportar Fondos/);
    fireEvent.click(contributeBtn);
    expect(onContribute).toHaveBeenCalledWith(mockGoal);
  });

  it('debe mostrar estado cumplido cuando isCompleted es true', () => {
    const completedGoal: GoalItem = {
      ...mockGoal,
      currentAmountCents: 300000,
      remainingCents: 0,
      progressPercentage: 100,
      isCompleted: true,
    };

    const onContribute = vi.fn();
    render(<GoalCard goal={completedGoal} onContribute={onContribute} />);

    expect(screen.getByText('✓ Cumplida')).toBeDefined();
    expect(screen.getByText(/¡Objetivo alcanzado!/)).toBeDefined();
    expect(screen.queryByText(/Aportar Fondos/)).toBeNull();
  });
});
