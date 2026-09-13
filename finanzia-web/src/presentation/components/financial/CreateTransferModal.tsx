'use client';

import React, { useState } from 'react';
import { Modal } from '@/presentation/components/ui/Modal';
import { Input } from '@/presentation/components/ui/Input';
import { Select } from '@/presentation/components/ui/Select';
import { Button } from '@/presentation/components/ui/Button';
import { transactionsApi } from '@/infrastructure/api/transactions.api';
import { AccountItem } from '@/infrastructure/api/accounts.api';
import { parseInputToCents } from '@/core/domain/formatters/money.formatter';

interface CreateTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: AccountItem[];
}

export function CreateTransferModal({
  isOpen,
  onClose,
  onSuccess,
  accounts,
}: CreateTransferModalProps) {
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || accounts[0]?.id || '');
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('Traspaso entre cuentas propias');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const accountOptions = accounts.map((acc) => ({
    value: acc.id,
    label: `${acc.name} (${(acc.currentBalanceCents / 100).toFixed(2)} €)`,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (fromAccountId === toAccountId) {
      setError('La cuenta de origen y destino deben ser distintas');
      return;
    }

    let amountCents = 0;
    try {
      amountCents = parseInputToCents(amountInput);
      if (amountCents <= 0) {
        setError('El importe a transferir debe ser mayor que cero');
        return;
      }
    } catch {
      setError('Introduce un importe numérico válido');
      return;
    }

    try {
      setIsLoading(true);
      await transactionsApi.createTransfer({
        fromAccountId,
        toAccountId,
        amountCents,
        description: description.trim(),
        transactionDate: new Date(transactionDate).toISOString(),
      });
      onSuccess();
      onClose();
      setAmountInput('');
    } catch (err: any) {
      setError(err.message || 'Error al ejecutar la transferencia');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transferencia entre Cuentas"
      description="Traspasa dinero entre tus cuentas con actualización atómica de ambos saldos."
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

        <Select
          label="Cuenta de Origen (Sale el dinero)"
          options={accountOptions}
          value={fromAccountId}
          onChange={(e) => setFromAccountId(e.target.value)}
        />

        <Select
          label="Cuenta de Destino (Entra el dinero)"
          options={accountOptions}
          value={toAccountId}
          onChange={(e) => setToAccountId(e.target.value)}
        />

        <Input
          label="Importe a transferir (€)"
          placeholder="0,00"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          required
        />

        <Input
          label="Concepto"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? 'Transfiriendo...' : 'Ejecutar Transferencia'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
