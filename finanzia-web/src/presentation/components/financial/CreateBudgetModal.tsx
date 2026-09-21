'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/presentation/components/ui/Modal';
import { Input } from '@/presentation/components/ui/Input';
import { Select } from '@/presentation/components/ui/Select';
import { Button } from '@/presentation/components/ui/Button';
import { useBudgets, type BudgetPacingItem } from '@/presentation/hooks/useBudgets';
import type { CategoryItem } from '@/infrastructure/api/categories.api';
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
  const { createBudget, updateBudget } = useBudgets();
  // Filtrar solo categorías de tipo gasto (EXPENSE)
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');

  const [categoryId, setCategoryId] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [periodMonth, setPeriodMonth] = useState(initialMonth);
  const [periodYear, setPeriodYear] = useState(initialYear);
  const [alertThresholdPct, setAlertThresholdPct] = useState(80);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Inicializar el formulario únicamente cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        // Modo Edición: Asignar datos del presupuesto seleccionado
        setCategoryId(editingItem.categoryId);
        setAmountInput((editingItem.amountLimitCents / 100).toFixed(2).replace('.', ','));
        setAlertThresholdPct(editingItem.alertThresholdPct || 80);
      } else {
        // Modo Creación: Inicializar con valores por defecto
        setCategoryId(expenseCategories[0]?.id || '');
        setAmountInput('');
        setPeriodMonth(initialMonth);
        setPeriodYear(initialYear);
        setAlertThresholdPct(80);
      }
      setError(null);
    }
  }, [isOpen, editingItem]);

  // Función para reiniciar el formulario al cerrar (por botón, tecla Esc o clic afuera)
  const handleClose = () => {
    setCategoryId('');
    setAmountInput('');
    setPeriodMonth(initialMonth);
    setPeriodYear(initialYear);
    setAlertThresholdPct(80);
    setError(null);
    onClose();
  };

  const categoryOptions = [
    ...(editingItem && !expenseCategories.some((c) => c.id === editingItem.categoryId)
      ? [{ value: editingItem.categoryId, label: editingItem.categoryName }]
      : []),
    ...expenseCategories.map((c) => ({
      value: c.id,
      label: c.name,
    })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!editingItem && !categoryId) {
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
      setError('Introduce un importe numérico válido (ej. 250,00)');
      return;
    }

    setIsLoading(true);
    try {
      if (editingItem) {
        // Modo Edición: Modificar EXCLUSIVAMENTE el presupuesto específico por su ID único
        await updateBudget(editingItem.budgetId, {
          amountLimitCents,
          alertThresholdPct,
        });
      } else {
        // Modo Creación: Registrar nuevo presupuesto para la categoría seleccionada
        await createBudget({
          categoryId,
          amountLimitCents,
          periodMonth,
          periodYear,
          alertThresholdPct,
        });
      }

      handleClose();
      onSuccess();
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
      onClose={handleClose}
      title={editingItem ? `Modificar Presupuesto: ${editingItem.categoryName}` : 'Fijar Presupuesto Mensual'}
      description={
        editingItem
          ? `Ajusta el límite mensual exclusivo para la categoría "${editingItem.categoryName}".`
          : 'Fija límites mensuales en tus categorías de gasto para recibir alertas automáticas.'
      }
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
          helperText={editingItem ? 'La categoría está bloqueada para garantizar que solo se edite este presupuesto' : undefined}
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

        {!editingItem && (
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
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </div>
        )}

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
          helperText="Porcentaje de gasto en el que se activará el aviso preventivo"
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
          <Button variant="outline" type="button" onClick={handleClose} disabled={isLoading}>
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
