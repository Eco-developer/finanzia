import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditTransactionModal } from '@/presentation/components/financial/EditTransactionModal';
import { transactionsApi, type TransactionItem } from '@/infrastructure/api/transactions.api';
import type { AccountItem } from '@/infrastructure/api/accounts.api';
import type { CategoryItem } from '@/infrastructure/api/categories.api';

vi.mock('@/infrastructure/api/transactions.api', () => ({
  transactionsApi: {
    updateTransaction: vi.fn(),
  },
}));

describe('EditTransactionModal Component', () => {
  const mockAccounts: AccountItem[] = [
    {
      id: 'acc-1',
      userId: 'user-1',
      name: 'Cuenta Principal',
      type: 'CHECKING',
      initialBalanceCents: 100000,
      currentBalanceCents: 100000,
      currency: 'EUR',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const mockCategories: CategoryItem[] = [
    {
      id: 'cat-exp-1',
      userId: null,
      parentId: null,
      name: 'Supermercado',
      icon: 'shopping-cart',
      colorHex: '#10B981',
      type: 'EXPENSE',
      isSystem: true,
      isArchived: false,
    },
    {
      id: 'cat-inc-1',
      userId: null,
      parentId: null,
      name: 'Nómina Trabajo',
      icon: 'briefcase',
      colorHex: '#3B82F6',
      type: 'INCOME',
      isSystem: true,
      isArchived: false,
    },
  ];

  const mockTx: TransactionItem = {
    id: 'tx-edit-1',
    userId: 'user-1',
    accountId: 'acc-1',
    categoryId: 'cat-exp-1',
    amountCents: -5420, // -54,20 €
    type: 'EXPENSE',
    transactionDate: '2026-09-12T14:30:00.000Z',
    description: 'Compra Lidl',
    notes: 'Compra fin de semana',
    isPending: false,
    transferCounterpartId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('precarga los datos del movimiento en el formulario', () => {
    render(
      <EditTransactionModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        transaction={mockTx}
        accounts={mockAccounts}
        categories={mockCategories}
      />,
    );

    expect(screen.getByDisplayValue('Compra Lidl')).toBeInTheDocument();
    expect(screen.getByDisplayValue('54.20')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Compra fin de semana')).toBeInTheDocument();
    expect(screen.getByText(/Supermercado/)).toBeInTheDocument();
    expect(screen.queryByText(/Nómina Trabajo/)).not.toBeInTheDocument();
  });

  it('cambia las categorías disponibles al alternar entre Gasto e Ingreso', () => {
    render(
      <EditTransactionModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        transaction={mockTx}
        accounts={mockAccounts}
        categories={mockCategories}
      />,
    );

    // Inicialmente Gasto -> Supermercado visible, Nómina no
    expect(screen.getByText(/Supermercado/)).toBeInTheDocument();
    expect(screen.queryByText(/Nómina Trabajo/)).not.toBeInTheDocument();

    // Cambiar a Ingreso
    const incomeBtn = screen.getByRole('button', { name: /Ingreso/i });
    fireEvent.click(incomeBtn);

    // Ahora Nómina debe estar disponible, Supermercado no
    expect(screen.getByText(/Nómina Trabajo/)).toBeInTheDocument();
    expect(screen.queryByText(/Supermercado/)).not.toBeInTheDocument();
  });

  it('llama a transactionsApi.updateTransaction al guardar cambios', async () => {
    const onSuccessMock = vi.fn();
    const onCloseMock = vi.fn();
    (transactionsApi.updateTransaction as any).mockResolvedValue({
      ...mockTx,
      description: 'Compra Lidl Modificada',
    });

    render(
      <EditTransactionModal
        isOpen={true}
        onClose={onCloseMock}
        onSuccess={onSuccessMock}
        transaction={mockTx}
        accounts={mockAccounts}
        categories={mockCategories}
      />,
    );

    const descInput = screen.getByDisplayValue('Compra Lidl');
    fireEvent.change(descInput, { target: { value: 'Compra Lidl Modificada' } });

    const saveBtn = screen.getByRole('button', { name: /Guardar Cambios/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(transactionsApi.updateTransaction).toHaveBeenCalledWith(
        'tx-edit-1',
        expect.objectContaining({
          description: 'Compra Lidl Modificada',
          amountCents: -5420,
        }),
      );
      expect(onSuccessMock).toHaveBeenCalled();
      expect(onCloseMock).toHaveBeenCalled();
    });
  });
});
