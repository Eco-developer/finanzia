'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/presentation/components/ui/Modal';
import { Input } from '@/presentation/components/ui/Input';
import { Select } from '@/presentation/components/ui/Select';
import { Button } from '@/presentation/components/ui/Button';
import { MoneyDisplay } from './MoneyDisplay';
import { useAccounts, type AccountType, type AccountItem } from '@/presentation/hooks/useAccounts';
import styles from './EditAccountModal.module.css';

export interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  account: AccountItem | null;
}

const ACCOUNT_TYPES = [
  { value: 'CHECKING', label: 'Cuenta Corriente (Bancaria)' },
  { value: 'SAVINGS', label: 'Cuenta de Ahorro' },
  { value: 'CREDIT_CARD', label: 'Tarjeta de Crédito' },
  { value: 'CASH', label: 'Efectivo' },
  { value: 'INVESTMENT', label: 'Cuenta de Inversión' },
];

export function EditAccountModal({
  isOpen,
  onClose,
  onSuccess,
  account,
}: EditAccountModalProps) {
  const { updateAccount } = useAccounts();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('CHECKING');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (account && isOpen) {
      setName(account.name);
      setType(account.type);
      setError(null);
    }
  }, [account, isOpen]);

  if (!account) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('El nombre de la cuenta es obligatorio');
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setError('El nombre debe tener entre 2 y 100 caracteres');
      return;
    }

    try {
      setIsLoading(true);
      await updateAccount(account.id, {
        name: trimmedName,
        type,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la cuenta financiera');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Modificar Cuenta"
      description="Actualiza el nombre identificativo o tipo de tu cuenta financiera."
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <div className={styles.errorBanner}>{error}</div>}

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

        <div className={styles.balanceNotice}>
          <div>
            <div className={styles.balanceLabel}>Saldo Actual Verificado</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Auditado por el libro contable de movimientos
            </span>
          </div>
          <MoneyDisplay cents={account.currentBalanceCents} size="md" colorCoded={false} />
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
