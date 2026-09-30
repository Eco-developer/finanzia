'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/presentation/components/ui/Modal';
import { Input } from '@/presentation/components/ui/Input';
import { Button } from '@/presentation/components/ui/Button';
import { MoneyDisplay } from './MoneyDisplay';
import { useDebts, type DebtItem } from '@/presentation/hooks/useDebts';
import { useAccounts, type AccountItem } from '@/presentation/hooks/useAccounts';
import {
  Sparkles,
  Lock,
  ArrowRight,
  TrendingDown,
  CheckCircle,
} from 'lucide-react';
import styles from './AmortizeDebtModal.module.css';

interface AmortizeDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  debt: DebtItem | null;
}

export function AmortizeDebtModal({
  isOpen,
  onClose,
  onSuccess,
  debt,
}: AmortizeDebtModalProps) {
  const { amortizeDebt } = useDebts();
  const { getAccounts } = useAccounts();
  const [amountInput, setAmountInput] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && debt) {
      setAmountInput('');
      setSelectedAccountId('');
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setNotes('');
      setError(null);

      // Cargar cuentas para permitir debitar
      getAccounts()
        .then((accs) => {
          setAccounts(accs.filter((a) => !a.isArchived));
          if (accs.length > 0) {
            setSelectedAccountId(accs[0].id);
          }
        })
        .catch((err) => {
          console.error('Error al cargar cuentas bancarias:', err);
        });
    }
  }, [isOpen, debt, getAccounts]);

  if (!debt) return null;

  const remainingCents = Number(debt.remainingAmountCents);
  const remainingEur = (remainingCents / 100).toFixed(2);
  const rateBps = debt.interestRateBasisPts;
  const isMonthly = debt.interestRateType === 'MONTHLY';

  const amountEur = parseFloat(amountInput.replace(',', '.'));
  const amountCents = !isNaN(amountEur) && amountEur > 0 ? Math.round(amountEur * 100) : 0;

  // Cálculo determinista en céntimos enteros
  const estimatedMonthlyInterestCents = isMonthly
    ? Math.round((remainingCents * rateBps) / 10000)
    : Math.round((remainingCents * rateBps) / 120000);

  const interestPortionCents = Math.min(amountCents, estimatedMonthlyInterestCents);
  const principalPortionCents = Math.max(0, amountCents - interestPortionCents);
  const newRemainingCents = Math.max(0, remainingCents - principalPortionCents);
  const willBeFullyPaid = amountCents > 0 && newRemainingCents === 0;

  const handleQuickSelect = (eur: number) => {
    setAmountInput(eur.toString());
  };

  const handleSelectFull = () => {
    setAmountInput(remainingEur);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amountCents <= 0) {
      setError('Por favor introduce un importe a amortizar válido mayor que cero.');
      return;
    }

    setIsLoading(true);
    try {
      await amortizeDebt(debt.id, {
        amountCents,
        accountId: selectedAccountId || undefined,
        paymentDate: paymentDate || undefined,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al procesar la amortización.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Amortizar Deuda o Préstamo"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <div className={styles.errorBanner}>{error}</div>}

        {/* Resumen del pasivo */}
        <div className={styles.debtSummaryBox}>
          <div>
            <div className={styles.debtConcept}>{debt.concept}</div>
            <div className={styles.debtRate}>
              Tasa: {(rateBps / 100).toFixed(2)}% {isMonthly ? 'mensual' : 'TAE'}
              {debt.creditor ? ` • ${debt.creditor}` : ''}
            </div>
          </div>
          <div className={styles.debtBalanceBox}>
            <div className={styles.debtBalanceLabel}>Saldo Pendiente</div>
            <div className={styles.debtBalanceValue}>
              <MoneyDisplay cents={remainingCents} colorCoded={false} size="lg" />
            </div>
          </div>
        </div>

        {/* Input de importe */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Importe a Amortizar (€) *</label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            disabled={isLoading}
            required
            autoFocus
          />

          {/* Pastillas rápidas */}
          <div className={styles.quickPillRow}>
            {remainingCents > 5000 && (
              <button
                type="button"
                className={styles.quickPill}
                onClick={() => handleQuickSelect(50)}
              >
                +50 €
              </button>
            )}
            {remainingCents > 10000 && (
              <button
                type="button"
                className={styles.quickPill}
                onClick={() => handleQuickSelect(100)}
              >
                +100 €
              </button>
            )}
            {remainingCents > 25000 && (
              <button
                type="button"
                className={styles.quickPill}
                onClick={() => handleQuickSelect(250)}
              >
                +250 €
              </button>
            )}
            <button
              type="button"
              className={`${styles.quickPill} ${styles.quickPillFull}`}
              onClick={handleSelectFull}
            >
              Liquidar Totalidad ({remainingEur} €)
            </button>
          </div>
        </div>

        {/* Cuenta bancaria de cargo */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Cuenta de Cargo (Opcional)</label>
          <select
            className={styles.select}
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            disabled={isLoading}
          >
            <option value="">-- No vincular a cuenta local --</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} (Saldo: {(acc.currentBalanceCents / 100).toFixed(2)} €)
              </option>
            ))}
          </select>
        </div>

        {/* Previsualización del Desglose Determinista */}
        {amountCents > 0 && (
          <div className={styles.previewCard}>
            <div className={styles.previewTitle}>
              <Sparkles size={14} />
              <span>Desglose Estimado de Amortización</span>
            </div>
            <div className={styles.previewGrid}>
              <div className={styles.previewCol}>
                <span className={styles.previewColLabel}>A Capital</span>
                <span className={styles.previewColValue}>
                  {(principalPortionCents / 100).toFixed(2)} €
                </span>
              </div>
              <div className={styles.previewCol}>
                <span className={styles.previewColLabel}>A Intereses</span>
                <span className={styles.previewColValue}>
                  {(interestPortionCents / 100).toFixed(2)} €
                </span>
              </div>
              <div className={styles.previewCol}>
                <span className={styles.previewColLabel}>Nuevo Saldo</span>
                <span
                  className={styles.previewColValue}
                  style={{ color: willBeFullyPaid ? '#10b981' : '#f87171' }}
                >
                  {(newRemainingCents / 100).toFixed(2)} €
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Alerta de Liquidación al 100% / Inmutabilidad */}
        {willBeFullyPaid && (
          <div className={styles.payOffAlert}>
            <Lock size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>¡Liquidación Total al 100%!</strong>
              <div style={{ marginTop: '0.2rem' }}>
                Este pago dejará el saldo pendiente a 0,00 €. La deuda pasará a
                estado <em>100% Pagada</em> y se sellará de forma inmutable en tu
                historial financiero protegido.
              </div>
            </div>
          </div>
        )}

        {/* Fecha y Notas */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Fecha del Pago</label>
          <Input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Notas o Justificante (Opcional)</label>
          <Input
            placeholder="ej. Amortización anticipada con nómina extra..."
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
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading || amountCents <= 0}
          >
            {willBeFullyPaid ? <CheckCircle size={16} /> : <TrendingDown size={16} />}
            <span>
              {isLoading
                ? 'Procesando...'
                : willBeFullyPaid
                  ? 'Liquidar Deuda al 100%'
                  : 'Confirmar Amortización'}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
