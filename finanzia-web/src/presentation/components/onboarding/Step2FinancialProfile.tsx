'use client';

import React from 'react';
import {
  SALARY_RANGES,
  EMERGENCY_FUND_RANGES,
  EXPERIENCE_LEVELS,
} from '@/core/domain/constants/onboarding-options';
import { FinancialExperienceLevel } from '@/core/domain/profile/profile.types';
import { Button } from '@/presentation/components/ui/Button';
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import styles from './OnboardingWizard.module.css';

interface Step2FinancialProfileProps {
  profession: string;
  annualGrossIncome: string;
  hasRealEstateIncome: boolean | null;
  hasStockInvestments: boolean | null;
  hasCryptoInvestments: boolean | null;
  emergencyFundRange: string;
  experienceLevel: FinancialExperienceLevel;
  preferredCurrency: string;
  onChangeProfession: (val: string) => void;
  onChangeAnnualGrossIncome: (val: string) => void;
  onChangeHasRealEstateIncome: (val: boolean) => void;
  onChangeHasStockInvestments: (val: boolean) => void;
  onChangeHasCryptoInvestments: (val: boolean) => void;
  onChangeEmergencyFundRange: (val: string) => void;
  onChangeExperienceLevel: (val: FinancialExperienceLevel) => void;
  onChangePreferredCurrency: (val: string) => void;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}

export const Step2FinancialProfile: React.FC<Step2FinancialProfileProps> = ({
  profession,
  annualGrossIncome,
  hasRealEstateIncome,
  hasStockInvestments,
  hasCryptoInvestments,
  emergencyFundRange,
  experienceLevel,
  preferredCurrency,
  onChangeProfession,
  onChangeAnnualGrossIncome,
  onChangeHasRealEstateIncome,
  onChangeHasStockInvestments,
  onChangeHasCryptoInvestments,
  onChangeEmergencyFundRange,
  onChangeExperienceLevel,
  onChangePreferredCurrency,
  onBack,
  onNext,
  onSkip,
}) => {
  return (
    <div>
      <div className={styles.header}>
        <div className={styles.brandBadge}>
          <ShieldCheck size={14} /> Contexto Confidencial
        </div>
        <h1 className={styles.title}>Tu Perfil Económico y Patrimonial</h1>
        <p className={styles.subtitle}>
          Estas preguntas son <strong>100% opcionales</strong>. Nos permiten contextualizar tus métricas y calibrar las respuestas de tu Asistente IA.
        </p>
      </div>

      <div className={styles.formSection}>
        {/* Profesión u Oficio */}
        <div className={styles.formGroup}>
          <label htmlFor="professionInput" className={styles.label}>
            <span>¿A qué te dedicas? (Profesión u oficio)</span>
            <span className={styles.optionalTag}>Opcional</span>
          </label>
          <input
            id="professionInput"
            type="text"
            className={styles.textInput}
            placeholder="Ej. Diseñador UX, Abogado, Autónomo, Ingeniero..."
            value={profession}
            onChange={(e) => onChangeProfession(e.target.value)}
          />
        </div>

        {/* Salario Bruto Anual */}
        <div className={styles.formGroup}>
          <label htmlFor="salarySelect" className={styles.label}>
            <span>Salario o ingresos brutos anuales estimados</span>
            <span className={styles.optionalTag}>Opcional</span>
          </label>
          <select
            id="salarySelect"
            className={styles.selectInput}
            value={annualGrossIncome}
            onChange={(e) => onChangeAnnualGrossIncome(e.target.value)}
          >
            <option value="">Selecciona un rango orientativo...</option>
            {SALARY_RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Radio: Activos Inmobiliarios / Rentas */}
        <div className={styles.radioRowGroup}>
          <div className={styles.radioRowLabel}>
            ¿Tienes propiedades o bienes inmuebles que te generen ingresos (alquileres, rentas)?
          </div>
          <div className={styles.radioPillGroup}>
            <button
              type="button"
              className={`${styles.radioPill} ${
                hasRealEstateIncome === true ? styles.radioPillSelectedYes : ''
              }`}
              onClick={() => onChangeHasRealEstateIncome(true)}
            >
              Sí
            </button>
            <button
              type="button"
              className={`${styles.radioPill} ${
                hasRealEstateIncome === false ? styles.radioPillSelectedNo : ''
              }`}
              onClick={() => onChangeHasRealEstateIncome(false)}
            >
              No
            </button>
          </div>
        </div>

        {/* Radio: Inversiones en Bolsa */}
        <div className={styles.radioRowGroup}>
          <div className={styles.radioRowLabel}>
            ¿Posees inversiones en bolsa de valores (acciones, fondos indexados o ETFs)?
          </div>
          <div className={styles.radioPillGroup}>
            <button
              type="button"
              className={`${styles.radioPill} ${
                hasStockInvestments === true ? styles.radioPillSelectedYes : ''
              }`}
              onClick={() => onChangeHasStockInvestments(true)}
            >
              Sí
            </button>
            <button
              type="button"
              className={`${styles.radioPill} ${
                hasStockInvestments === false ? styles.radioPillSelectedNo : ''
              }`}
              onClick={() => onChangeHasStockInvestments(false)}
            >
              No
            </button>
          </div>
        </div>

        {/* Radio: Inversiones en Criptomonedas / Activos Digitales */}
        <div className={styles.radioRowGroup}>
          <div className={styles.radioRowLabel}>
            ¿Posees inversiones en activos digitales o criptomonedas (Bitcoin, Ethereum, etc.)?
          </div>
          <div className={styles.radioPillGroup}>
            <button
              type="button"
              className={`${styles.radioPill} ${
                hasCryptoInvestments === true ? styles.radioPillSelectedYes : ''
              }`}
              onClick={() => onChangeHasCryptoInvestments(true)}
            >
              Sí
            </button>
            <button
              type="button"
              className={`${styles.radioPill} ${
                hasCryptoInvestments === false ? styles.radioPillSelectedNo : ''
              }`}
              onClick={() => onChangeHasCryptoInvestments(false)}
            >
              No
            </button>
          </div>
        </div>

        {/* Campos adicionales de alto valor */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div className={styles.formGroup}>
            <label htmlFor="currencySelect" className={styles.label}>
              <span>Divisa base principal</span>
              <span className={styles.optionalTag}>Recomendado</span>
            </label>
            <select
              id="currencySelect"
              className={styles.selectInput}
              value={preferredCurrency}
              onChange={(e) => onChangePreferredCurrency(e.target.value)}
            >
              <option value="EUR">EUR (€) - Euro</option>
              <option value="USD">USD ($) - Dólar estadounidense</option>
              <option value="GBP">GBP (£) - Libra esterlina</option>
              <option value="MXN">MXN ($) - Peso mexicano</option>
              <option value="COP">COP ($) - Peso colombiano</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="emergencySelect" className={styles.label}>
              <span>Fondo de emergencia actual</span>
              <span className={styles.optionalTag}>Opcional</span>
            </label>
            <select
              id="emergencySelect"
              className={styles.selectInput}
              value={emergencyFundRange}
              onChange={(e) => onChangeEmergencyFundRange(e.target.value)}
            >
              <option value="">Selecciona tu situación actual...</option>
              {EMERGENCY_FUND_RANGES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Nivel de Familiaridad Financiera */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            <span>Nivel de familiaridad financiera (para modular el tono del Agente IA)</span>
            <span className={styles.optionalTag}>Opcional</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {EXPERIENCE_LEVELS.map((lvl) => {
              const isSelected = experienceLevel === lvl.value;
              return (
                <div
                  key={lvl.value}
                  tabIndex={0}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onChangeExperienceLevel(lvl.value as FinancialExperienceLevel)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      onChangeExperienceLevel(lvl.value as FinancialExperienceLevel);
                    }
                  }}
                  className={`${styles.goalCard} ${isSelected ? styles.goalCardSelected : ''}`}
                  style={{ padding: '0.85rem' }}
                >
                  <div className={styles.goalTitle}>{lvl.title}</div>
                  <div className={styles.goalDesc}>{lvl.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.actionsBar}>
        <Button variant="ghost" onClick={onBack} icon={<ArrowLeft size={18} />}>
          Atrás
        </Button>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={onSkip}>
            Omitir este paso
          </Button>
          <Button variant="primary" onClick={onNext} icon={<ArrowRight size={18} />}>
            Siguiente: Privacidad y Límites
          </Button>
        </div>
      </div>
    </div>
  );
};
