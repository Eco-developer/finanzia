import type { Meta, StoryObj } from '@storybook/react';
import { CsvUploader } from './CsvUploader';

const meta: Meta<typeof CsvUploader> = {
  title: 'CSV Wizard/CsvUploader',
  component: CsvUploader,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Zona de subida interactiva con drag & drop para extractos bancarios CSV con detección de delimitador (, o ;).',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CsvUploader>;

export const Default: Story = {
  args: {
    onFileParsed: (file, result) => {
      console.log('Archivo parseado:', file.name, result);
    },
    disabled: false,
  },
};

export const Disabled: Story = {
  args: {
    onFileParsed: () => {},
    disabled: true,
  },
};
