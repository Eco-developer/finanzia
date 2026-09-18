'use client';

import React, { useState } from 'react';
import { Modal } from '@/presentation/components/ui/Modal';
import { Input } from '@/presentation/components/ui/Input';
import { Button } from '@/presentation/components/ui/Button';
import { useGoals, type GoalItem } from '@/presentation/hooks/useGoals';
import { parseInputToCents } from '@/core/domain/formatters/money.formatter';
import { MoneyDisplay } from './MoneyDisplay';

interface ContributeGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  goal: GoalItem | null;
}

export function ContributeGoalModal({
  isOpen,
  onClose,
  onSuccess,
  goal,
}: ContributeGoalModalProps) {
  const { contributeToGoal } = useGoals();
  const [amountInput, setAmountInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!goal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let amountCents = 0;
    try {
      amountCents = parseInputToCents(amountInput);
      if (amountCents <= 0) {
        setError('El importe a aportar debe ser mayor que 0 €');
        return;
      }
    } catch {
      setError('Introduce un importe válido (ej. 50.00)');
      return;
    }

    setIsLoading(true);
    try {
      await contributeToGoal(goal.id, { amountCents });
      setAmountInput('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al registrar la aportación a la meta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Aportar Fondos: ${goal.name}`}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '1rem',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Saldo Acumulado</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              <MoneyDisplay cents={goal.currentAmountCents} colorCoded={false} />
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Resta para Meta</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a78bfa' }}>
              <MoneyDisplay cents={goal.remainingCents} colorCoded={false} />
            </div>
          </div>
        </div>

        <Input
          id="contribution-amount"
          label="Importe a Añadir (€)"
          placeholder="ej. 100,00"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          required
          autoFocus
          disabled={isLoading}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            Confirmar Aportación
          </Button>
        </div>
      </form>
    </Modal>
  );
}
