import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditAccountModal } from '@/presentation/components/financial/EditAccountModal';
import { accountsApi, type AccountItem } from '@/infrastructure/api/accounts.api';

vi.mock('@/infrastructure/api/accounts.api', async () => {
  const actual = await vi.importActual<any>('@/infrastructure/api/accounts.api');
  return {
    ...actual,
    accountsApi: {
      ...actual.accountsApi,
      updateAccount: vi.fn(),
    },
  };
});

describe('EditAccountModal Component', () => {
  const mockAccount: AccountItem = {
    id: 'acc-456',
    userId: 'user-1',
    name: 'Cuenta Ahorro Santander',
    type: 'SAVINGS',
    initialBalanceCents: 500000,
    currentBalanceCents: 620000,
    currency: 'EUR',
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('no renderiza nada cuando account es null', () => {
    const { container } = render(
      <EditAccountModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        account={null}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('precarga el nombre, tipo y saldo actual de la cuenta', () => {
    render(
      <EditAccountModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        account={mockAccount}
      />,
    );

    expect(screen.getByText('Modificar Cuenta')).toBeInTheDocument();
    const nameInput = screen.getByLabelText(/Nombre de la Cuenta/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Cuenta Ahorro Santander');

    // Saldo actual visible
    expect(screen.getByText(/6\.200,00/)).toBeInTheDocument();
  });

  it('muestra error si el nombre está vacío al enviar', async () => {
    render(
      <EditAccountModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        account={mockAccount}
      />,
    );

    const nameInput = screen.getByLabelText(/Nombre de la Cuenta/i);
    fireEvent.change(nameInput, { target: { value: '   ' } });

    const submitBtn = screen.getByRole('button', { name: /Guardar Cambios/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('El nombre de la cuenta es obligatorio')).toBeInTheDocument();
  });

  it('llama a accountsApi.updateAccount con datos actualizados y ejecuta onSuccess', async () => {
    const onSuccessMock = vi.fn();
    const onCloseMock = vi.fn();
    (accountsApi.updateAccount as any).mockResolvedValueOnce({
      ...mockAccount,
      name: 'Ahorro Santander Renombrado',
    });

    render(
      <EditAccountModal
        isOpen={true}
        onClose={onCloseMock}
        onSuccess={onSuccessMock}
        account={mockAccount}
      />,
    );

    const nameInput = screen.getByLabelText(/Nombre de la Cuenta/i);
    fireEvent.change(nameInput, { target: { value: 'Ahorro Santander Renombrado' } });

    const submitBtn = screen.getByRole('button', { name: /Guardar Cambios/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(accountsApi.updateAccount).toHaveBeenCalledWith('acc-456', {
        name: 'Ahorro Santander Renombrado',
        type: 'SAVINGS',
      });
      expect(onSuccessMock).toHaveBeenCalled();
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it('ejecuta onClose al hacer clic en Cancelar', () => {
    const onCloseMock = vi.fn();
    render(
      <EditAccountModal
        isOpen={true}
        onClose={onCloseMock}
        onSuccess={vi.fn()}
        account={mockAccount}
      />,
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);

    expect(onCloseMock).toHaveBeenCalled();
  });
});
