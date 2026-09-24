'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/presentation/components/ui/Modal';
import { Input } from '@/presentation/components/ui/Input';
import { Button } from '@/presentation/components/ui/Button';
import {
  debtsApi,
  DebtItem,
  CreateDebtDto,
  UpdateDebtDto,
  InterestRateType,
} from '@/infrastructure/api/debts.api';
import styles from './CreateDebtModal.module.css';

interface CreateDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingDebt?: DebtItem | null;
}

export function CreateDebtModal({
  isOpen,
  onClose,
  onSuccess,
  editingDebt,
}: CreateDebtModalProps) {
  const [concept, setConcept] = useState('');
  const [creditor, setCreditor] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [rateInput, setRateInput] = useState('');
  const [rateType, setRateType] = useState<InterestRateType>('ANNUAL');
  const [quotaInput, setQuotaInput] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (editingDebt) {
      setConcept(editingDebt.concept);
      setCreditor(editingDebt.creditor || '');
      setAmountInput((Number(editingDebt.remainingAmountCents) / 100).toString());
      setRateInput((editingDebt.interestRateBasisPts / 100).toString());
      setRateType(editingDebt.interestRateType);
      setQuotaInput(
        editingDebt.minimumMonthlyPaymentCents
          ? (Number(editingDebt.minimumMonthlyPaymentCents) / 100).toString()
          : '',
      );
      setDueDate(
        editingDebt.dueDate
          ? new Date(editingDebt.dueDate).toISOString().slice(0, 10)
          : '',
      );
      setNotes(editingDebt.notes || '');
    } else {
      setConcept('');
      setCreditor('');
      setAmountInput('');
      setRateInput('6.5');
      setRateType('ANNUAL');
      setQuotaInput('');
      setDueDate('');
      setNotes('');
    }
    setError(null);
  }, [editingDebt, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!concept.trim()) {
      setError('El concepto de la deuda es obligatorio.');
      return;
    }

    const amountEur = parseFloat(amountInput.replace(',', '.'));
    if (isNaN(amountEur) || amountEur <= 0) {
      setError('Introduce un importe válido mayor que cero.');
      return;
    }

    const ratePercent = parseFloat(rateInput.replace(',', '.'));
    if (isNaN(ratePercent) || ratePercent < 0) {
      setError('Introduce una tasa de interés válida.');
      return;
    }

    const quotaEur = quotaInput.trim() ? parseFloat(quotaInput.replace(',', '.')) : undefined;
    if (quotaEur !== undefined && (isNaN(quotaEur) || quotaEur < 0)) {
      setError('La cuota mensual debe ser un número positivo.');
      return;
    }

    const initialAmountCents = Math.round(amountEur * 100);
    const interestRateBasisPts = Math.round(ratePercent * 100);
    const minimumMonthlyPaymentCents =
      quotaEur !== undefined ? Math.round(quotaEur * 100) : undefined;

    setIsLoading(true);
    try {
      if (editingDebt) {
        const updateDto: UpdateDebtDto = {
          concept: concept.trim(),
          creditor: creditor.trim() || undefined,
          interestRateBasisPts,
          interestRateType: rateType,
          minimumMonthlyPaymentCents,
          dueDate: dueDate || undefined,
          notes: notes.trim() || undefined,
        };
        await debtsApi.updateDebt(editingDebt.id, updateDto);
      } else {
        const createDto: CreateDebtDto = {
          concept: concept.trim(),
          creditor: creditor.trim() || undefined,
          initialAmountCents,
          remainingAmountCents: initialAmountCents,
          interestRateBasisPts,
          interestRateType: rateType,
          minimumMonthlyPaymentCents,
          dueDate: dueDate || undefined,
          notes: notes.trim() || undefined,
        };
        await debtsApi.createDebt(createDto);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar la deuda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingDebt ? 'Editar Datos de Deuda' : 'Dar de Alta Deuda o Préstamo'}
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <div className={styles.errorBanner}>{error}</div>}

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Concepto *</label>
          <Input
            placeholder="ej. Préstamo Coche, Tarjeta Revolving BBVA, Hipoteca"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Entidad o Acreedor (Opcional)</label>
          <Input
            placeholder="ej. Banco Santander, Cofidis, Familiar"
            value={creditor}
            onChange={(e) => setCreditor(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              {editingDebt ? 'Saldo Vivo (€) *' : 'Importe Inicial (€) *'}
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              disabled={isLoading || Boolean(editingDebt)} // En edición el saldo se reduce amortizando
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Tasa de Interés (%) *</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="6.50"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Tipo de Tasa</label>
            <select
              className={styles.select}
              value={rateType}
              onChange={(e) => setRateType(e.target.value as InterestRateType)}
              disabled={isLoading}
            >
              <option value="ANNUAL">Anual (TAE / TIN anual)</option>
              <option value="MONTHLY">Mensual (Tarjetas revolving / mensual)</option>
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Cuota Mensual Mínima (€)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Opcional (ej. 150.00)"
              value={quotaInput}
              onChange={(e) => setQuotaInput(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Fecha Límite / Vencimiento (Opcional)</label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Observaciones o Condiciones (Opcional)</label>
          <Input
            placeholder="ej. TAE 6.5%, revisión en 2027..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className={styles.actions}>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {editingDebt ? 'Guardar Cambios' : 'Registrar Deuda'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
