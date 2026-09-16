import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BudgetProgressBar } from '../../src/presentation/components/financial/BudgetProgressBar';
import { BudgetPacingItem } from '../../src/infrastructure/api/budgets.api';

describe('BudgetProgressBar Component (React Testing Library)', () => {
  const baseItem: BudgetPacingItem = {
    budgetId: 'bgt-test-1',
    categoryId: 'cat-ocio',
    categoryName: 'Ocio y Cultura',
    categoryColorHex: '#F59E0B',
    categoryIcon: 'film',
    amountLimitCents: 20000,
    spentCents: 10000,
    remainingCents: 10000,
    percentageUsed: 50.0,
    alertThresholdPct: 80,
    status: 'ON_TRACK',
  };

  it('debe renderizar el nombre de la categoría y porcentaje', () => {
    render(<BudgetProgressBar item={baseItem} />);
    expect(screen.getByText('Ocio y Cultura')).toBeDefined();
    expect(screen.getByText(/50.0%/)).toBeDefined();
    expect(screen.getByText(/En regla/)).toBeDefined();
  });

  it('debe reflejar estado de advertencia (70% - 90%) según CA-04.2', () => {
    const warningItem: BudgetPacingItem = {
      ...baseItem,
      spentCents: 16000,
      remainingCents: 4000,
      percentageUsed: 80.0,
      status: 'WARNING',
    };
    render(<BudgetProgressBar item={warningItem} />);
    expect(screen.getByText(/80.0%/)).toBeDefined();
    expect(screen.getByText(/Atención/)).toBeDefined();
  });

  it('debe reflejar estado de alerta crítica (> 90%) según CA-04.2', () => {
    const exceededItem: BudgetPacingItem = {
      ...baseItem,
      spentCents: 19000,
      remainingCents: 1000,
      percentageUsed: 95.0,
      status: 'EXCEEDED',
    };
    render(<BudgetProgressBar item={exceededItem} />);
    expect(screen.getByText(/95.0%/)).toBeDefined();
    expect(screen.getByText(/Alerta crítica/)).toBeDefined();
  });

  it('debe invocar los callbacks de edición y borrado', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <BudgetProgressBar
        item={baseItem}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    const editBtn = screen.getByText('Editar límite');
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledWith(baseItem);

    const deleteBtn = screen.getByText('Eliminar');
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith('bgt-test-1');
  });
});
