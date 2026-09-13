import type { Meta, StoryObj } from '@storybook/react';
import { MoneyDisplay } from './MoneyDisplay';

const meta: Meta<typeof MoneyDisplay> = {
  title: 'Financial/MoneyDisplay',
  component: MoneyDisplay,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl']
    },
    currency: {
      control: 'text'
    },
    showSign: {
      control: 'boolean'
    },
    colorCoded: {
      control: 'boolean'
    }
  }
};

export default meta;
type Story = StoryObj<typeof MoneyDisplay>;

export const PositivoIngreso: Story = {
  args: {
    cents: 245050, // 2.450,50 €
    size: 'lg',
    colorCoded: true
  }
};

export const NegativoGasto: Story = {
  args: {
    cents: -8990, // -89,90 €
    size: 'lg',
    colorCoded: true
  }
};

export const SaldoTotalGrande: Story = {
  args: {
    cents: 1845020, // 18.450,20 €
    size: 'xl',
    colorCoded: false
  }
};

export const ConSignoExplicito: Story = {
  args: {
    cents: 50000,
    size: 'md',
    showSign: true,
    colorCoded: true
  }
};
