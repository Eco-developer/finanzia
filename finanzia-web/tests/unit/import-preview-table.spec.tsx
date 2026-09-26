import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImportPreviewTable, CategorySelectItem, AccountSelectItem } from '@/presentation/components/csv-wizard/ImportPreviewTable';

describe('ImportPreviewTable Component', () => {
  const mockAccounts: AccountSelectItem[] = [
    { id: 'acc-1', name: 'Cuenta Corriente', currency: 'EUR' },
    { id: 'acc-2', name: 'Cuenta Ahorro', currency: 'EUR' },
  ];

  const mockCategories: CategorySelectItem[] = [
    { id: 'cat-exp-1', name: 'Restaurantes', type: 'EXPENSE', parentId: null },
    { id: 'cat-exp-2', name: 'Transporte', type: 'EXPENSE', parentId: null },
    { id: 'cat-inc-1', name: 'Nómina', type: 'INCOME', parentId: null },
    { id: 'cat-inc-2', name: 'Dividendos', type: 'INCOME', parentId: null },
  ];

  const mockInitialRows = [
    {
      rowId: 'row-0',
      date: '2026-09-10T00:00:00.000Z',
      description: 'Cena Restaurante',
      amountCents: -4500,
      hash: 'hash-1',
      preview: {
        rowId: 'row-0',
        isDuplicate: false,
        suggestedCategoryId: 'cat-exp-1',
        suggestedCategoryName: 'Restaurantes',
      },
    },
  ];

  it('renderiza la fila con cuenta, selector de tipo y selector de categoría', () => {
    render(
      <ImportPreviewTable
        initialRows={mockInitialRows}
        categories={mockCategories}
        accounts={mockAccounts}
        defaultAccountId="acc-1"
        onCommit={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText('Cena Restaurante')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cuenta Corriente')).toBeInTheDocument();
    expect(screen.getByDisplayValue('🔴 Gasto')).toBeInTheDocument();
  });

  it('muestra solo categorías de gasto cuando el tipo es Gasto', () => {
    render(
      <ImportPreviewTable
        initialRows={mockInitialRows}
        categories={mockCategories}
        accounts={mockAccounts}
        defaultAccountId="acc-1"
        onCommit={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    // Opciones de gasto deben estar presentes
    expect(screen.getByText('Restaurantes')).toBeInTheDocument();
    expect(screen.getByText('Transporte')).toBeInTheDocument();

    // Opciones de ingreso NO deben estar presentes
    expect(screen.queryByText('Nómina')).not.toBeInTheDocument();
    expect(screen.queryByText('Dividendos')).not.toBeInTheDocument();
  });

  it('al cambiar el tipo a Ingreso, muestra solo categorías de ingreso y limpia las de gasto', () => {
    render(
      <ImportPreviewTable
        initialRows={mockInitialRows}
        categories={mockCategories}
        accounts={mockAccounts}
        defaultAccountId="acc-1"
        onCommit={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    // Cambiar tipo a Ingreso
    const typeSelect = screen.getByDisplayValue('🔴 Gasto');
    fireEvent.change(typeSelect, { target: { value: 'INCOME' } });

    // Ahora deben estar presentes las categorías de ingreso
    expect(screen.getByText('Nómina')).toBeInTheDocument();
    expect(screen.getByText('Dividendos')).toBeInTheDocument();

    // Y ya no deben estar las de gasto
    expect(screen.queryByText('Restaurantes')).not.toBeInTheDocument();
    expect(screen.queryByText('Transporte')).not.toBeInTheDocument();
  });

  it('permite cambiar la cuenta receptora de la fila', () => {
    const onCommitMock = vi.fn();

    render(
      <ImportPreviewTable
        initialRows={mockInitialRows}
        categories={mockCategories}
        accounts={mockAccounts}
        defaultAccountId="acc-1"
        onCommit={onCommitMock}
        onBack={vi.fn()}
      />,
    );

    const accountSelect = screen.getByDisplayValue('Cuenta Corriente');
    fireEvent.change(accountSelect, { target: { value: 'acc-2' } });

    // Pulsar botón de confirmar importación
    const commitBtn = screen.getByRole('button', { name: /Confirmar e Importar/i });
    fireEvent.click(commitBtn);

    expect(onCommitMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          accountId: 'acc-2',
        }),
      ]),
    );
  });
});
