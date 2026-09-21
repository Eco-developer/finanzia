'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/presentation/components/ui/Modal';
import { Input } from '@/presentation/components/ui/Input';
import { Select } from '@/presentation/components/ui/Select';
import { Button } from '@/presentation/components/ui/Button';
import { useTransactions } from '@/presentation/hooks/useTransactions';
import type { AccountItem } from '@/infrastructure/api/accounts.api';
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
  const { createTransfer } = useTransactions();
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('Traspaso entre cuentas propias');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reiniciar formulario al abrir el modal sin valores por defecto
  useEffect(() => {
    if (isOpen) {
      setFromAccountId('');
      setToAccountId('');
      setAmountInput('');
      setDescription('Traspaso entre cuentas propias');
      setError(null);
    }
  }, [isOpen]);

  const selectedFromAccount = accounts.find((acc) => acc.id === fromAccountId);

  // Opciones de cuenta de origen con placeholder
  const fromAccountOptions = [
    { value: '', label: 'Seleccionar cuenta' },
    ...accounts.map((acc) => ({
      value: acc.id,
      label: `${acc.name} (${(acc.currentBalanceCents / 100).toFixed(2).replace('.', ',')} €)`,
    })),
  ];

  // La cuenta de destino no incluye la cuenta de origen seleccionada
  const availableToAccounts = fromAccountId
    ? accounts.filter((acc) => acc.id !== fromAccountId)
    : accounts;

  const toAccountOptions = [
    { value: '', label: 'Seleccionar cuenta' },
    ...availableToAccounts.map((acc) => ({
      value: acc.id,
      label: `${acc.name} (${(acc.currentBalanceCents / 100).toFixed(2).replace('.', ',')} €)`,
    })),
  ];

  const handleFromAccountChange = (newFromId: string) => {
    setFromAccountId(newFromId);
    if (toAccountId === newFromId) {
      setToAccountId('');
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fromAccountId) {
      setError('Debes seleccionar una cuenta de origen');
      return;
    }

    if (!toAccountId) {
      setError('Debes seleccionar una cuenta de destino');
      return;
    }

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

    // Validación: el importe no debe ser mayor al total de la cuenta de origen
    if (selectedFromAccount) {
      if (selectedFromAccount.currentBalanceCents <= 0) {
        setError(
          `La cuenta de origen "${selectedFromAccount.name}" no dispone de saldo suficiente para transferir (Saldo disponible: ${(selectedFromAccount.currentBalanceCents / 100).toFixed(2).replace('.', ',')} €).`
        );
        return;
      }

      if (amountCents > selectedFromAccount.currentBalanceCents) {
        const availableFormatted = (selectedFromAccount.currentBalanceCents / 100)
          .toFixed(2)
          .replace('.', ',');
        const requestedFormatted = (amountCents / 100)
          .toFixed(2)
          .replace('.', ',');
        setError(
          `El importe (${requestedFormatted} €) no puede ser mayor al total de la cuenta de origen (${availableFormatted} €).`
        );
        return;
      }
    }

    try {
      setIsLoading(true);
      await createTransfer({
        fromAccountId,
        toAccountId,
        amountCents,
        description: description.trim(),
        transactionDate: new Date(transactionDate).toISOString(),
      });
      onSuccess();
      onClose();
      setAmountInput('');
      setFromAccountId('');
      setToAccountId('');
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
          options={fromAccountOptions}
          value={fromAccountId}
          onChange={(e) => handleFromAccountChange(e.target.value)}
          required
        />

        <Select
          label="Cuenta de Destino (Entra el dinero)"
          options={toAccountOptions}
          value={toAccountId}
          onChange={(e) => {
            setToAccountId(e.target.value);
            setError(null);
          }}
          disabled={!fromAccountId}
          helperText={
            !fromAccountId ? 'Selecciona primero la cuenta de origen' : undefined
          }
          required
        />

        <Input
          label="Importe a transferir (€)"
          placeholder="0,00"
          value={amountInput}
          onChange={(e) => {
            setAmountInput(e.target.value);
            setError(null);
          }}
          helperText={
            selectedFromAccount
              ? `Saldo disponible en origen: ${(selectedFromAccount.currentBalanceCents / 100).toFixed(2).replace('.', ',')} €`
              : undefined
          }
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
