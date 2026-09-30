import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingWizard } from '@/presentation/components/onboarding/OnboardingWizard';
import { profileApi } from '@/infrastructure/api/profile.api';

// Mock useRouter
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

// Mock useAuth
let mockUser: any = {
  id: 'u-1',
  email: 'miguel@finanzia.com',
  firstName: 'Miguel',
  onboardingCompleted: false,
};
const mockRefreshUser = vi.fn();
vi.mock('@/presentation/context/auth.context', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    refreshUser: mockRefreshUser,
  }),
}));

// Mock profileApi
vi.mock('@/infrastructure/api/profile.api', () => ({
  profileApi: {
    completeOnboarding: vi.fn(),
  },
}));

describe('OnboardingWizard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockUser = {
      id: 'u-1',
      email: 'miguel@finanzia.com',
      firstName: 'Miguel',
      onboardingCompleted: false,
    };
  });

  it('Paso 1: muestra opciones de metas y habilita continuar al seleccionar una meta', () => {
    render(<OnboardingWizard />);

    expect(screen.getByText(/¿Cómo te gustaría que Finanzia transforme tus finanzas?/i)).toBeInTheDocument();
    expect(screen.getByText(/Control de ingresos y gastos/i)).toBeInTheDocument();
    expect(screen.getByText(/Optimización de gastos con IA/i)).toBeInTheDocument();

    const nextBtn = screen.getByRole('button', { name: /Siguiente: Perfil Financiero/i });
    expect(nextBtn).toBeDisabled();

    // Seleccionar una meta
    const goalCard = screen.getByText(/Control de ingresos y gastos/i);
    fireEvent.click(goalCard);

    expect(nextBtn).toBeEnabled();
  });

  it('Paso 1: despliega textarea al seleccionar "Otros motivos específicos" y requiere texto', () => {
    render(<OnboardingWizard />);

    const otherCard = screen.getByText(/Otros motivos específicos/i);
    fireEvent.click(otherCard);

    const textarea = screen.getByLabelText(/Detalla tu motivo o necesidad específica:/i);
    expect(textarea).toBeInTheDocument();

    const nextBtn = screen.getByRole('button', { name: /Siguiente: Perfil Financiero/i });
    expect(nextBtn).toBeDisabled();

    fireEvent.change(textarea, { target: { value: 'Quiero organizar mis finanzas para comprar una casa' } });
    expect(nextBtn).toBeEnabled();
  });

  it('Paso 2: permite configurar perfil económico y avanzar o omitir', () => {
    render(<OnboardingWizard />);

    // Avanzar desde paso 1
    fireEvent.click(screen.getByText(/Control de ingresos y gastos/i));
    fireEvent.click(screen.getByRole('button', { name: /Siguiente: Perfil Financiero/i }));

    expect(screen.getByText(/Tu Perfil Económico y Patrimonial/i)).toBeInTheDocument();

    // Llenar profesión
    const professionInput = screen.getByLabelText(/¿A qué te dedicas\?/i);
    fireEvent.change(professionInput, { target: { value: 'Ingeniero de Software' } });

    // Seleccionar radio de inversiones en bolsa (Sí)
    const radioSiButtons = screen.getAllByRole('button', { name: 'Sí' });
    fireEvent.click(radioSiButtons[1]); // Inversiones en bolsa

    // Botón para avanzar a paso 3
    const nextBtn = screen.getByRole('button', { name: /Siguiente: Privacidad y Límites/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText(/Lo que Finanzia es, y lo que NUNCA será/i)).toBeInTheDocument();
  });

  it('Paso 3: presenta los 4 pilares de privacidad y no permite continuar sin aceptar el checkbox', () => {
    render(<OnboardingWizard />);

    // Paso 1
    fireEvent.click(screen.getByText(/Control de ingresos y gastos/i));
    fireEvent.click(screen.getByRole('button', { name: /Siguiente: Perfil Financiero/i }));

    // Paso 2 (omitir)
    fireEvent.click(screen.getByRole('button', { name: /Omitir este paso/i }));

    // Paso 3
    expect(screen.getByText(/1\. Cero credenciales ni datos bancarios confidenciales/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. 100% Privacidad garantizada · Cero Anuncios/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Modo estrictamente analítico y manual/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Herramienta educativa y de apoyo/i)).toBeInTheDocument();

    const continueBtn = screen.getByRole('button', { name: /Continuar a Crear mi Cuenta/i });
    expect(continueBtn).toBeDisabled();

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(continueBtn).toBeEnabled();
    fireEvent.click(continueBtn);

    // Debe estar en Paso 4
    expect(screen.getByText(/Crea tu primera cuenta manual/i)).toBeInTheDocument();
  });

  it('Paso 4: valida saldo e importe, llama a completeOnboarding y redirige a /accounts', async () => {
    (profileApi.completeOnboarding as any).mockResolvedValue({
      success: true,
      onboardingCompleted: true,
      account: { id: 'acc-1' },
    });

    render(<OnboardingWizard />);

    // Navegar rápido hasta Paso 4
    fireEvent.click(screen.getByText(/Control de ingresos y gastos/i));
    fireEvent.click(screen.getByRole('button', { name: /Siguiente: Perfil Financiero/i }));
    fireEvent.click(screen.getByRole('button', { name: /Omitir este paso/i }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Continuar a Crear mi Cuenta/i }));

    // Paso 4: formulario de cuenta
    const nameInput = screen.getByLabelText(/Nombre descriptivo de la cuenta/i);
    fireEvent.change(nameInput, { target: { value: 'Cuenta Nómina BBVA' } });

    const balanceInput = screen.getByLabelText(/Saldo inicial disponible/i);
    fireEvent.change(balanceInput, { target: { value: '1500,50' } });

    const submitBtn = screen.getByRole('button', { name: /Finalizar y entrar a mi Dashboard/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(profileApi.completeOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          accountName: 'Cuenta Nómina BBVA',
          initialBalanceCents: 150050, // Cero floats: 1500.50 -> 150050 céntimos
          termsAccepted: true,
        }),
      );
      expect(mockRefreshUser).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/accounts');
    });
  });

  it('redirige a / si el usuario ya ha completado el onboarding previamente', () => {
    mockUser.onboardingCompleted = true;

    render(<OnboardingWizard />);

    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(screen.getByText(/Ya has completado la configuración inicial/i)).toBeInTheDocument();
  });
});
