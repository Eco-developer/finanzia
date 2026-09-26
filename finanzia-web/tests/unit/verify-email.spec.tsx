import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VerifyEmailPage from '@/app/(auth)/verify-email/page';
import { authApi } from '@/infrastructure/api/auth.api';

// Mocks de Next.js router & searchParams
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/presentation/context/auth.context', () => ({
  useAuth: () => ({
    refreshUser: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe('VerifyEmailPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  describe('Modo Notificación / Espera (sin token)', () => {
    it('muestra el correo enviado y el botón de reenvío', () => {
      mockSearchParams = new URLSearchParams('email=nuevo%40ejemplo.com');

      render(<VerifyEmailPage />);

      expect(screen.getByText('Verifica tu correo electrónico')).toBeInTheDocument();
      expect(screen.getByText('nuevo@ejemplo.com')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /reenviar correo de verificación/i })
      ).toBeInTheDocument();
    });

    it('muestra advertencia cuando el usuario fue redirigido por login no verificado', () => {
      mockSearchParams = new URLSearchParams('email=pendiente%40ejemplo.com&unverified=true');

      render(<VerifyEmailPage />);

      expect(
        screen.getByText(/tu cuenta aún no ha sido verificada/i)
      ).toBeInTheDocument();
    });

    it('permite reenviar el correo de verificación e inicia cooldown', async () => {
      mockSearchParams = new URLSearchParams('email=nuevo%40ejemplo.com');
      vi.spyOn(authApi, 'resendVerification').mockResolvedValue({
        sent: true,
        message: 'Correo reenviado exitosamente',
      });

      render(<VerifyEmailPage />);

      const resendBtn = screen.getByRole('button', {
        name: /reenviar correo de verificación/i,
      });

      fireEvent.click(resendBtn);

      await waitFor(() => {
        expect(authApi.resendVerification).toHaveBeenCalledWith('nuevo@ejemplo.com');
      });

      await waitFor(() => {
        expect(screen.getByText('Correo reenviado exitosamente')).toBeInTheDocument();
      });

      // El botón ahora debe estar en cooldown (disabled)
      expect(screen.getByRole('button', { name: /reenviar en \d+s/i })).toBeDisabled();
    });
  });

  describe('Modo Validación de Token', () => {
    it('muestra éxito cuando el token es válido', async () => {
      mockSearchParams = new URLSearchParams('token=valid-token-123');
      vi.spyOn(authApi, 'verifyEmail').mockResolvedValue({
        verified: true,
        message: 'Correo verificado con éxito.',
      });

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(authApi.verifyEmail).toHaveBeenCalledWith('valid-token-123');
      });

      await waitFor(() => {
        expect(screen.getByText('¡Correo verificado con éxito!')).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /continuar a la aplicación/i })
        ).toBeInTheDocument();
      });
    });

    it('muestra error cuando el token es inválido o ha expirado', async () => {
      mockSearchParams = new URLSearchParams('token=invalid-token-999');
      vi.spyOn(authApi, 'verifyEmail').mockRejectedValue(
        new Error('El enlace de verificación no es válido o ha expirado.')
      );

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(authApi.verifyEmail).toHaveBeenCalledWith('invalid-token-999');
      });

      await waitFor(() => {
        expect(screen.getByText('Enlace no válido o caducado')).toBeInTheDocument();
        expect(
          screen.getByText('El enlace de verificación no es válido o ha expirado.')
        ).toBeInTheDocument();
      });
    });
  });
});
