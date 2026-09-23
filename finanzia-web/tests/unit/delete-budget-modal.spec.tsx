import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteBudgetModal } from '@/presentation/components/financial/DeleteBudgetModal';
import type { BudgetPacingItem } from '@/infrastructure/api/budgets.api';

describe('DeleteBudgetModal Component', () => {
  const mockBudget: BudgetPacingItem = {
    budgetId: 'bgt-1',
    categoryId: 'cat-alimentacion',
    categoryName: 'Alimentación',
    categoryColorHex: '#10B981',
    categoryIcon: 'shopping-cart',
    amountLimitCents: 20000,
    spentCents: 15000,
    remainingCents: 5000,
    percentageUsed: 75.0,
    alertThresholdPct: 90,
    status: 'WARNING',
  };

  it('no renderiza nada cuando budget es null', () => {
    const { container } = render(
      <DeleteBudgetModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        budget={null}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('muestra la categoría, el límite mensual, el consumo y la advertencia', () => {
    render(
      <DeleteBudgetModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        budget={mockBudget}
      />,
    );

    // Título y advertencia
    expect(screen.getByText('¿Eliminar presupuesto?')).toBeInTheDocument();
    expect(
      screen.getByText(/Esta acción eliminará el límite presupuestario y las alertas para esta categoría/i),
    ).toBeInTheDocument();

    // Categoría
    expect(screen.getByText('Alimentación')).toBeInTheDocument();

    // Límite (200,00 €) y consumo (150,00 €)
    expect(screen.getByText(/200,00/)).toBeInTheDocument();
    expect(screen.getByText(/150,00/)).toBeInTheDocument();

    // Estado y umbral
    expect(screen.getByText(/75.0% · Atención/i)).toBeInTheDocument();
    expect(screen.getByText(/Al 90% de gasto/i)).toBeInTheDocument();
  });

  it('ejecuta onConfirm al hacer clic en eliminar', async () => {
    const onConfirmMock = vi.fn().mockResolvedValue(undefined);
    const onCloseMock = vi.fn();

    render(
      <DeleteBudgetModal
        isOpen={true}
        onClose={onCloseMock}
        onConfirm={onConfirmMock}
        budget={mockBudget}
      />,
    );

    const deleteBtn = screen.getByRole('button', { name: /Eliminar presupuesto/i });
    fireEvent.click(deleteBtn);

    expect(onConfirmMock).toHaveBeenCalled();
  });

  it('ejecuta onClose al pulsar cancelar', () => {
    const onCloseMock = vi.fn();
    render(
      <DeleteBudgetModal
        isOpen={true}
        onClose={onCloseMock}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        budget={mockBudget}
      />,
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);

    expect(onCloseMock).toHaveBeenCalled();
  });
});
