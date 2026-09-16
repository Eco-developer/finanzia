'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/presentation/components/ui/Modal';
import { Input } from '@/presentation/components/ui/Input';
import { Button } from '@/presentation/components/ui/Button';
import { goalsApi, GoalItem } from '@/infrastructure/api/goals.api';
import { parseInputToCents } from '@/core/domain/formatters/money.formatter';

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingGoal?: GoalItem | null;
}

export function CreateGoalModal({
  isOpen,
  onClose,
  onSuccess,
  editingGoal,
}: CreateGoalModalProps) {
  const [name, setName] = useState('');
  const [targetAmountInput, setTargetAmountInput] = useState('');
  const [currentAmountInput, setCurrentAmountInput] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (editingGoal) {
      setName(editingGoal.name);
      setTargetAmountInput((editingGoal.targetAmountCents / 100).toFixed(2));
      setCurrentAmountInput((editingGoal.currentAmountCents / 100).toFixed(2));
      setTargetDate(
        editingGoal.targetDate
          ? new Date(editingGoal.targetDate).toISOString().slice(0, 10)
          : '',
      );
    } else {
      setName('');
      setTargetAmountInput('');
      setCurrentAmountInput('');
      setTargetDate('');
    }
    setError(null);
  }, [editingGoal, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('El nombre de la meta es obligatorio');
      return;
    }

    let targetAmountCents = 0;
    try {
      targetAmountCents = parseInputToCents(targetAmountInput);
      if (targetAmountCents <= 0) {
        setError('El objetivo debe ser mayor que 0 €');
        return;
      }
    } catch {
      setError('Introduce un importe objetivo numérico válido (ej. 1500.00)');
      return;
    }

    let currentAmountCents = 0;
    if (currentAmountInput.trim()) {
      try {
        currentAmountCents = parseInputToCents(currentAmountInput);
      } catch {
        setError('Introduce un saldo inicial válido');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (editingGoal) {
        await goalsApi.updateGoal(editingGoal.id, {
          name: name.trim(),
          targetAmountCents,
          targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
        });
      } else {
        await goalsApi.createGoal({
          name: name.trim(),
          targetAmountCents,
          currentAmountCents,
          targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la meta de ahorro');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingGoal ? 'Editar Meta de Ahorro' : 'Crear Nueva Meta de Ahorro'}
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

        <Input
          id="goal-name"
          label="Nombre del Objetivo"
          placeholder="ej. Fondo de Emergencia, Vacaciones Japón"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isLoading}
        />

        <Input
          id="goal-target"
          label="Monto Objetivo (€)"
          placeholder="ej. 3000,00"
          value={targetAmountInput}
          onChange={(e) => setTargetAmountInput(e.target.value)}
          required
          disabled={isLoading}
        />

        {!editingGoal && (
          <Input
            id="goal-current"
            label="Monto Inicial Aportado (€) (Opcional)"
            placeholder="0,00"
            value={currentAmountInput}
            onChange={(e) => setCurrentAmountInput(e.target.value)}
            disabled={isLoading}
          />
        )}

        <Input
          id="goal-date"
          label="Fecha Límite Estimada (Opcional)"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          disabled={isLoading}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            {editingGoal ? 'Actualizar Meta' : 'Crear Meta'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
