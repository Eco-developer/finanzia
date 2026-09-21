'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/presentation/components/ui/Modal';
import { Input } from '@/presentation/components/ui/Input';
import { Select } from '@/presentation/components/ui/Select';
import { Button } from '@/presentation/components/ui/Button';
import { useTransactions, type TransactionItem, type TransactionType } from '@/presentation/hooks/useTransactions';
import type { AccountItem } from '@/infrastructure/api/accounts.api';
import type { CategoryItem } from '@/infrastructure/api/categories.api';
import { parseInputToCents } from '@/core/domain/formatters/money.formatter';
import { ArrowDownLeft, ArrowUpRight, Save } from 'lucide-react';
import styles from './EditTransactionModal.module.css';

export interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction: TransactionItem | null;
  accounts: AccountItem[];
  categories: CategoryItem[];
}

export function EditTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  transaction,
  accounts,
  categories,
}: EditTransactionModalProps) {
  const { updateTransaction } = useTransactions();
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Inicializar campos cuando se abre con una transacción existente
  useEffect(() => {
    if (transaction && isOpen) {
      setType(transaction.type === 'INCOME' ? 'INCOME' : 'EXPENSE');
      setAccountId(transaction.accountId || accounts[0]?.id || '');
      setCategoryId(transaction.categoryId || '');
      setAmountInput((Math.abs(transaction.amountCents) / 100).toFixed(2));
      setDescription(transaction.description || '');
      setNotes(transaction.notes || '');

      try {
        const d = new Date(transaction.transactionDate);
        setTransactionDate(d.toISOString().slice(0, 16));
      } catch {
        setTransactionDate(new Date().toISOString().slice(0, 16));
      }
      setError(null);
    }
  }, [transaction, isOpen, accounts]);

  // Si cambia el tipo, verificar si la categoría actual sigue siendo compatible
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (categoryId) {
      const cat = categories.find((c) => c.id === categoryId);
      if (cat && cat.type !== newType) {
        setCategoryId('');
      }
    }
  };

  const accountOptions = accounts.map((acc) => ({
    value: acc.id,
    label: `${acc.name} (${(acc.currentBalanceCents / 100).toFixed(2)} €)`,
  }));

  // Filtrar categorías estrictamente según el tipo elegido
  const filteredCategories = categories.filter((cat) => cat.type === type);
  const categoryOptions = [
    { value: '', label: '-- Sin categoría --' },
    ...filteredCategories.map((cat) => ({
      value: cat.id,
      label: `${cat.icon ? cat.icon + ' ' : ''}${cat.name}`,
    })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;
    setError(null);

    if (!accountId) {
      setError('Debes seleccionar una cuenta financiera');
      return;
    }

    if (!description.trim()) {
      setError('El concepto de la transacción es obligatorio');
      return;
    }

    const cents = parseInputToCents(amountInput);
    if (cents <= 0) {
      setError('El importe debe ser mayor que cero');
      return;
    }

    setIsLoading(true);
    try {
      await updateTransaction(transaction.id, {
        accountId,
        categoryId: categoryId || null,
        amountCents: type === 'EXPENSE' ? -cents : cents,
        type,
        description: description.trim(),
        transactionDate: new Date(transactionDate).toISOString(),
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la transacción');
    } finally {
      setIsLoading(false);
    }
  };

  if (!transaction) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Modificar Transacción"
      description="Actualiza los datos del movimiento. Los saldos de las cuentas se sincronizarán automáticamente."
      size="md"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <div className={styles.errorBanner}>{error}</div>}

        {/* Tipo de movimiento */}
        <div className={styles.typeSelector}>
          <button
            type="button"
            className={`${styles.typeBtn} ${type === 'EXPENSE' ? styles.typeBtnExpenseActive : ''}`}
            onClick={() => handleTypeChange('EXPENSE')}
          >
            <ArrowUpRight size={16} /> Gasto
          </button>
          <button
            type="button"
            className={`${styles.typeBtn} ${type === 'INCOME' ? styles.typeBtnIncomeActive : ''}`}
            onClick={() => handleTypeChange('INCOME')}
          >
            <ArrowDownLeft size={16} /> Ingreso
          </button>
        </div>

        {/* Concepto */}
        <Input
          label="Concepto / Detalle"
          placeholder="Ej. Compra semanal, Factura luz..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        {/* Fila Importe y Fecha */}
        <div className={styles.row}>
          <Input
            label="Importe (€)"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            required
          />
          <Input
            label="Fecha y hora"
            type="datetime-local"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            required
          />
        </div>

        {/* Fila Cuenta y Categoría */}
        <div className={styles.row}>
          <Select
            label="Cuenta"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            options={accountOptions}
            required
          />
          <Select
            label={`Categoría (${type === 'EXPENSE' ? 'Gasto' : 'Ingreso'})`}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={categoryOptions}
          />
        </div>

        {/* Notas adicionales */}
        <Input
          label="Notas adicionales (opcional)"
          placeholder="Detalles sobre el movimiento..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className={styles.footerActions}>
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading} icon={<Save size={16} />}>
            Guardar Cambios
          </Button>
        </div>
      </form>
    </Modal>
  );
}
