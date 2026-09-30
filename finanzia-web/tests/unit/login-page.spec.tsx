import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/(auth)/login/page';

// Mock useRouter
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock useAuth
const mockLogin = vi.fn();
vi.mock('@/presentation/context/auth.context', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    isAuthenticated: false,
    isLoading: false,
  }),
}));

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el formulario de inicio de sesión con inputs y botón', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: /Finan\s*ZIA/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo Electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Contraseña$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar a FinanZIA/i })).toBeInTheDocument();
  });

  it('si el usuario no ha completado el onboarding, redirige a /onboarding tras iniciar sesión', async () => {
    mockLogin.mockResolvedValue({
      id: 'usr-1',
      email: 'miguel@finanzia.local',
      firstName: 'Miguel',
      onboardingCompleted: false,
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
      target: { value: 'miguel@finanzia.local' },
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña$/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Entrar a FinanZIA/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'miguel@finanzia.local',
        password: 'password123',
      });
      expect(mockPush).toHaveBeenCalledWith('/onboarding');
    });
  });

  it('si el usuario ya completó el onboarding, redirige a / (Dashboard) tras iniciar sesión', async () => {
    mockLogin.mockResolvedValue({
      id: 'usr-1',
      email: 'miguel@finanzia.local',
      firstName: 'Miguel',
      onboardingCompleted: true,
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
      target: { value: 'miguel@finanzia.local' },
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña$/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Entrar a FinanZIA/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'miguel@finanzia.local',
        password: 'password123',
      });
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
});
