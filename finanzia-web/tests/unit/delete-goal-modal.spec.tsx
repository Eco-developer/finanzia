import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteGoalModal } from '@/presentation/components/financial/DeleteGoalModal';
import type { GoalItem } from '@/infrastructure/api/goals.api';

describe('DeleteGoalModal Component', () => {
  const mockGoal: GoalItem = {
    id: 'goal-vacaciones',
    name: 'Vacaciones Japón',
    targetAmountCents: 400000,
    currentAmountCents: 200000,
    remainingCents: 200000,
    progressPercentage: 50.0,
    targetDate: '2027-06-01T00:00:00.000Z',
    daysRemaining: 250,
    isCompleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('no renderiza nada cuando goal es null', () => {
    const { container } = render(
      <DeleteGoalModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        goal={null}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('muestra el nombre de la meta, objetivo total, ahorrado actual y advertencia', () => {
    render(
      <DeleteGoalModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        goal={mockGoal}
      />,
    );

    // Título y advertencia
    expect(screen.getByText('¿Eliminar meta de ahorro?')).toBeInTheDocument();
    expect(
      screen.getByText(/Esta acción eliminará de forma permanente esta meta de ahorro y su historial de progreso/i),
    ).toBeInTheDocument();

    // Nombre de la meta
    expect(screen.getByText('Vacaciones Japón')).toBeInTheDocument();

    // Importes (4.000,00 € y 2.000,00 €)
    expect(screen.getByText(/4\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/2\.000,00/)).toBeInTheDocument();

    // Progreso
    expect(screen.getByText(/50.0%/)).toBeInTheDocument();
  });

  it('muestra estado cumplido cuando isCompleted es true', () => {
    const completedGoal: GoalItem = {
      ...mockGoal,
      currentAmountCents: 400000,
      remainingCents: 0,
      progressPercentage: 100.0,
      isCompleted: true,
    };

    render(
      <DeleteGoalModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        goal={completedGoal}
      />,
    );

    expect(screen.getByText('✓ Cumplida')).toBeInTheDocument();
  });

  it('ejecuta onConfirm al hacer clic en eliminar', async () => {
    const onConfirmMock = vi.fn().mockResolvedValue(undefined);
    const onCloseMock = vi.fn();

    render(
      <DeleteGoalModal
        isOpen={true}
        onClose={onCloseMock}
        onConfirm={onConfirmMock}
        goal={mockGoal}
      />,
    );

    const deleteBtn = screen.getByRole('button', { name: /Eliminar meta/i });
    fireEvent.click(deleteBtn);

    expect(onConfirmMock).toHaveBeenCalled();
  });

  it('ejecuta onClose al pulsar cancelar', () => {
    const onCloseMock = vi.fn();
    render(
      <DeleteGoalModal
        isOpen={true}
        onClose={onCloseMock}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        goal={mockGoal}
      />,
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);

    expect(onCloseMock).toHaveBeenCalled();
  });
});
