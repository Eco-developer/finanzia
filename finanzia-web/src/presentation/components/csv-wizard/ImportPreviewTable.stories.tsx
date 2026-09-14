import type { Meta, StoryObj } from '@storybook/react';
import { ImportPreviewTable } from './ImportPreviewTable';

const meta: Meta<typeof ImportPreviewTable> = {
  title: 'CSV Wizard/ImportPreviewTable',
  component: ImportPreviewTable,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Tabla de revisión de conciliación y previsualización previa a la importación. Detecta duplicados con hash SHA-256 (desmarcados por defecto) y permite asignar o cambiar categorías sugeridas.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ImportPreviewTable>;

const mockCategories = [
  { id: 'cat-1', name: 'Alimentación y Supermercado', type: 'EXPENSE' },
  { id: 'cat-2', name: 'Transporte y Combustible', type: 'EXPENSE' },
  { id: 'cat-3', name: 'Restaurantes y Ocio', type: 'EXPENSE' },
  { id: 'cat-4', name: 'Nómina y Salario', type: 'INCOME' },
];

const mockInitialRows = [
  {
    rowId: 'row-1',
    date: '2026-09-10T00:00:00Z',
    description: 'MERCADONA S.A. VALENCIA',
    amountCents: -4520,
    hash: 'hash-new-1',
    preview: {
      rowId: 'row-1',
      isDuplicate: false,
      suggestedCategoryId: 'cat-1',
      suggestedCategoryName: 'Alimentación y Supermercado',
    },
  },
  {
    rowId: 'row-2',
    date: '2026-09-08T00:00:00Z',
    description: 'ESTACION REPSOL ALBACETE',
    amountCents: -6000,
    hash: 'hash-dup-2',
    preview: {
      rowId: 'row-2',
      isDuplicate: true, // Duplicado -> Desmarcado por defecto
      suggestedCategoryId: 'cat-2',
      suggestedCategoryName: 'Transporte y Combustible',
    },
  },
  {
    rowId: 'row-3',
    date: '2026-09-05T00:00:00Z',
    description: 'NOMINA MENSUAL TECNOLOGICA S.L.',
    amountCents: 245000,
    hash: 'hash-new-3',
    preview: {
      rowId: 'row-3',
      isDuplicate: false,
      suggestedCategoryId: 'cat-4',
      suggestedCategoryName: 'Nómina y Salario',
    },
  },
];

export const Default: Story = {
  args: {
    initialRows: mockInitialRows,
    categories: mockCategories,
    onCommit: (selected) => console.log('Commit transacciones:', selected),
    onBack: () => console.log('Volver atrás'),
    isCommitting: false,
  },
};

export const CommittingState: Story = {
  args: {
    initialRows: mockInitialRows,
    categories: mockCategories,
    onCommit: () => {},
    onBack: () => {},
    isCommitting: true,
  },
};
