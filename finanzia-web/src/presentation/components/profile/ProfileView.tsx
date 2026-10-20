'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/presentation/context/auth.context';
import { useProfile, FinancialExperienceLevel } from '@/presentation/hooks/useProfile';
import {
  SALARY_RANGES,
  EMERGENCY_FUND_RANGES,
  EXPERIENCE_LEVELS,
} from '@/core/domain/constants/onboarding-options';
import { Button } from '@/presentation/components/ui/Button';
import {
  User,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import styles from './ProfileModule.module.css';
import wizardStyles from '../onboarding/OnboardingWizard.module.css';

export function ProfileView() {
  const { user } = useAuth();
  const { getFullProfile, updateFinancialProfile } = useProfile();

  const [activeTab, setActiveTab] = useState<'info' | 'financial'>('info');
  const [isLoading, setIsLoading] = useState(true);

  // Estados de edición de Tab: Económico
  const [profession, setProfession] = useState<string>('');
  const [annualGrossIncome, setAnnualGrossIncome] = useState<string>('');
  const [hasRealEstateIncome, setHasRealEstateIncome] = useState<boolean | null>(null);
  const [hasStockInvestments, setHasStockInvestments] = useState<boolean | null>(null);
  const [hasCryptoInvestments, setHasCryptoInvestments] = useState<boolean | null>(null);
  const [emergencyFundRange, setEmergencyFundRange] = useState<string>('');
  const [experienceLevel, setExperienceLevel] = useState<FinancialExperienceLevel>('INTERMEDIATE');

  // Feedback states
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getFullProfile();

      if (data.financialProfile) {
        setProfession(data.financialProfile.profession || '');
        setAnnualGrossIncome(data.financialProfile.annualGrossIncome || '');
        setHasRealEstateIncome(data.financialProfile.hasRealEstateIncome);
        setHasStockInvestments(data.financialProfile.hasStockInvestments);
        setHasCryptoInvestments(data.financialProfile.hasCryptoInvestments);
        setEmergencyFundRange(data.financialProfile.emergencyFundRange || '');
        setExperienceLevel(data.financialProfile.experienceLevel || 'INTERMEDIATE');
      }
    } catch (err: any) {
      console.error('Error al cargar perfil:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getFullProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSaveFinancial = async () => {
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await updateFinancialProfile({
        profession: profession.trim() || null,
        annualGrossIncome: annualGrossIncome || null,
        hasRealEstateIncome,
        hasStockInvestments,
        hasCryptoInvestments,
        emergencyFundRange: emergencyFundRange || null,
        experienceLevel,
      });
      setSuccessMessage('Perfil económico y patrimonial actualizado correctamente.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al actualizar el perfil económico.');
    } finally {
      setIsSaving(false);
    }
  };

  const initial = user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'M';
  const fullName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : 'Usuario FinanZIA';

  if (isLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
        <p>Cargando información del perfil...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header Card */}
      <div className={styles.profileHeaderCard}>
        <div className={styles.ambientGlow} />
        <div className={styles.userInfoGroup}>
          <div className={styles.avatarLarge}>{initial}</div>
          <div>
            <h1 className={styles.userName}>
              {fullName}
              <span className={styles.badgeVerified}>
                <CheckCircle2 size={13} /> Correo Verificado
              </span>
            </h1>
            <p className={styles.userEmail}>{user?.email}</p>
            <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              Miembro de FinanZIA · Plan Soberano Local
            </div>
          </div>
        </div>
      </div>

      {/* Alertas de Notificación */}
      {successMessage && (
        <div className={styles.toastSuccess}>
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className={styles.toastError}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'info' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <User size={18} /> Datos de Cuenta
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'financial' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('financial')}
        >
          <Briefcase size={18} /> Perfil Económico y Activos
        </button>
      </div>

      {/* TAB 1: DATOS DE CUENTA */}
      {activeTab === 'info' && (
        <div className={styles.cardSection}>
          <h2 className={styles.sectionTitle}>Información de la Cuenta</h2>
          <p className={styles.sectionSubtitle}>
            Tus datos de acceso y verificación básica registrados en el sistema.
          </p>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nombre de pila</label>
              <input
                type="text"
                className={`${styles.inputField} ${styles.inputFieldReadOnly}`}
                value={user?.firstName || ''}
                disabled
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Apellidos</label>
              <input
                type="text"
                className={`${styles.inputField} ${styles.inputFieldReadOnly}`}
                value={user?.lastName || 'No especificado'}
                disabled
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Correo Electrónico (Principal)</label>
              <input
                type="text"
                className={`${styles.inputField} ${styles.inputFieldReadOnly}`}
                value={user?.email || ''}
                disabled
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Divisa Predeterminada</label>
              <input
                type="text"
                className={`${styles.inputField} ${styles.inputFieldReadOnly}`}
                value={user?.defaultCurrency || 'EUR'}
                disabled
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PERFIL ECONÓMICO Y ACTIVOS */}
      {activeTab === 'financial' && (
        <div className={styles.cardSection}>
          <h2 className={styles.sectionTitle}>Perfil Económico y Patrimonio</h2>
          <p className={styles.sectionSubtitle}>
            Actualiza tu contexto patrimonial para que las proyecciones y análisis se ajusten con precisión a tu realidad financiera.
          </p>

          <div className={wizardStyles.formSection}>
            <div className={wizardStyles.formGroup}>
              <label className={wizardStyles.label}>Profesión u Oficio</label>
              <input
                type="text"
                className={wizardStyles.textInput}
                placeholder="Ej. Desarrollador, Médico, Emprendedor..."
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
              />
            </div>

            <div className={wizardStyles.formGroup}>
              <label className={wizardStyles.label}>Rango de Salario o Ingresos Brutos Anuales</label>
              <select
                className={wizardStyles.selectInput}
                value={annualGrossIncome}
                onChange={(e) => setAnnualGrossIncome(e.target.value)}
              >
                <option value="">No especificado</option>
                {SALARY_RANGES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Inmuebles */}
            <div className={wizardStyles.radioRowGroup}>
              <div className={wizardStyles.radioRowLabel}>
                ¿Tienes propiedades inmobiliarias que te generen rentas o ingresos pasivos?
              </div>
              <div className={wizardStyles.radioPillGroup}>
                <button
                  type="button"
                  className={`${wizardStyles.radioPill} ${hasRealEstateIncome === true ? wizardStyles.radioPillSelectedYes : ''
                    }`}
                  onClick={() => setHasRealEstateIncome(true)}
                >
                  Sí
                </button>
                <button
                  type="button"
                  className={`${wizardStyles.radioPill} ${hasRealEstateIncome === false ? wizardStyles.radioPillSelectedNo : ''
                    }`}
                  onClick={() => setHasRealEstateIncome(false)}
                >
                  No
                </button>
              </div>
            </div>

            {/* Inversiones Bolsa */}
            <div className={wizardStyles.radioRowGroup}>
              <div className={wizardStyles.radioRowLabel}>
                ¿Inviertes en bolsa de valores (fondos indexados, ETFs o acciones)?
              </div>
              <div className={wizardStyles.radioPillGroup}>
                <button
                  type="button"
                  className={`${wizardStyles.radioPill} ${hasStockInvestments === true ? wizardStyles.radioPillSelectedYes : ''
                    }`}
                  onClick={() => setHasStockInvestments(true)}
                >
                  Sí
                </button>
                <button
                  type="button"
                  className={`${wizardStyles.radioPill} ${hasStockInvestments === false ? wizardStyles.radioPillSelectedNo : ''
                    }`}
                  onClick={() => setHasStockInvestments(false)}
                >
                  No
                </button>
              </div>
            </div>

            {/* Inversiones Cripto */}
            <div className={wizardStyles.radioRowGroup}>
              <div className={wizardStyles.radioRowLabel}>
                ¿Inviertes en activos digitales o criptomonedas?
              </div>
              <div className={wizardStyles.radioPillGroup}>
                <button
                  type="button"
                  className={`${wizardStyles.radioPill} ${hasCryptoInvestments === true ? wizardStyles.radioPillSelectedYes : ''
                    }`}
                  onClick={() => setHasCryptoInvestments(true)}
                >
                  Sí
                </button>
                <button
                  type="button"
                  className={`${wizardStyles.radioPill} ${hasCryptoInvestments === false ? wizardStyles.radioPillSelectedNo : ''
                    }`}
                  onClick={() => setHasCryptoInvestments(false)}
                >
                  No
                </button>
              </div>
            </div>

            {/* Fondo de emergencia y experiencia */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div className={wizardStyles.formGroup}>
                <label className={wizardStyles.label}>Fondo de emergencia</label>
                <select
                  className={wizardStyles.selectInput}
                  value={emergencyFundRange}
                  onChange={(e) => setEmergencyFundRange(e.target.value)}
                >
                  <option value="">No especificado</option>
                  {EMERGENCY_FUND_RANGES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={wizardStyles.formGroup}>
                <label className={wizardStyles.label}>Nivel de Conocimiento Financiero</label>
                <select
                  className={wizardStyles.selectInput}
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value as FinancialExperienceLevel)}
                >
                  {EXPERIENCE_LEVELS.map((lvl) => (
                    <option key={lvl.value} value={lvl.value}>
                      {lvl.title} - {lvl.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="primary"
              onClick={handleSaveFinancial}
              isLoading={isSaving}
              icon={<CheckCircle2 size={18} />}
            >
              Actualizar Perfil Económico
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
