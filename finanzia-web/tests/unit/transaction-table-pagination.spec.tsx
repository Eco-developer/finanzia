import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransactionTable } from '@/presentation/components/financial/TransactionTable';
import type { TransactionItem } from '@/infrastructure/api/transactions.api';
import type { AccountItem } from '@/infrastructure/api/accounts.api';
import type { CategoryItem } from '@/infrastructure/api/categories.api';

describe('TransactionTable Pagination', () => {
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
      name: 'Supermercado',
      icon: 'shopping-cart',
      colorHex: '#10B981',
      type: 'EXPENSE',
      isSystem: true,
      isArchived: false,
    },
  ];

  const generateMockTransactions = (count: number): TransactionItem[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `tx-${i + 1}`,
      userId: 'user-1',
      accountId: 'acc-1',
      categoryId: 'cat-1',
      amountCents: -(i + 1) * 100,
      type: 'EXPENSE',
      transactionDate: '2026-09-15T12:00:00.000Z',
      description: `Movimiento ${i + 1}`,
      notes: null,
      isPending: false,
      transferCounterpartId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  };

  it('renderiza la barra de paginación con el rango de registros e input de items por página', () => {
    const txs = generateMockTransactions(10);
    render(
      <TransactionTable
        transactions={txs}
        accounts={mockAccounts}
        categories={mockCategories}
        page={1}
        pageSize={10}
        totalRecords={25}
        totalPages={3}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Mostrando 1 - 10 de 25 movimientos/i),
    ).toBeInTheDocument();

    const input = screen.getByLabelText(/Cantidad de items por página/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(10);

    const select = screen.getByLabelText(/Seleccionar items por página predefinidos/i);
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('10');
  });

  it('deshabilita los botones primera/anterior en la página 1 y llama onPageChange al pulsar siguiente', () => {
    const onPageChange = vi.fn();
    const txs = generateMockTransactions(10);

    render(
      <TransactionTable
        transactions={txs}
        accounts={mockAccounts}
        categories={mockCategories}
        page={1}
        pageSize={10}
        totalRecords={30}
        totalPages={3}
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
      />,
    );

    const firstBtn = screen.getByLabelText(/Primera página/i);
    const prevBtn = screen.getByLabelText(/Página anterior/i);
    const nextBtn = screen.getByLabelText(/Página siguiente/i);
    const page2Btn = screen.getByLabelText(/Página 2/i);

    expect(firstBtn).toBeDisabled();
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);

    fireEvent.click(page2Btn);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('deshabilita los botones siguiente/última en la última página', () => {
    const txs = generateMockTransactions(5);

    render(
      <TransactionTable
        transactions={txs}
        accounts={mockAccounts}
        categories={mockCategories}
        page={3}
        pageSize={10}
        totalRecords={25}
        totalPages={3}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );

    const firstBtn = screen.getByLabelText(/Primera página/i);
    const nextBtn = screen.getByLabelText(/Página siguiente/i);
    const lastBtn = screen.getByLabelText(/Última página/i);

    expect(firstBtn).not.toBeDisabled();
    expect(nextBtn).toBeDisabled();
    expect(lastBtn).toBeDisabled();
  });

  it('llama onPageSizeChange cuando se cambia el select o el input numérico de items por página', () => {
    const onPageSizeChange = vi.fn();
    const txs = generateMockTransactions(10);

    render(
      <TransactionTable
        transactions={txs}
        accounts={mockAccounts}
        categories={mockCategories}
        page={1}
        pageSize={10}
        totalRecords={50}
        totalPages={5}
        onPageChange={vi.fn()}
        onPageSizeChange={onPageSizeChange}
      />,
    );

    const select = screen.getByLabelText(/Seleccionar items por página predefinidos/i);
    fireEvent.change(select, { target: { value: '20' } });
    expect(onPageSizeChange).toHaveBeenCalledWith(20);

    const input = screen.getByLabelText(/Cantidad de items por página/i);
    fireEvent.change(input, { target: { value: '15' } });
    fireEvent.blur(input);
    expect(onPageSizeChange).toHaveBeenCalledWith(15);
  });

  it('en modo cliente no controlado, pagina correctamente la lista en memoria', () => {
    // 12 transacciones, pageSize por defecto 10
    const txs = generateMockTransactions(12);

    render(
      <TransactionTable
        transactions={txs}
        accounts={mockAccounts}
        categories={mockCategories}
        pageSize={10}
      />,
    );

    // Página 1 muestra movimientos 1 a 10
    expect(screen.getByText('Movimiento 1')).toBeInTheDocument();
    expect(screen.getByText('Movimiento 10')).toBeInTheDocument();
    expect(screen.queryByText('Movimiento 11')).not.toBeInTheDocument();
    expect(screen.getByText(/Mostrando 1 - 10 de 12 movimientos/i)).toBeInTheDocument();

    // Navegar a la página 2
    const nextBtn = screen.getByLabelText(/Página siguiente/i);
    fireEvent.click(nextBtn);

    // Página 2 muestra movimientos 11 y 12
    expect(screen.queryByText('Movimiento 1')).not.toBeInTheDocument();
    expect(screen.getByText('Movimiento 11')).toBeInTheDocument();
    expect(screen.getByText('Movimiento 12')).toBeInTheDocument();
    expect(screen.getByText(/Mostrando 11 - 12 de 12 movimientos/i)).toBeInTheDocument();
  });
});
