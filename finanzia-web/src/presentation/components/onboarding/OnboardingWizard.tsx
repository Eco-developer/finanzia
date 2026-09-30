'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/context/auth.context';
import { useProfile, FinancialExperienceLevel } from '@/presentation/hooks/useProfile';
import { Step1Goals } from './Step1Goals';
import { Step2FinancialProfile } from './Step2FinancialProfile';
import { Step3Disclaimers } from './Step3Disclaimers';
import { Step4InitialAccount } from './Step4InitialAccount';
import { Check } from 'lucide-react';
import styles from './OnboardingWizard.module.css';

const STORAGE_KEY = 'finanzia_onboarding_draft';

export function OnboardingWizard() {
  const router = useRouter();
  const { user, refreshUser, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { completeOnboarding } = useProfile();

  // Redirección inversa: Si ya completó el onboarding, redirigir al panel principal
  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (user?.onboardingCompleted) {
        router.replace('/');
      }
    }
  }, [isAuthLoading, isAuthenticated, user, router]);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1 State
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState<string>('');

  // Step 2 State
  const [profession, setProfession] = useState<string>('');
  const [annualGrossIncome, setAnnualGrossIncome] = useState<string>('');
  const [hasRealEstateIncome, setHasRealEstateIncome] = useState<boolean | null>(null);
  const [hasStockInvestments, setHasStockInvestments] = useState<boolean | null>(null);
  const [hasCryptoInvestments, setHasCryptoInvestments] = useState<boolean | null>(null);
  const [emergencyFundRange, setEmergencyFundRange] = useState<string>('');
  const [experienceLevel, setExperienceLevel] =
    useState<FinancialExperienceLevel>('INTERMEDIATE');
  const [preferredCurrency, setPreferredCurrency] = useState<string>('EUR');

  // Step 3 State
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);

  // Step 4 State
  const [accountName, setAccountName] = useState<string>('Cuenta Corriente Principal');
  const [accountType, setAccountType] = useState<
    'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT'
  >('CHECKING');
  const [initialBalanceEur, setInitialBalanceEur] = useState<string>('0');
  const [accountCurrency, setAccountCurrency] = useState<string>('EUR');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cargar borrador si existe en sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
        if (parsed.selectedGoals) setSelectedGoals(parsed.selectedGoals);
        if (parsed.customGoal) setCustomGoal(parsed.customGoal);
        if (parsed.profession) setProfession(parsed.profession);
        if (parsed.annualGrossIncome) setAnnualGrossIncome(parsed.annualGrossIncome);
        if (parsed.hasRealEstateIncome !== undefined)
          setHasRealEstateIncome(parsed.hasRealEstateIncome);
        if (parsed.hasStockInvestments !== undefined)
          setHasStockInvestments(parsed.hasStockInvestments);
        if (parsed.hasCryptoInvestments !== undefined)
          setHasCryptoInvestments(parsed.hasCryptoInvestments);
        if (parsed.emergencyFundRange) setEmergencyFundRange(parsed.emergencyFundRange);
        if (parsed.experienceLevel) setExperienceLevel(parsed.experienceLevel);
        if (parsed.preferredCurrency) setPreferredCurrency(parsed.preferredCurrency);
        if (parsed.termsAccepted) setTermsAccepted(parsed.termsAccepted);
        if (parsed.accountName) setAccountName(parsed.accountName);
        if (parsed.accountType) setAccountType(parsed.accountType);
        if (parsed.initialBalanceEur) setInitialBalanceEur(parsed.initialBalanceEur);
        if (parsed.accountCurrency) setAccountCurrency(parsed.accountCurrency);
      }
    } catch {
      // Ignorar errores de parseo de almacenamiento local
    }
  }, []);

  // Guardar estado reactivo en sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          currentStep,
          selectedGoals,
          customGoal,
          profession,
          annualGrossIncome,
          hasRealEstateIncome,
          hasStockInvestments,
          hasCryptoInvestments,
          emergencyFundRange,
          experienceLevel,
          preferredCurrency,
          termsAccepted,
          accountName,
          accountType,
          initialBalanceEur,
          accountCurrency,
        }),
      );
    } catch {
      // Silencioso
    }
  }, [
    currentStep,
    selectedGoals,
    customGoal,
    profession,
    annualGrossIncome,
    hasRealEstateIncome,
    hasStockInvestments,
    hasCryptoInvestments,
    emergencyFundRange,
    experienceLevel,
    preferredCurrency,
    termsAccepted,
    accountName,
    accountType,
    initialBalanceEur,
    accountCurrency,
  ]);

  // Si el usuario ya completó onboarding, redirigir a dashboard
  useEffect(() => {
    if (user && user.onboardingCompleted) {
      router.push('/accounts');
    }
  }, [user, router]);

  // Handlers Step 1
  const handleToggleGoal = (id: string) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  };

  // Handlers Step 4 Submit
  const handleSubmit = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const cleanBalanceStr = initialBalanceEur.replace(',', '.').trim();
      const parsedBalance = parseFloat(cleanBalanceStr || '0');
      const initialBalanceCents = Math.round((isNaN(parsedBalance) ? 0 : parsedBalance) * 100);

      await completeOnboarding({
        usageGoals: selectedGoals,
        customGoal: selectedGoals.includes('other') ? customGoal : undefined,
        preferredCurrency,
        profession: profession.trim() || undefined,
        annualGrossIncome: annualGrossIncome || undefined,
        hasRealEstateIncome:
          hasRealEstateIncome !== null ? hasRealEstateIncome : undefined,
        hasStockInvestments:
          hasStockInvestments !== null ? hasStockInvestments : undefined,
        hasCryptoInvestments:
          hasCryptoInvestments !== null ? hasCryptoInvestments : undefined,
        emergencyFundRange: emergencyFundRange || undefined,
        experienceLevel: experienceLevel || undefined,
        termsAccepted,
        accountName: accountName.trim(),
        accountType,
        initialBalanceCents,
        currency: accountCurrency || preferredCurrency || 'EUR',
      });

      // Limpiar borrador temporal
      sessionStorage.removeItem(STORAGE_KEY);

      // Refrescar usuario en contexto de autenticación
      await refreshUser();

      // Redirigir al módulo de cuentas con datos ya listos
      router.push('/accounts');
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Ha ocurrido un error al completar la configuración inicial. Por favor, inténtalo de nuevo.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
        <p>Cargando sesión...</p>
      </div>
    );
  }

  if (user?.onboardingCompleted) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
        <p>Ya has completado la configuración inicial. Redirigiendo a tu panel...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.ambientGlow} />

      <div className={styles.card}>
        {/* Stepper Superior */}
        <div className={styles.stepperContainer}>
          {[1, 2, 3, 4].map((step) => {
            const isCompleted = currentStep > step;
            const isActive = currentStep === step;

            return (
              <React.Fragment key={step}>
                <div
                  className={`${styles.stepDot} ${
                    isActive ? styles.stepDotActive : ''
                  } ${isCompleted ? styles.stepDotCompleted : ''}`}
                >
                  {isCompleted ? <Check size={16} strokeWidth={3} /> : step}
                </div>
                {step < 4 && (
                  <div
                    className={`${styles.stepConnector} ${
                      currentStep > step ? styles.stepConnectorActive : ''
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Contenido Dinámico de cada Paso */}
        {currentStep === 1 && (
          <Step1Goals
            selectedGoals={selectedGoals}
            customGoal={customGoal}
            onToggleGoal={handleToggleGoal}
            onChangeCustomGoal={setCustomGoal}
            onNext={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          <Step2FinancialProfile
            profession={profession}
            annualGrossIncome={annualGrossIncome}
            hasRealEstateIncome={hasRealEstateIncome}
            hasStockInvestments={hasStockInvestments}
            hasCryptoInvestments={hasCryptoInvestments}
            emergencyFundRange={emergencyFundRange}
            experienceLevel={experienceLevel}
            preferredCurrency={preferredCurrency}
            onChangeProfession={setProfession}
            onChangeAnnualGrossIncome={setAnnualGrossIncome}
            onChangeHasRealEstateIncome={setHasRealEstateIncome}
            onChangeHasStockInvestments={setHasStockInvestments}
            onChangeHasCryptoInvestments={setHasCryptoInvestments}
            onChangeEmergencyFundRange={setEmergencyFundRange}
            onChangeExperienceLevel={setExperienceLevel}
            onChangePreferredCurrency={(c) => {
              setPreferredCurrency(c);
              setAccountCurrency(c);
            }}
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
            onSkip={() => setCurrentStep(3)}
          />
        )}

        {currentStep === 3 && (
          <Step3Disclaimers
            termsAccepted={termsAccepted}
            onToggleTerms={setTermsAccepted}
            onBack={() => setCurrentStep(2)}
            onNext={() => setCurrentStep(4)}
          />
        )}

        {currentStep === 4 && (
          <Step4InitialAccount
            accountName={accountName}
            accountType={accountType}
            initialBalanceEur={initialBalanceEur}
            currency={accountCurrency}
            isSubmitting={isSubmitting}
            errorMessage={errorMessage}
            onChangeAccountName={setAccountName}
            onChangeAccountType={setAccountType}
            onChangeInitialBalanceEur={setInitialBalanceEur}
            onChangeCurrency={setAccountCurrency}
            onBack={() => setCurrentStep(3)}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}
