'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/presentation/context/auth.context';
import { useProfile, FullProfileResponse, FinancialExperienceLevel } from '@/presentation/hooks/useProfile';
import {
  ONBOARDING_GOALS,
  SALARY_RANGES,
  EMERGENCY_FUND_RANGES,
  EXPERIENCE_LEVELS,
} from '@/core/domain/constants/onboarding-options';
import { Button } from '@/presentation/components/ui/Button';
import {
  User,
  Target,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
  ArrowRight,
  Receipt,
  LayoutDashboard,
  PieChart,
  TrendingDown,
  Compass,
  Bot,
  Zap,
  GraduationCap,
  PlusCircle,
  Check,
} from 'lucide-react';
import styles from './ProfileModule.module.css';
import wizardStyles from '../onboarding/OnboardingWizard.module.css';

const ICON_MAP: Record<string, React.ReactNode> = {
  Receipt: <Receipt size={18} />,
  LayoutDashboard: <LayoutDashboard size={18} />,
  PieChart: <PieChart size={18} />,
  Target: <Target size={18} />,
  TrendingDown: <TrendingDown size={18} />,
  Compass: <Compass size={18} />,
  Sparkles: <Sparkles size={18} />,
  Bot: <Bot size={18} />,
  Zap: <Zap size={18} />,
  GraduationCap: <GraduationCap size={18} />,
  PlusCircle: <PlusCircle size={18} />,
};

export function ProfileView() {
  const { user } = useAuth();
  const { getFullProfile, updateProfile, updateFinancialProfile } = useProfile();

  const [activeTab, setActiveTab] = useState<'info' | 'goals' | 'financial' | 'privacy'>('info');
  const [profileData, setProfileData] = useState<FullProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de edición de Tab 2: Metas
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState<string>('');
  const [preferredCurrency, setPreferredCurrency] = useState<string>('EUR');

  // Estados de edición de Tab 3: Económico
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
      setProfileData(data);

      if (data.profile) {
        setSelectedGoals(data.profile.usageGoals || []);
        setCustomGoal(data.profile.customGoal || '');
        setPreferredCurrency(data.profile.preferredCurrency || 'EUR');
      }

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

  const handleToggleGoal = (id: string) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  };

  const handleSaveGoals = async () => {
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await updateProfile({
        usageGoals: selectedGoals,
        customGoal: selectedGoals.includes('other') ? customGoal : undefined,
        preferredCurrency,
      });
      setSuccessMessage('Objetivos y preferencias de IA actualizados correctamente.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al guardar las metas de perfil.');
    } finally {
      setIsSaving(false);
    }
  };

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

        <Link href="/accounts">
          <Button variant="secondary" icon={<ArrowRight size={16} />}>
            Gestionar mis Cuentas
          </Button>
        </Link>
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
          className={`${styles.tabBtn} ${activeTab === 'goals' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('goals')}
        >
          <Target size={18} /> Objetivos y Asistente IA
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'financial' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('financial')}
        >
          <Briefcase size={18} /> Perfil Económico y Activos
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'privacy' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('privacy')}
        >
          <ShieldCheck size={18} /> Privacidad y Límites
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

      {/* TAB 2: OBJETIVOS Y ASISTENTE IA */}
      {activeTab === 'goals' && (
        <div className={styles.cardSection}>
          <h2 className={styles.sectionTitle}>Objetivos Financieros y Preferencias de IA</h2>
          <p className={styles.sectionSubtitle}>
            Modifica para qué utilizas Finanzia. Tu Asistente IA adaptará su contexto y sugerencias según las opciones que tengas activas.
          </p>

          <div className={wizardStyles.goalsGrid}>
            {ONBOARDING_GOALS.map((goal) => {
              const isSelected = selectedGoals.includes(goal.id);
              const icon = ICON_MAP[goal.iconName] || <Target size={18} />;

              return (
                <div
                  key={goal.id}
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => handleToggleGoal(goal.id)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      handleToggleGoal(goal.id);
                    }
                  }}
                  className={`${wizardStyles.goalCard} ${
                    isSelected ? wizardStyles.goalCardSelected : ''
                  } ${goal.isAi ? wizardStyles.goalCardAi : ''}`}
                >
                  <div className={wizardStyles.goalIconWrapper}>
                    <div
                      className={`${wizardStyles.goalIcon} ${
                        goal.isAi ? wizardStyles.goalIconAi : ''
                      }`}
                    >
                      {icon}
                    </div>
                    {goal.isAi && <span className={wizardStyles.aiBadge}>Copilot IA</span>}
                    {isSelected && (
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: '#6366f1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                        }}
                      >
                        <Check size={11} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div className={wizardStyles.goalTitle}>{goal.title}</div>
                  <div className={wizardStyles.goalDesc}>{goal.description}</div>
                </div>
              );
            })}
          </div>

          {selectedGoals.includes('other') && (
            <div className={wizardStyles.otherInputContainer}>
              <label htmlFor="editCustomGoal" className={wizardStyles.label}>
                <span>Detalle de tu motivo personalizado:</span>
                <span className={wizardStyles.optionalTag}>Máximo 250 caracteres</span>
              </label>
              <textarea
                id="editCustomGoal"
                className={wizardStyles.textarea}
                value={customGoal}
                maxLength={250}
                onChange={(e) => setCustomGoal(e.target.value)}
              />
              <span className={wizardStyles.charCount}>{customGoal.length} / 250</span>
            </div>
          )}

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="primary"
              onClick={handleSaveGoals}
              isLoading={isSaving}
              icon={<CheckCircle2 size={18} />}
            >
              Guardar Preferencias de Metas e IA
            </Button>
          </div>
        </div>
      )}

      {/* TAB 3: PERFIL ECONÓMICO Y ACTIVOS */}
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
                  className={`${wizardStyles.radioPill} ${
                    hasRealEstateIncome === true ? wizardStyles.radioPillSelectedYes : ''
                  }`}
                  onClick={() => setHasRealEstateIncome(true)}
                >
                  Sí
                </button>
                <button
                  type="button"
                  className={`${wizardStyles.radioPill} ${
                    hasRealEstateIncome === false ? wizardStyles.radioPillSelectedNo : ''
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
                  className={`${wizardStyles.radioPill} ${
                    hasStockInvestments === true ? wizardStyles.radioPillSelectedYes : ''
                  }`}
                  onClick={() => setHasStockInvestments(true)}
                >
                  Sí
                </button>
                <button
                  type="button"
                  className={`${wizardStyles.radioPill} ${
                    hasStockInvestments === false ? wizardStyles.radioPillSelectedNo : ''
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
                  className={`${wizardStyles.radioPill} ${
                    hasCryptoInvestments === true ? wizardStyles.radioPillSelectedYes : ''
                  }`}
                  onClick={() => setHasCryptoInvestments(true)}
                >
                  Sí
                </button>
                <button
                  type="button"
                  className={`${wizardStyles.radioPill} ${
                    hasCryptoInvestments === false ? wizardStyles.radioPillSelectedNo : ''
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

      {/* TAB 4: PRIVACIDAD Y DISCLAIMERS */}
      {activeTab === 'privacy' && (
        <div className={styles.cardSection}>
          <h2 className={styles.sectionTitle}>Garantías de Privacidad y Marco Legal</h2>
          <p className={styles.sectionSubtitle}>
            Los 4 pilares bajo los que opera Finanzia en tu entorno local.
          </p>

          <div className={wizardStyles.disclaimersGrid}>
            <div className={wizardStyles.disclaimerCard}>
              <div className={wizardStyles.disclaimerIcon}>
                <Lock size={20} />
              </div>
              <div>
                <div className={wizardStyles.disclaimerTitle}>
                  1. Cero datos bancarios ni contraseñas
                </div>
                <p className={wizardStyles.disclaimerText}>
                  Finanzia nunca almacena ni solicita credenciales de banca electrónica, CVVs ni códigos de autenticación.
                </p>
              </div>
            </div>

            <div className={wizardStyles.disclaimerCard}>
              <div className={wizardStyles.disclaimerIcon}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className={wizardStyles.disclaimerTitle}>
                  2. Cero publicidad (Zero Ads)
                </div>
                <p className={wizardStyles.disclaimerText}>
                  Tus hábitos de gasto no se monetizan ni se comparten con empresas externas de publicidad.
                </p>
              </div>
            </div>

            <div className={wizardStyles.disclaimerCard}>
              <div className={wizardStyles.disclaimerIcon}>
                <Lock size={20} />
              </div>
              <div>
                <div className={wizardStyles.disclaimerTitle}>
                  3. Modo solo lectura y registro manual
                </div>
                <p className={wizardStyles.disclaimerText}>
                  La plataforma no ejecuta pagos, amortizaciones ni transferencias bancarias reales.
                </p>
              </div>
            </div>

            <div className={wizardStyles.disclaimerCard}>
              <div className={wizardStyles.disclaimerIcon}>
                <Sparkles size={20} />
              </div>
              <div>
                <div className={wizardStyles.disclaimerTitle}>
                  4. Sin asesoramiento financiero regulado
                </div>
                <p className={wizardStyles.disclaimerText}>
                  FinanZIA y su Asistente IA son herramientas de análisis y educación personal, no entidades de asesoramiento financiero regulado.
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              borderRadius: 'var(--radius-md, 10px)',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.8125rem',
              color: '#94a3b8',
            }}
          >
            Estado: <strong>Aceptado y Verificado</strong> · Versión{' '}
            {profileData?.disclaimerLog?.appVersion || '1.0.0'}
          </div>
        </div>
      )}
    </div>
  );
}
