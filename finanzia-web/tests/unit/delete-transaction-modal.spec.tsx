import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteTransactionModal } from '@/presentation/components/financial/DeleteTransactionModal';
import type { TransactionItem } from '@/infrastructure/api/transactions.api';
import type { AccountItem } from '@/infrastructure/api/accounts.api';
import type { CategoryItem } from '@/infrastructure/api/categories.api';

describe('DeleteTransactionModal Component', () => {
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
      id: 'cat-1',
      userId: null,
      parentId: null,
      name: 'Alimentación',
      icon: 'shopping-cart',
      colorHex: '#10B981',
      type: 'EXPENSE',
      isSystem: true,
      isArchived: false,
    },
  ];

  const mockTransaction: TransactionItem = {
    id: 'tx-1',
    userId: 'user-1',
    accountId: 'acc-1',
    categoryId: 'cat-1',
    amountCents: -3550,
    type: 'EXPENSE',
    transactionDate: '2026-09-15T12:00:00.000Z',
    description: 'Restaurante Central',
    notes: null,
    isPending: false,
    transferCounterpartId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('muestra cuenta, categoría, concepto e importe en eliminación individual', () => {
    render(
      <DeleteTransactionModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        transactions={[mockTransaction]}
        accounts={mockAccounts}
        categories={mockCategories}
      />,
    );

    // Concepto
    expect(screen.getByText('Restaurante Central')).toBeInTheDocument();
    // Cuenta
    expect(screen.getByText('Cuenta Principal')).toBeInTheDocument();
    // Categoría
    expect(screen.getByText('Alimentación')).toBeInTheDocument();
    // Importe (-35,50 €)
    expect(screen.getByText(/-35,50/)).toBeInTheDocument();
  });

  it('muestra la lista de elementos y el conteo en eliminación masiva', () => {
    const tx2: TransactionItem = {
      ...mockTransaction,
      id: 'tx-2',
      description: 'Supermercado Día',
      amountCents: -1200,
    };

    render(
      <DeleteTransactionModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        transactions={[mockTransaction, tx2]}
        accounts={mockAccounts}
        categories={mockCategories}
      />,
    );

    expect(screen.getByText('Restaurante Central')).toBeInTheDocument();
    expect(screen.getByText('Supermercado Día')).toBeInTheDocument();
    expect(screen.getByText(/Total seleccionadas:/i)).toBeInTheDocument();
    expect(screen.getByText('Eliminar 2 transacciones')).toBeInTheDocument();
  });

  it('ejecuta onConfirm al pulsar eliminar definitivamente', async () => {
    const onConfirmMock = vi.fn().mockResolvedValue(undefined);

    render(
      <DeleteTransactionModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirmMock}
        transactions={[mockTransaction]}
        accounts={mockAccounts}
        categories={mockCategories}
      />,
    );

    const deleteBtn = screen.getByRole('button', { name: /Eliminar transacción/i });
    fireEvent.click(deleteBtn);

    expect(onConfirmMock).toHaveBeenCalled();
  });
});
