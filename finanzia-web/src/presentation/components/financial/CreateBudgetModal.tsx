'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/presentation/components/ui/Modal';
import { Input } from '@/presentation/components/ui/Input';
import { Select } from '@/presentation/components/ui/Select';
import { Button } from '@/presentation/components/ui/Button';
import { budgetsApi, BudgetPacingItem } from '@/infrastructure/api/budgets.api';
import { CategoryItem } from '@/infrastructure/api/categories.api';
import { parseInputToCents } from '@/core/domain/formatters/money.formatter';

interface CreateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: CategoryItem[];
  initialMonth?: number;
  initialYear?: number;
  editingItem?: BudgetPacingItem | null;
}

export function CreateBudgetModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
  initialMonth = new Date().getMonth() + 1,
  initialYear = new Date().getFullYear(),
  editingItem,
}: CreateBudgetModalProps) {
  // Filtrar solo categorías de tipo gasto (EXPENSE)
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');

  const [categoryId, setCategoryId] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [periodMonth, setPeriodMonth] = useState(initialMonth);
  const [periodYear, setPeriodYear] = useState(initialYear);
  const [alertThresholdPct, setAlertThresholdPct] = useState(80);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setCategoryId(editingItem.categoryId);
      setAmountInput((editingItem.amountLimitCents / 100).toFixed(2));
      setAlertThresholdPct(editingItem.alertThresholdPct || 80);
    } else {
      setCategoryId(expenseCategories[0]?.id || '');
      setAmountInput('');
      setPeriodMonth(initialMonth);
      setPeriodYear(initialYear);
      setAlertThresholdPct(80);
    }
    setError(null);
  }, [editingItem, isOpen, initialMonth, initialYear, expenseCategories]);

  const categoryOptions = expenseCategories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!categoryId) {
      setError('Debes seleccionar una categoría de gasto');
      return;
    }

    let amountLimitCents = 0;
    try {
      amountLimitCents = parseInputToCents(amountInput);
      if (amountLimitCents <= 0) {
        setError('El límite del presupuesto debe ser superior a 0 €');
        return;
      }
    } catch {
      setError('Introduce un importe numérico válido (ej. 250.00)');
      return;
    }

    setIsLoading(true);
    try {
      await budgetsApi.createBudget({
        categoryId,
        amountLimitCents,
        periodMonth,
        periodYear,
        alertThresholdPct,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err.message || 'Error al guardar el presupuesto. Inténtalo de nuevo.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? 'Modificar Presupuesto' : 'Fijar Presupuesto Mensual'}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {error && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              fontSize: '0.875rem',
            }}
          >
            {error}
          </div>
        )}

        <Select
          id="budget-category"
          label="Categoría de Gasto"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          options={categoryOptions}
          disabled={!!editingItem || isLoading}
        />

        <Input
          id="budget-amount"
          label="Límite Mensual (€)"
          type="text"
          placeholder="ej. 300,00"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          required
          disabled={isLoading}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            id="budget-month"
            label="Mes (1 - 12)"
            type="number"
            min={1}
            max={12}
            value={periodMonth}
            onChange={(e) => setPeriodMonth(parseInt(e.target.value, 10))}
            required
            disabled={!!editingItem || isLoading}
          />
          <Input
            id="budget-year"
            label="Año"
            type="number"
            min={2020}
            max={2030}
            value={periodYear}
            onChange={(e) => setPeriodYear(parseInt(e.target.value, 10))}
            required
            disabled={!!editingItem || isLoading}
          />
        </div>

        <Input
          id="budget-threshold"
          label="Umbral de Alerta (% de consumo)"
          type="number"
          min={10}
          max={100}
          value={alertThresholdPct}
          onChange={(e) => setAlertThresholdPct(parseInt(e.target.value, 10))}
          required
          disabled={isLoading}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            {editingItem ? 'Actualizar Límite' : 'Guardar Presupuesto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
