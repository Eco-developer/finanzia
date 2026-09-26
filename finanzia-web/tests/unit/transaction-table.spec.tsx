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

  it('llama a onRequestDelete con la transacción individual si se proporciona', () => {
    const onRequestDeleteMock = vi.fn();

    render(
      <TransactionTable
        transactions={mockTransactions}
        accounts={mockAccounts}
        categories={mockCategories}
        onRequestDelete={onRequestDeleteMock}
      />,
    );

    const deleteBtn = screen.getByLabelText('Eliminar Compra en Mercadona');
    fireEvent.click(deleteBtn);

    expect(onRequestDeleteMock).toHaveBeenCalledWith([mockTransactions[0]]);
  });

  it('muestra el botón de editar en gastos/ingresos y llama a onEdit', () => {
    const onEditMock = vi.fn();

    render(
      <TransactionTable
        transactions={mockTransactions}
        accounts={mockAccounts}
        categories={mockCategories}
        onEdit={onEditMock}
      />,
    );

    const editBtn = screen.getByLabelText('Editar Compra en Mercadona');
    expect(editBtn).toBeInTheDocument();
    fireEvent.click(editBtn);

    expect(onEditMock).toHaveBeenCalledWith(mockTransactions[0]);
  });

  it('no muestra el botón de editar en transferencias/traspasos', () => {
    const transferTx: TransactionItem = {
      id: 'tx-transfer',
      userId: 'user-1',
      accountId: 'acc-1',
      categoryId: null,
      amountCents: -5000,
      type: 'TRANSFER',
      transactionDate: '2026-09-13T12:00:00.000Z',
      description: 'Traspaso a cuenta ahorro',
      notes: null,
      isPending: false,
      transferCounterpartId: 'tx-transfer-dest',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    render(
      <TransactionTable
        transactions={[transferTx]}
        accounts={mockAccounts}
        categories={mockCategories}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText('Editar Traspaso a cuenta ahorro')).not.toBeInTheDocument();
  });

  it('permite seleccionar múltiples transacciones y muestra la barra de acciones masivas', () => {
    const onRequestDeleteMock = vi.fn();

    const tx2: TransactionItem = {
      id: 'tx-2',
      userId: 'user-1',
      accountId: 'acc-1',
      categoryId: 'cat-1',
      amountCents: 200000,
      type: 'INCOME',
      transactionDate: '2026-09-14T10:00:00.000Z',
      description: 'Nómina',
      notes: null,
      isPending: false,
      transferCounterpartId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    render(
      <TransactionTable
        transactions={[mockTransactions[0], tx2]}
        accounts={mockAccounts}
        categories={mockCategories}
        onRequestDelete={onRequestDeleteMock}
      />,
    );

    // Seleccionar checkbox de la primera transacción
    const checkbox1 = screen.getByLabelText('Seleccionar Compra en Mercadona');
    fireEvent.click(checkbox1);

    expect(screen.getByText(/1 transacción seleccionada/i)).toBeInTheDocument();

    // Seleccionar checkbox de la segunda transacción
    const checkbox2 = screen.getByLabelText('Seleccionar Nómina');
    fireEvent.click(checkbox2);

    expect(screen.getByText(/2 transacciones seleccionadas/i)).toBeInTheDocument();

    // Pulsar botón eliminar seleccionadas
    const deleteBatchBtn = screen.getByText(/Eliminar seleccionadas \(2\)/i);
    fireEvent.click(deleteBatchBtn);

    expect(onRequestDeleteMock).toHaveBeenCalledWith([mockTransactions[0], tx2]);
  });
});
