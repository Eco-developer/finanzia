import type { Meta, StoryObj } from '@storybook/react';
import { AccountCard } from './AccountCard';

const meta: Meta<typeof AccountCard> = {
  title: 'Financial/AccountCard',
  component: AccountCard,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AccountCard>;

export const CheckingAccount: Story = {
  args: {
    account: {
      id: 'acc-1',
      userId: 'usr-1',
      name: 'BBVA Nómina Principal',
      type: 'CHECKING',
      currency: 'EUR',
      initialBalanceCents: 150000,
      currentBalanceCents: 245050,
      isArchived: false,
      createdAt: '2026-09-01T10:00:00Z',
      updatedAt: '2026-09-01T10:00:00Z',
    },
    isSelected: false,
  },
};

export const SavingsAccountSelected: Story = {
  args: {
    account: {
      id: 'acc-2',
      userId: 'usr-1',
      name: 'Fondo de Emergencia (Ahorro)',
      type: 'SAVINGS',
      currency: 'EUR',
      initialBalanceCents: 500000,
      currentBalanceCents: 1250000,
      isArchived: false,
      createdAt: '2026-09-01T10:00:00Z',
      updatedAt: '2026-09-01T10:00:00Z',
    },
    isSelected: true,
  },
};

export const CreditCardNegative: Story = {
  args: {
    account: {
      id: 'acc-3',
      userId: 'usr-1',
      name: 'Tarjeta Visa Oro',
      type: 'CREDIT_CARD',
      currency: 'EUR',
      initialBalanceCents: 0,
      currentBalanceCents: -34020,
      isArchived: false,
      createdAt: '2026-09-01T10:00:00Z',
      updatedAt: '2026-09-01T10:00:00Z',
    },
    isSelected: false,
  },
};
