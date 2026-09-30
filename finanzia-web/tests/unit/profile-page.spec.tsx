import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileView } from '@/presentation/components/profile/ProfileView';
import { profileApi } from '@/infrastructure/api/profile.api';

// Mock useAuth
vi.mock('@/presentation/context/auth.context', () => ({
  useAuth: () => ({
    user: {
      id: 'usr-1',
      email: 'miguel@finanzia.com',
      firstName: 'Miguel',
      lastName: 'García',
      defaultCurrency: 'EUR',
      emailVerified: true,
      onboardingCompleted: true,
    },
    isAuthenticated: true,
  }),
}));

// Mock profileApi
vi.mock('@/infrastructure/api/profile.api', () => ({
  profileApi: {
    getFullProfile: vi.fn(),
    updateProfile: vi.fn(),
    updateFinancialProfile: vi.fn(),
  },
}));

describe('ProfileView Component', () => {
  const mockProfileData = {
    userId: 'usr-1',
    email: 'miguel@finanzia.com',
    firstName: 'Miguel',
    lastName: 'García',
    emailVerified: true,
    onboardingCompleted: true,
    defaultCurrency: 'EUR',
    profile: {
      usageGoals: ['control_expenses', 'ai_expense_optimization'],
      customGoal: null,
      preferredCurrency: 'EUR',
    },
    financialProfile: {
      profession: 'Ingeniero de Software',
      annualGrossIncome: '30k_50k',
      hasRealEstateIncome: false,
      hasStockInvestments: true,
      hasCryptoInvestments: true,
      emergencyFundRange: '3m_6m',
      experienceLevel: 'INTERMEDIATE' as const,
    },
    disclaimerLog: {
      termsAccepted: true,
      acceptedAt: '2026-09-29T10:00:00.000Z',
      appVersion: '1.0.0',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (profileApi.getFullProfile as any).mockResolvedValue(mockProfileData);
    (profileApi.updateProfile as any).mockResolvedValue({
      usageGoals: ['control_expenses'],
      preferredCurrency: 'EUR',
    });
    (profileApi.updateFinancialProfile as any).mockResolvedValue({
      profession: 'Tech Lead',
    });
  });

  it('renderiza la cabecera del perfil con nombre, inicial y badge de correo verificado', async () => {
    render(<ProfileView />);

    await waitFor(() => {
      expect(screen.getByText(/Miguel García/i)).toBeInTheDocument();
      expect(screen.getByText(/Correo Verificado/i)).toBeInTheDocument();
      expect(screen.getByText('M')).toBeInTheDocument();
    });
  });

  it('permite alternar entre pestañas y consultar datos de cuenta en Tab 1', async () => {
    render(<ProfileView />);

    await waitFor(() => {
      expect(screen.getByText(/Información de la Cuenta/i)).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('Miguel')).toBeInTheDocument();
    expect(screen.getByDisplayValue('García')).toBeInTheDocument();
    expect(screen.getByDisplayValue('miguel@finanzia.com')).toBeInTheDocument();
  });

  it('Tab 2: permite modificar metas de uso y preferencias de IA', async () => {
    render(<ProfileView />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Objetivos y Asistente IA/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Objetivos y Asistente IA/i }));

    expect(screen.getByText(/Objetivos Financieros y Preferencias de IA/i)).toBeInTheDocument();

    // Guardar cambios
    const saveBtn = screen.getByRole('button', { name: /Guardar Preferencias de Metas e IA/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(profileApi.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          usageGoals: expect.arrayContaining(['control_expenses']),
        }),
      );
      expect(screen.getByText(/actualizados correctamente/i)).toBeInTheDocument();
    });
  });

  it('Tab 3: permite modificar perfil económico y activos', async () => {
    render(<ProfileView />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Perfil Económico y Activos/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Perfil Económico y Activos/i }));

    expect(screen.getByText(/Perfil Económico y Patrimonio/i)).toBeInTheDocument();

    const professionInput = screen.getByDisplayValue('Ingeniero de Software');
    fireEvent.change(professionInput, { target: { value: 'Tech Lead' } });

    const saveBtn = screen.getByRole('button', { name: /Actualizar Perfil Económico/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(profileApi.updateFinancialProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          profession: 'Tech Lead',
        }),
      );
      expect(screen.getByText(/Perfil económico y patrimonial actualizado correctamente/i)).toBeInTheDocument();
    });
  });

  it('Tab 4: visualiza los 4 pilares de privacidad y términos aceptados', async () => {
    render(<ProfileView />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Privacidad y Límites/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Privacidad y Límites/i }));

    expect(screen.getByText(/Garantías de Privacidad y Marco Legal/i)).toBeInTheDocument();
    expect(screen.getByText(/1\. Cero datos bancarios ni contraseñas/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Cero publicidad/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Modo solo lectura y registro manual/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Sin asesoramiento financiero regulado/i)).toBeInTheDocument();
    expect(screen.getByText(/Aceptado y Verificado/i)).toBeInTheDocument();
  });
});
