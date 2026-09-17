import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RecommendationCard } from '../../src/presentation/components/ai-advisor/RecommendationCard';
import { RecommendationItem } from '../../src/infrastructure/api/recommendations.api';

describe('RecommendationCard Component (Human-in-the-Loop)', () => {
  const baseRecommendation: RecommendationItem = {
    id: 'rec-test-1',
    type: 'BUDGET_ADJUSTMENT',
    title: 'Optimización de Presupuesto en Ocio',
    details: 'Has consumido el 85% de tu presupuesto. Te proponemos aumentar el límite en 30 €.',
    proposedAction: {
      actionType: 'UPDATE_BUDGET_LIMIT',
      budgetId: 'bgt-1',
      newLimitCents: 23000,
    },
    status: 'PROPOSED',
    createdAt: new Date().toISOString(),
  };

  it('debe renderizar la información de la recomendación y la acción propuesta', () => {
    render(
      <RecommendationCard
        recommendation={baseRecommendation}
        onApply={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(screen.getByText('Optimización de Presupuesto en Ocio')).toBeDefined();
    expect(screen.getByText(/Has consumido el 85%/)).toBeDefined();
    expect(screen.getByText(/Supervisión Humana/)).toBeDefined();
    expect(screen.getByText(/230,00 €/)).toBeDefined();
  });

  it('debe invocar onApply al hacer clic en [Aprobar y Aplicar]', async () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    const onReject = vi.fn();

    render(
      <RecommendationCard
        recommendation={baseRecommendation}
        onApply={onApply}
        onReject={onReject}
      />,
    );

    const applyBtn = screen.getByText('✓ Aprobar y Aplicar');
    await act(async () => {
      fireEvent.click(applyBtn);
    });

    expect(onApply).toHaveBeenCalledWith('rec-test-1');
    expect(onReject).not.toHaveBeenCalled();
  });

  it('debe invocar onReject al hacer clic en [Descartar]', async () => {
    const onApply = vi.fn();
    const onReject = vi.fn().mockResolvedValue(undefined);

    render(
      <RecommendationCard
        recommendation={baseRecommendation}
        onApply={onApply}
        onReject={onReject}
      />,
    );

    const rejectBtn = screen.getByText('Descartar');
    await act(async () => {
      fireEvent.click(rejectBtn);
    });

    expect(onReject).toHaveBeenCalledWith('rec-test-1');
    expect(onApply).not.toHaveBeenCalled();
  });
});
