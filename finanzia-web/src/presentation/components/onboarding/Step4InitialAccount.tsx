'use client';

import React, { useState } from 'react';
import { Button } from '@/presentation/components/ui/Button';
import {
  Wallet,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import styles from './OnboardingWizard.module.css';

interface Step4InitialAccountProps {
  accountName: string;
  accountType: 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT';
  initialBalanceEur: string;
  currency: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  onChangeAccountName: (val: string) => void;
  onChangeAccountType: (
    val: 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT',
  ) => void;
  onChangeInitialBalanceEur: (val: string) => void;
  onChangeCurrency: (val: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}

const QUICK_SUGGESTIONS = [
  { name: 'Cuenta Corriente', type: 'CHECKING' },
  { name: 'Efectivo en mano', type: 'CASH' },
  { name: 'Cuenta de Ahorros', type: 'SAVINGS' },
  { name: 'Billetera Personal', type: 'CASH' },
];

export const Step4InitialAccount: React.FC<Step4InitialAccountProps> = ({
  accountName,
  accountType,
  initialBalanceEur,
  currency,
  isSubmitting,
  errorMessage,
  onChangeAccountName,
  onChangeAccountType,
  onChangeInitialBalanceEur,
  onChangeCurrency,
  onBack,
  onSubmit,
}) => {
  const [touched, setTouched] = useState(false);

  const isValidName = accountName.trim().length >= 2;
  const numBalance = parseFloat(initialBalanceEur.replace(',', '.'));
  const isValidBalance = !isNaN(numBalance) && numBalance >= 0;

  const canSubmit = isValidName && isValidBalance && !isSubmitting;

  const handleQuickSelect = (suggestion: { name: string; type: string }) => {
    onChangeAccountName(suggestion.name);
    onChangeAccountType(
      suggestion.type as
        | 'CHECKING'
        | 'SAVINGS'
        | 'CREDIT_CARD'
        | 'CASH'
        | 'INVESTMENT',
    );
  };

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.brandBadge}>
          <Wallet size={14} /> Tu Primera Cuenta Financiera
        </div>
        <h1 className={styles.title}>Crea tu primera cuenta manual</h1>
        <p className={styles.subtitle}>
          Para comenzar con datos reales desde el día cero, registra tu fondo o cuenta inicial. Recuerda: es puramente manual y <strong>no se conecta a bancos</strong>.
        </p>
      </div>

      {errorMessage && (
        <div className={styles.errorBanner}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Sugerencias Rápidas */}
      <div style={{ marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '0.8125rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>
          Sugerencias rápidas de apertura:
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {QUICK_SUGGESTIONS.map((s) => (
            <button
              key={s.name}
              type="button"
              className={styles.radioPill}
              onClick={() => handleQuickSelect(s)}
            >
              + {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.formSection}>
        {/* Nombre de la Cuenta */}
        <div className={styles.formGroup}>
          <label htmlFor="accountNameInput" className={styles.label}>
            <span>Nombre descriptivo de la cuenta *</span>
          </label>
          <input
            id="accountNameInput"
            type="text"
            className={styles.textInput}
            placeholder="Ej. Cuenta Nómina BBVA, Efectivo Billetera, Ahorros Santander..."
            value={accountName}
            onChange={(e) => {
              setTouched(true);
              onChangeAccountName(e.target.value);
            }}
          />
          {touched && !isValidName && (
            <span style={{ fontSize: '0.75rem', color: '#f87171' }}>
              El nombre debe tener al menos 2 caracteres.
            </span>
          )}
        </div>

        {/* Tipo de Cuenta y Divisa */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div className={styles.formGroup}>
            <label htmlFor="accountTypeSelect" className={styles.label}>
              <span>Tipo de cuenta *</span>
            </label>
            <select
              id="accountTypeSelect"
              className={styles.selectInput}
              value={accountType}
              onChange={(e) =>
                onChangeAccountType(
                  e.target.value as
                    | 'CHECKING'
                    | 'SAVINGS'
                    | 'CREDIT_CARD'
                    | 'CASH'
                    | 'INVESTMENT',
                )
              }
            >
              <option value="CHECKING">Cuenta Corriente / Nómina</option>
              <option value="SAVINGS">Cuenta de Ahorros</option>
              <option value="CASH">Efectivo / Metálico</option>
              <option value="INVESTMENT">Cuenta de Inversión</option>
              <option value="CREDIT_CARD">Tarjeta de Crédito</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="accountCurrencySelect" className={styles.label}>
              <span>Divisa de la cuenta</span>
            </label>
            <select
              id="accountCurrencySelect"
              className={styles.selectInput}
              value={currency}
              onChange={(e) => onChangeCurrency(e.target.value)}
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="MXN">MXN ($)</option>
              <option value="COP">COP ($)</option>
            </select>
          </div>
        </div>

        {/* Saldo Inicial */}
        <div className={styles.formGroup}>
          <label htmlFor="balanceInput" className={styles.label}>
            <span>Saldo inicial disponible ({currency}) *</span>
            <span className={styles.optionalTag}>Puedes comenzar con 0</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="balanceInput"
              type="text"
              className={styles.textInput}
              placeholder="0,00"
              value={initialBalanceEur}
              onChange={(e) => {
                // Permitir solo números y coma o punto
                const val = e.target.value.replace(/[^0-9.,]/g, '');
                onChangeInitialBalanceEur(val);
              }}
              style={{ fontSize: '1.125rem', fontWeight: 600, paddingLeft: '2.5rem' }}
            />
            <span
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#818cf8',
                fontWeight: 700,
              }}
            >
              {currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.actionsBar}>
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={isSubmitting}
          icon={<ArrowLeft size={18} />}
        >
          Atrás
        </Button>
        <Button
          variant="ai"
          onClick={onSubmit}
          disabled={!canSubmit}
          isLoading={isSubmitting}
          icon={<Sparkles size={18} />}
        >
          Finalizar y entrar a mi Dashboard
        </Button>
      </div>
    </div>
  );
};
