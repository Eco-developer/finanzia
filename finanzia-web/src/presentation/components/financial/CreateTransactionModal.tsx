'use client';

import React, { useState } from 'react';
import { Modal } from '@/presentation/components/ui/Modal';
import { Input } from '@/presentation/components/ui/Input';
import { Select } from '@/presentation/components/ui/Select';
import { Button } from '@/presentation/components/ui/Button';
import { useTransactions, type TransactionType } from '@/presentation/hooks/useTransactions';
import type { AccountItem } from '@/infrastructure/api/accounts.api';
import type { CategoryItem } from '@/infrastructure/api/categories.api';
import { parseInputToCents } from '@/core/domain/formatters/money.formatter';

interface CreateTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: AccountItem[];
  categories: CategoryItem[];
}

export function CreateTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  categories,
}: CreateTransactionModalProps) {
  const { createTransaction } = useTransactions();
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Opciones de cuentas y categorías
  const accountOptions = accounts.map((acc) => ({
    value: acc.id,
    label: `${acc.name} (${(acc.currentBalanceCents / 100).toFixed(2)} €)`,
  }));

  const filteredCategories = categories.filter((cat) => cat.type === type);
  const categoryOptions = [
    { value: '', label: '-- Sin categoría asignada --' },
    ...filteredCategories.map((cat) => ({
      value: cat.id,
      label: cat.name,
    })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!accountId) {
      setError('Debes seleccionar una cuenta financiera');
      return;
    }

    if (!description.trim()) {
      setError('El concepto o descripción es obligatorio');
      return;
    }

    let amountCents = 0;
    try {
      amountCents = parseInputToCents(amountInput);
      if (amountCents <= 0) {
        setError('El importe debe ser mayor que cero');
        return;
      }
    } catch {
      setError('Introduce un importe numérico válido (ej. 45,50)');
      return;
    }

    try {
      setIsLoading(true);
      await createTransaction({
        accountId,
        categoryId: categoryId || null,
        type,
        amountCents,
        description: description.trim(),
        transactionDate: new Date(transactionDate).toISOString(),
      });
      onSuccess();
      onClose();
      // Reset
      setAmountInput('');
      setDescription('');
    } catch (err: any) {
      setError(err.message || 'Error al registrar la transacción');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo Movimiento"
      description="Registra un gasto o ingreso manual con actualización de saldo atómica."
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {error && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: 'var(--status-expense)',
              fontSize: '0.875rem',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Button
            type="button"
            variant={type === 'EXPENSE' ? 'primary' : 'outline'}
            onClick={() => setType('EXPENSE')}
            style={{
              borderColor: type === 'EXPENSE' ? 'var(--status-expense)' : undefined,
              backgroundColor: type === 'EXPENSE' ? 'var(--status-expense)' : undefined,
            }}
          >
            📉 Gasto
          </Button>
          <Button
            type="button"
            variant={type === 'INCOME' ? 'primary' : 'outline'}
            onClick={() => setType('INCOME')}
            style={{
              borderColor: type === 'INCOME' ? 'var(--status-income)' : undefined,
              backgroundColor: type === 'INCOME' ? 'var(--status-income)' : undefined,
            }}
          >
            📈 Ingreso
          </Button>
        </div>

        <Select
          label="Cuenta Financiera"
          options={accountOptions}
          value={accountId || accounts[0]?.id || ''}
          onChange={(e) => setAccountId(e.target.value)}
        />

        <Select
          label="Categoría"
          options={categoryOptions}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        />

        <Input
          label="Importe (€)"
          placeholder="0,00"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          required
        />

        <Input
          label="Concepto / Beneficiario"
          placeholder="Ej. Compra Mercadona, Nómina, Restaurante"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <Input
          label="Fecha y Hora"
          type="datetime-local"
          value={transactionDate}
          onChange={(e) => setTransactionDate(e.target.value)}
          required
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar Movimiento'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
