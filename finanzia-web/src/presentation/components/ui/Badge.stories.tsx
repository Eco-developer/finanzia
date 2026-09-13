import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['income', 'expense', 'transfer', 'warning', 'ai', 'neutral']
    },
    size: {
      control: 'select',
      options: ['sm', 'md']
    }
  }
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Ingreso: Story = {
  args: {
    children: 'Ingreso',
    variant: 'income'
  }
};

export const Gasto: Story = {
  args: {
    children: 'Gasto',
    variant: 'expense'
  }
};

export const PresupuestoAlerta: Story = {
  args: {
    children: '85% Consumido',
    variant: 'warning'
  }
};

export const SugerenciaIA: Story = {
  args: {
    children: 'FinanZIA AI',
    variant: 'ai'
  }
};
