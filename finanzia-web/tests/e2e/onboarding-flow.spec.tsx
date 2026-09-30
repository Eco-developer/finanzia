import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OnboardingPage from '@/app/onboarding/page';
import { ProfileView } from '@/presentation/components/profile/ProfileView';
import { profileApi } from '@/infrastructure/api/profile.api';

// Mocks hoisted
const { mockAuthState, mockPush, mockReplace, mockLogout, mockRefreshUser } = vi.hoisted(() => {
  const mockAuthState = {
    user: {
      id: 'usr-e2e-1',
      email: 'investor@finanzia.local',
      firstName: 'Elena',
      lastName: 'Navarro',
      emailVerified: true,
      onboardingCompleted: false,
      defaultCurrency: 'EUR',
    } as any,
    isAuthenticated: true,
    isLoading: false,
  };
  return {
    mockAuthState,
    mockPush: vi.fn(),
    mockReplace: vi.fn(),
    mockLogout: vi.fn(),
    mockRefreshUser: vi.fn(),
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

vi.mock('@/presentation/context/auth.context', () => ({
  useAuth: () => ({
    user: mockAuthState.user,
    isAuthenticated: mockAuthState.isAuthenticated,
    isLoading: mockAuthState.isLoading,
    logout: mockLogout,
    refreshUser: mockRefreshUser,
  }),
}));

// Mock de API de perfil y onboarding
vi.mock('@/infrastructure/api/profile.api', () => ({
  profileApi: {
    getFullProfile: vi.fn(),
    updateProfile: vi.fn(),
    updateFinancialProfile: vi.fn(),
    getOnboardingStatus: vi.fn(),
    completeOnboarding: vi.fn(),
  },
}));

describe('E2E Onboarding & Profile Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockAuthState.user = {
      id: 'usr-e2e-1',
      email: 'investor@finanzia.local',
      firstName: 'Elena',
      lastName: 'Navarro',
      emailVerified: true,
      onboardingCompleted: false,
      defaultCurrency: 'EUR',
    };
  });

  it('Fase 1: completa el Wizard de Onboarding inicial (Pasos 1 a 4) con éxito', async () => {
    (profileApi.completeOnboarding as any).mockResolvedValue({
      success: true,
      message: 'Onboarding completado exitosamente',
      onboardingCompleted: true,
      account: {
        id: 'acc-e2e-1',
        name: 'Cuenta Operativa BBVA',
        type: 'CHECKING',
        currency: 'EUR',
        initialBalanceCents: 150050,
        currentBalanceCents: 150050,
      },
    });

    render(<OnboardingPage />);

    // --- PASO 1: Objetivos Financieros ---
    expect(
      screen.getByText(/¿Cómo te gustaría que Finanzia transforme tus finanzas\?/i),
    ).toBeInTheDocument();

    const nextBtnStep1 = screen.getByRole('button', { name: /Siguiente: Perfil Financiero/i });
    expect(nextBtnStep1).toBeDisabled();

    // Seleccionamos objetivos
    fireEvent.click(screen.getByText(/Control de ingresos y gastos/i));
    fireEvent.click(screen.getByText(/Optimización de gastos con IA/i));

    // Seleccionamos "Otros motivos específicos" y escribimos
    fireEvent.click(screen.getByText(/Otros motivos específicos/i));
    const textarea = screen.getByLabelText(/Detalla tu motivo o necesidad específica:/i);
    expect(textarea).toBeInTheDocument();
    fireEvent.change(textarea, {
      target: { value: 'Comprar una vivienda y planificar ahorro para la entrada' },
    });

    expect(nextBtnStep1).toBeEnabled();
    fireEvent.click(nextBtnStep1);

    // --- PASO 2: Perfil Económico ---
    await waitFor(() => {
      expect(screen.getByText(/Tu Perfil Económico y Patrimonial/i)).toBeInTheDocument();
    });

    const professionInput = screen.getByLabelText(/¿A qué te dedicas\?/i);
    fireEvent.change(professionInput, { target: { value: 'Ingeniera de Software' } });

    // Inversiones: Bolsa = Sí, Criptomonedas = Sí, Inmuebles = No
    const siButtons = screen.getAllByRole('button', { name: 'Sí' });
    fireEvent.click(siButtons[1]); // Inversión en bolsa
    fireEvent.click(siButtons[2]); // Criptomonedas

    const noButtons = screen.getAllByRole('button', { name: 'No' });
    fireEvent.click(noButtons[0]); // Ingresos por inmuebles = No

    const nextBtnStep2 = screen.getByRole('button', { name: /Siguiente: Privacidad y Límites/i });
    fireEvent.click(nextBtnStep2);

    // --- PASO 3: Disclaimer Legal y Privacidad ---
    await waitFor(() => {
      expect(screen.getByText(/Lo que Finanzia es, y lo que NUNCA será/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/1\. Cero credenciales ni datos bancarios confidenciales/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. 100% Privacidad garantizada · Cero Anuncios/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Modo estrictamente analítico y manual/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Herramienta educativa y de apoyo/i)).toBeInTheDocument();

    const continueBtnStep3 = screen.getByRole('button', { name: /Continuar a Crear mi Cuenta/i });
    expect(continueBtnStep3).toBeDisabled();

    // Aceptamos el checkbox de consentimiento
    const disclaimerCheckbox = screen.getByRole('checkbox');
    fireEvent.click(disclaimerCheckbox);
    expect(continueBtnStep3).toBeEnabled();
    fireEvent.click(continueBtnStep3);

    // --- PASO 4: Alta de Primera Cuenta Manual ---
    await waitFor(() => {
      expect(screen.getByText(/Crea tu primera cuenta manual/i)).toBeInTheDocument();
    });

    const accountNameInput = screen.getByLabelText(/Nombre descriptivo de la cuenta/i);
    fireEvent.change(accountNameInput, { target: { value: 'Cuenta Operativa BBVA' } });

    const balanceInput = screen.getByLabelText(/Saldo inicial disponible/i);
    fireEvent.change(balanceInput, { target: { value: '1500,50' } });

    const submitBtn = screen.getByRole('button', { name: /Finalizar y entrar a mi Dashboard/i });
    fireEvent.click(submitBtn);

    // Verificamos la llamada atómica a completeOnboarding
    await waitFor(() => {
      expect(profileApi.completeOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          usageGoals: expect.arrayContaining([
            'control_expenses',
            'ai_expense_optimization',
            'other',
          ]),
          customGoal: 'Comprar una vivienda y planificar ahorro para la entrada',
          profession: 'Ingeniera de Software',
          hasStockInvestments: true,
          hasCryptoInvestments: true,
          hasRealEstateIncome: false,
          termsAccepted: true,
          accountName: 'Cuenta Operativa BBVA',
          initialBalanceCents: 150050, // Cero floats: 1500.50 -> 150050 céntimos
        }),
      );
      expect(mockRefreshUser).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/accounts');
    });
  });

  it('Fase 2: permite consultar y modificar datos en el módulo /profile con navegación por tabs', async () => {
    mockAuthState.user = {
      id: 'usr-e2e-1',
      email: 'investor@finanzia.local',
      firstName: 'Elena',
      lastName: 'Navarro',
      emailVerified: true,
      onboardingCompleted: true,
      defaultCurrency: 'EUR',
    };

    (profileApi.getFullProfile as any).mockResolvedValue({
      userId: 'usr-e2e-1',
      email: 'investor@finanzia.local',
      firstName: 'Elena',
      lastName: 'Navarro',
      emailVerified: true,
      onboardingCompleted: true,
      defaultCurrency: 'EUR',
      profile: {
        usageGoals: ['control_expenses', 'ai_expense_optimization'],
        customGoal: 'Ahorrar para la entrada de vivienda',
        preferredCurrency: 'EUR',
        updatedAt: new Date().toISOString(),
      },
      financialProfile: {
        profession: 'Ingeniera de Software',
        annualGrossIncome: '30k_50k',
        hasStockInvestments: true,
        hasCryptoInvestments: true,
        hasRealEstateIncome: false,
        emergencyFundRange: '3m_6m',
        experienceLevel: 'INTERMEDIATE',
        updatedAt: new Date().toISOString(),
      },
      disclaimerLog: {
        termsAccepted: true,
        acceptedAt: new Date().toISOString(),
        appVersion: '1.0.0',
      },
    });

    render(<ProfileView />);

    // Verificamos cabecera del perfil cargada
    await waitFor(() => {
      expect(screen.getByText(/Elena Navarro/i)).toBeInTheDocument();
      expect(screen.getByText('investor@finanzia.local')).toBeInTheDocument();
      expect(screen.getByText(/Correo Verificado/i)).toBeInTheDocument();
    });

    // Pestaña 2: Metas e IA
    const goalsTabBtn = screen.getByRole('button', { name: /Metas e IA/i });
    fireEvent.click(goalsTabBtn);

    expect(
      screen.getByDisplayValue('Ahorrar para la entrada de vivienda'),
    ).toBeInTheDocument();

    (profileApi.updateProfile as any).mockResolvedValue({
      usageGoals: ['control_expenses', 'savings_goals'],
      customGoal: 'Ahorrar para la entrada de vivienda',
      preferredCurrency: 'EUR',
      updatedAt: new Date().toISOString(),
    });

    const saveGoalsBtn = screen.getByRole('button', { name: /Guardar Preferencias/i });
    fireEvent.click(saveGoalsBtn);

    await waitFor(() => {
      expect(profileApi.updateProfile).toHaveBeenCalled();
    });

    // Pestaña 3: Perfil Económico y Activos
    const financialTabBtn = screen.getByRole('button', { name: /Perfil Económico/i });
    fireEvent.click(financialTabBtn);

    expect(screen.getByDisplayValue('Ingeniera de Software')).toBeInTheDocument();

    (profileApi.updateFinancialProfile as any).mockResolvedValue({
      profession: 'Líder Técnico',
      annualGrossIncome: '50k_80k',
      hasStockInvestments: true,
      hasCryptoInvestments: true,
      hasRealEstateIncome: true,
      emergencyFundRange: 'over_6m',
      experienceLevel: 'ADVANCED',
      updatedAt: new Date().toISOString(),
    });

    const saveFinancialBtn = screen.getByRole('button', { name: /Guardar Perfil Económico/i });
    fireEvent.click(saveFinancialBtn);

    await waitFor(() => {
      expect(profileApi.updateFinancialProfile).toHaveBeenCalled();
    });

    // Pestaña 4: Privacidad y Términos Aceptados
    const privacyTabBtn = screen.getByRole('button', { name: /Privacidad y Términos/i });
    fireEvent.click(privacyTabBtn);

    expect(screen.getByText(/Términos y condiciones aceptados/i)).toBeInTheDocument();
    expect(screen.getByText(/Versión del consentimiento: 1.0.0/i)).toBeInTheDocument();
  });
});
