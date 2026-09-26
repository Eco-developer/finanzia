import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AccountsPage from '@/app/accounts/page';
import { accountsApi, type AccountItem } from '@/infrastructure/api/accounts.api';

// Mock auth context
vi.mock('@/presentation/context/auth.context', () => ({
  useAuth: () => ({
    user: { id: 'u-1', email: 'test@finanzia.com', firstName: 'Carlos', lastName: 'Gómez' },
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  }),
}));

// Mock accounts api
vi.mock('@/infrastructure/api/accounts.api', async () => {
  const actual = await vi.importActual<any>('@/infrastructure/api/accounts.api');
  return {
    ...actual,
    accountsApi: {
      ...actual.accountsApi,
      getAccounts: vi.fn(),
      createAccount: vi.fn(),
      updateAccount: vi.fn(),
      deleteAccount: vi.fn(),
    },
  };
});

describe('AccountsPage Component (/accounts)', () => {
  const mockAccounts: AccountItem[] = [
    {
      id: 'acc-1',
      userId: 'u-1',
      name: 'Cuenta Nómina BBVA',
      type: 'CHECKING',
      initialBalanceCents: 100000,
      currentBalanceCents: 250000,
      currency: 'EUR',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'acc-2',
      userId: 'u-1',
      name: 'Tarjeta Oro Visa',
      type: 'CREDIT_CARD',
      initialBalanceCents: 0,
      currentBalanceCents: -45000,
      currency: 'EUR',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (accountsApi.getAccounts as any).mockResolvedValue(mockAccounts);
  });

  it('renderiza el título, subtítulo, botón de nueva cuenta y KPIs consolidados', async () => {
    render(<AccountsPage />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Cuentas y Tarjetas' })).toBeInTheDocument();
    expect(screen.getByText(/Gestión centralizada de tus cuentas bancarias/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nueva Cuenta/i })).toBeInTheDocument();

    // KPIs
    expect(screen.getByText('Patrimonio Total Líquido')).toBeInTheDocument();
    expect(screen.getByText('Cuentas Bancarias y Ahorro')).toBeInTheDocument();
    expect(screen.getByText('Tarjetas de Crédito')).toBeInTheDocument();

    // Cuentas renderizadas
    expect(screen.getByText('Cuenta Nómina BBVA')).toBeInTheDocument();
    expect(screen.getByText('Tarjeta Oro Visa')).toBeInTheDocument();
  });

  it('abre el modal CreateAccountModal al pulsar en Nueva Cuenta', async () => {
    render(<AccountsPage />);

    const newAccountBtn = await screen.findByRole('button', { name: /Nueva Cuenta/i });
    fireEvent.click(newAccountBtn);

    expect(await screen.findByText('Crear Nueva Cuenta')).toBeInTheDocument();
    expect(screen.getByText(/Registra una cuenta bancaria, efectivo o ahorro/i)).toBeInTheDocument();
  });

  it('abre el modal EditAccountModal al pulsar el botón de modificar', async () => {
    render(<AccountsPage />);

    const editBtn = await screen.findByRole('button', { name: /Modificar Cuenta Nómina BBVA/i });
    fireEvent.click(editBtn);

    expect(await screen.findByText('Modificar Cuenta')).toBeInTheDocument();
    const nameInput = screen.getByLabelText(/Nombre de la Cuenta/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Cuenta Nómina BBVA');
  });

  it('abre el modal DeleteAccountModal al pulsar el botón de eliminar', async () => {
    render(<AccountsPage />);

    const deleteBtn = await screen.findByRole('button', { name: /Eliminar Cuenta Nómina BBVA/i });
    fireEvent.click(deleteBtn);

    expect(await screen.findByText('¿Eliminar cuenta financiera?')).toBeInTheDocument();
    expect(screen.getByText(/Esta cuenta se archivará y dejará de aparecer/i)).toBeInTheDocument();
  });
});
