import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  args: {
    placeholder: 'Introduce un valor...',
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    label: 'Nombre de cuenta',
    placeholder: 'Ej. Cuenta Principal Nómina',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Saldo Inicial (€)',
    placeholder: '0.00',
    helperText: 'Introduce el importe en euros con dos decimales.',
  },
};

export const WithError: Story = {
  args: {
    label: 'Correo Electrónico',
    defaultValue: 'correo-invalido',
    error: 'El formato del correo electrónico no es válido.',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Campo bloqueado',
    defaultValue: 'Solo lectura / deshabilitado',
    disabled: true,
  },
};
