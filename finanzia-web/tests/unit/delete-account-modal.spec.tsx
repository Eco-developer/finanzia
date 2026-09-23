import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteAccountModal } from '@/presentation/components/financial/DeleteAccountModal';
import type { AccountItem } from '@/infrastructure/api/accounts.api';

describe('DeleteAccountModal Component', () => {
  const mockAccount: AccountItem = {
    id: 'acc-123',
    userId: 'user-1',
    name: 'Cuenta Nómina BBVA',
    type: 'CHECKING',
    initialBalanceCents: 150000,
    currentBalanceCents: 245050,
    currency: 'EUR',
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('no renderiza nada cuando account es null', () => {
    const { container } = render(
      <DeleteAccountModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        account={null}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('muestra el nombre de la cuenta, tipo, saldo actual y advertencia contable', () => {
    render(
      <DeleteAccountModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        account={mockAccount}
      />,
    );

    // Título y advertencia
    expect(screen.getByText('¿Eliminar cuenta financiera?')).toBeInTheDocument();
    expect(
      screen.getByText(/Esta cuenta se archivará y dejará de aparecer en tus listas activas/i),
    ).toBeInTheDocument();

    // Nombre y tipo
    expect(screen.getByText('Cuenta Nómina BBVA')).toBeInTheDocument();
    expect(screen.getByText('Cuenta Corriente')).toBeInTheDocument();

    // Saldo actual (2.450,50 €)
    expect(screen.getByText(/2\.450,50/)).toBeInTheDocument();
  });

  it('ejecuta onConfirm al pulsar eliminar cuenta', async () => {
    const onConfirmMock = vi.fn().mockResolvedValue(undefined);
    const onCloseMock = vi.fn();

    render(
      <DeleteAccountModal
        isOpen={true}
        onClose={onCloseMock}
        onConfirm={onConfirmMock}
        account={mockAccount}
      />,
    );

    const deleteBtn = screen.getByRole('button', { name: /Eliminar cuenta/i });
    fireEvent.click(deleteBtn);

    expect(onConfirmMock).toHaveBeenCalled();
  });

  it('ejecuta onClose al pulsar cancelar', () => {
    const onCloseMock = vi.fn();
    render(
      <DeleteAccountModal
        isOpen={true}
        onClose={onCloseMock}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        account={mockAccount}
      />,
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);

    expect(onCloseMock).toHaveBeenCalled();
  });
});
