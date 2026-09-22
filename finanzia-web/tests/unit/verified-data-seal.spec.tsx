import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VerifiedDataSeal } from '../../src/presentation/components/ai-advisor/VerifiedDataSeal';
import { ToolCallExecution } from '../../src/infrastructure/api/advisor.api';

describe('VerifiedDataSeal Component (Transparency & Auditability)', () => {
  const sampleTools: ToolCallExecution[] = [
    {
      toolName: 'get_financial_summary',
      args: { month: 9, year: 2026 },
      result: { totalIncomeCents: 250000, totalExpenseCents: 100000 },
    },
    {
      toolName: 'get_budget_status',
      args: { month: 9, year: 2026 },
      result: { count: 3 },
    },
  ];

  it('no debe renderizar nada si la lista de herramientas está vacía o nula', () => {
    const { container } = render(<VerifiedDataSeal toolExecutions={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('debe renderizar el botón de sello de datos verificados con el conteo exacto', () => {
    render(<VerifiedDataSeal toolExecutions={sampleTools} />);
    expect(screen.getByText(/Datos verificados \(2 consultas\)/)).toBeDefined();
  });

  it('debe desplegar el detalle de herramientas ejecutadas al hacer clic en el botón', () => {
    render(<VerifiedDataSeal toolExecutions={sampleTools} />);

    const toggleBtn = screen.getByRole('button');
    fireEvent.click(toggleBtn);

    expect(screen.getByText(/Resumen Financiero Determinista/)).toBeDefined();
    expect(screen.getByText(/Pacing y Límites de Presupuestos/)).toBeDefined();
    expect(screen.getAllByText('✓ Verificado SQL').length).toBe(2);
  });
});
