import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransactionTable } from '@/presentation/components/financial/TransactionTable';
import { TransactionItem } from '@/infrastructure/api/transactions.api';
import { AccountItem } from '@/infrastructure/api/accounts.api';
import { CategoryItem } from '@/infrastructure/api/categories.api';

describe('TransactionTable Component', () => {
  const mockAccounts: AccountItem[] = [
    {
      id: 'acc-1',
      userId: 'user-1',
      name: 'Cuenta Nómina',
      type: 'CHECKING',
      initialBalanceCents: 100000,
      currentBalanceCents: 95410,
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
      name: 'Supermercado',
      icon: 'shopping-cart',
      colorHex: '#10B981',
      type: 'EXPENSE',
      isSystem: true,
      isArchived: false,
    },
  ];

  const mockTransactions: TransactionItem[] = [
    {
      id: 'tx-1',
      userId: 'user-1',
      accountId: 'acc-1',
      categoryId: 'cat-1',
      amountCents: -4590, // -45,90 €
      type: 'EXPENSE',
      transactionDate: '2026-09-13T12:00:00.000Z',
      description: 'Compra en Mercadona',
      notes: null,
      isPending: false,
      transferCounterpartId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  it('muestra el estado vacío cuando no existen transacciones', () => {
    render(
      <TransactionTable
        transactions={[]}
        accounts={mockAccounts}
        categories={mockCategories}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText(/Sin transacciones todavía/i)).toBeInTheDocument();
  });

  it('renderiza la lista de transacciones con concepto, cuenta y categoría', () => {
    render(
      <TransactionTable
        transactions={mockTransactions}
        accounts={mockAccounts}
        categories={mockCategories}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Compra en Mercadona')).toBeInTheDocument();
    expect(screen.getByText('Supermercado')).toBeInTheDocument();
    expect(screen.getByText('Cuenta Nómina')).toBeInTheDocument();
  });

  it('llama a onDelete al pulsar el botón de eliminar tras confirmar', () => {
    const onDeleteMock = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <TransactionTable
        transactions={mockTransactions}
        accounts={mockAccounts}
        categories={mockCategories}
        onDelete={onDeleteMock}
      />,
    );

    const deleteBtn = screen.getByLabelText('Eliminar Compra en Mercadona');
    fireEvent.click(deleteBtn);

    expect(onDeleteMock).toHaveBeenCalledWith('tx-1');
  });
});
