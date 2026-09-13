'use client';

import React, { useState } from 'react';
import { Modal } from '@/presentation/components/ui/Modal';
import { Input } from '@/presentation/components/ui/Input';
import { Select } from '@/presentation/components/ui/Select';
import { Button } from '@/presentation/components/ui/Button';
import { accountsApi, AccountType, AccountItem } from '@/infrastructure/api/accounts.api';
import { parseInputToCents } from '@/core/domain/formatters/money.formatter';

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (account: AccountItem) => void;
}

const ACCOUNT_TYPES = [
  { value: 'CHECKING', label: 'Cuenta Corriente (Bancaria)' },
  { value: 'SAVINGS', label: 'Cuenta de Ahorro' },
  { value: 'CREDIT_CARD', label: 'Tarjeta de Crédito' },
  { value: 'CASH', label: 'Efectivo' },
  { value: 'INVESTMENT', label: 'Cuenta de Inversión' },
];

export function CreateAccountModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateAccountModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('CHECKING');
  const [balanceInput, setBalanceInput] = useState('0');
  const [currency, setCurrency] = useState('EUR');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('El nombre de la cuenta es obligatorio');
      return;
    }

    let initialBalanceCents = 0;
    try {
      initialBalanceCents = parseInputToCents(balanceInput || '0');
    } catch {
      setError('El saldo inicial debe ser un número válido');
      return;
    }

    try {
      setIsLoading(true);
      const account = await accountsApi.createAccount({
        name: name.trim(),
        type,
        initialBalanceCents,
        currency,
      });
      onSuccess(account);
      onClose();
      // Reset
      setName('');
      setBalanceInput('0');
      setType('CHECKING');
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta financiera');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Nueva Cuenta"
      description="Registra una cuenta bancaria, efectivo o ahorro para controlar tus saldos."
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

        <Input
          label="Nombre de la Cuenta"
          placeholder="Ej. Cuenta Nómina BBVA, Cartera Efectivo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Select
          label="Tipo de Cuenta"
          options={ACCOUNT_TYPES}
          value={type}
          onChange={(e) => setType(e.target.value as AccountType)}
        />

        <Input
          label="Saldo Inicial (€)"
          placeholder="0,00"
          value={balanceInput}
          onChange={(e) => setBalanceInput(e.target.value)}
          helperText="Se convertirá internamente a céntimos enteros (cero float)."
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? 'Creando...' : 'Crear Cuenta'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
