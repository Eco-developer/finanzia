import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'ai', 'ghost']
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    },
    isLoading: {
      control: 'boolean'
    },
    disabled: {
      control: 'boolean'
    }
  }
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primario: Story = {
  args: {
    children: 'Guardar Transacción',
    variant: 'primary'
  }
};

export const AsistenteIA: Story = {
  args: {
    children: 'Consultar FinanZIA AI',
    variant: 'ai'
  }
};

export const Secundario: Story = {
  args: {
    children: 'Cancelar',
    variant: 'secondary'
  }
};

export const Peligro: Story = {
  args: {
    children: 'Eliminar Cuenta',
    variant: 'danger'
  }
};

export const Cargando: Story = {
  args: {
    children: 'Importando Extracto...',
    variant: 'primary',
    isLoading: true
  }
};
