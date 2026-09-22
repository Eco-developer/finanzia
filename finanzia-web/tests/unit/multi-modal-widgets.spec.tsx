import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MultiModalWidgets } from '../../src/presentation/components/ai-advisor/MultiModalWidgets';
import { ToolCallExecution } from '../../src/infrastructure/api/advisor.api';

describe('MultiModalWidgets Component (Charts, Goals & Plan Visualizers)', () => {
  it('no debe renderizar nada si no hay herramientas relevantes', () => {
    const { container } = render(<MultiModalWidgets toolExecutions={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('debe renderizar el widget de desglose de categorías cuando está presente', () => {
    const tools: ToolCallExecution[] = [
      {
        toolName: 'get_expenses_by_category',
        args: { startDate: '2026-09-01', endDate: '2026-09-30' },
        result: {
          categories: [
            { categoryName: 'Supermercado', totalAmountCents: 35000, percentageOfTotal: 50 },
            { categoryName: 'Restaurantes', totalAmountCents: 15000, percentageOfTotal: 21.4 },
          ],
        },
      },
    ];

    render(<MultiModalWidgets toolExecutions={tools} />);

    expect(screen.getByText('Desglose Visual de Gastos')).toBeDefined();
    expect(screen.getByText('Supermercado')).toBeDefined();
    expect(screen.getByText('350,00 € (50%)')).toBeDefined();
    expect(screen.getByText('Restaurantes')).toBeDefined();
  });

  it('debe renderizar el widget de progreso de metas de ahorro', () => {
    const tools: ToolCallExecution[] = [
      {
        toolName: 'get_savings_goals',
        args: {},
        result: {
          goals: [
            {
              name: 'Vacaciones de Verano',
              currentAmountCents: 150000,
              targetAmountCents: 200000,
              progressPercent: 75,
              isCompleted: false,
            },
          ],
        },
      },
    ];

    render(<MultiModalWidgets toolExecutions={tools} />);

    expect(screen.getByText('Progreso de Metas de Ahorro')).toBeDefined();
    expect(screen.getByText('Vacaciones de Verano')).toBeDefined();
    expect(screen.getByText('75%')).toBeDefined();
    expect(screen.getByText(/1500,00 € acumulados/)).toBeDefined();
    expect(screen.getByText(/Objetivo: 2000,00 €/)).toBeDefined();
  });

  it('debe renderizar la tarjeta de plan multi-paso con cuota y recortes sugeridos', () => {
    const tools: ToolCallExecution[] = [
      {
        toolName: 'calculate_savings_plan',
        args: { targetAmountCents: 300000, months: 6 },
        result: {
          goalName: 'Fondo de Emergencia',
          monthlyQuotaCents: 50000,
          months: 6,
          suggestedCuts: [
            {
              categoryName: 'Restaurantes',
              suggestedCutCents: 7500,
            },
          ],
        },
      },
    ];

    render(<MultiModalWidgets toolExecutions={tools} />);

    expect(screen.getByText(/Hoja de Ruta: Fondo de Emergencia/)).toBeDefined();
    expect(screen.getByText('500,00 €/mes')).toBeDefined();
    expect(screen.getByText('6 meses')).toBeDefined();
    expect(screen.getByText(/Restaurantes/)).toBeDefined();
    expect(screen.getByText(/reducir 75,00 €\/mes/)).toBeDefined();
  });

  it('debe renderizar la tarjeta de presupuesto asignado cuando create_budget se ejecuta', () => {
    const tools: ToolCallExecution[] = [
      {
        toolName: 'create_budget',
        args: { categoryName: 'Ocio', amountEur: 300, periodMonth: 9, periodYear: 2026 },
        result: {
          budgetId: 'b-123',
          categoryName: 'Ocio',
          amountLimitEur: 300,
          amountLimitCents: 30000,
          periodMonth: 9,
          periodYear: 2026,
          alertThresholdPct: 80,
        },
      },
    ];

    render(<MultiModalWidgets toolExecutions={tools} />);

    expect(screen.getByText('Presupuesto Asignado')).toBeDefined();
    expect(screen.getByText(/🏷️ Ocio/)).toBeDefined();
    expect(screen.getByText(/300,00 € \/ mes/)).toBeDefined();
    expect(screen.getByText('9/2026')).toBeDefined();
    expect(screen.getByText(/Alerta temprana activada al superar el 80%/)).toBeDefined();
  });

  it('debe renderizar la tarjeta de gasto contabilizado cuando create_transaction se ejecuta con EXPENSE', () => {
    const tools: ToolCallExecution[] = [
      {
        toolName: 'create_transaction',
        args: { amountEur: 45, type: 'EXPENSE', description: 'Gasolina' },
        result: {
          transactionId: 'tx-456',
          type: 'EXPENSE',
          amountEur: 45,
          amountCents: 4500,
          description: 'Gasolina',
          accountName: 'Cuenta Principal',
          categoryName: 'Transporte',
          newAccountBalanceEur: 1955,
          transactionDate: '2026-09-22T21:00:00.000Z',
        },
      },
    ];

    render(<MultiModalWidgets toolExecutions={tools} />);

    expect(screen.getByText('Gasto Contabilizado')).toBeDefined();
    expect(screen.getByText('Gasolina')).toBeDefined();
    expect(screen.getByText('-45,00 €')).toBeDefined();
    expect(screen.getByText(/🏦 Cuenta Principal/)).toBeDefined();
    expect(screen.getByText(/🏷️ Transporte/)).toBeDefined();
    expect(screen.getByText(/1955,00 €/)).toBeDefined();
  });

  it('debe renderizar la tarjeta de ingreso contabilizado cuando create_transaction se ejecuta con INCOME', () => {
    const tools: ToolCallExecution[] = [
      {
        toolName: 'create_transaction',
        args: { amountEur: 1500, type: 'INCOME', description: 'Nómina Septiembre' },
        result: {
          transactionId: 'tx-789',
          type: 'INCOME',
          amountEur: 1500,
          amountCents: 150000,
          description: 'Nómina Septiembre',
          accountName: 'Cuenta Nómina',
          categoryName: 'Salario',
          newAccountBalanceEur: 3500,
          transactionDate: '2026-09-22T21:00:00.000Z',
        },
      },
    ];

    render(<MultiModalWidgets toolExecutions={tools} />);

    expect(screen.getByText('Ingreso Contabilizado')).toBeDefined();
    expect(screen.getByText('Nómina Septiembre')).toBeDefined();
    expect(screen.getByText('+1500,00 €')).toBeDefined();
    expect(screen.getByText(/🏦 Cuenta Nómina/)).toBeDefined();
    expect(screen.getByText(/🏷️ Salario/)).toBeDefined();
    expect(screen.getByText(/3500,00 €/)).toBeDefined();
  });
});

