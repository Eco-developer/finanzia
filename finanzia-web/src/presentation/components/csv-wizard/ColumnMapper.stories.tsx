import type { Meta, StoryObj } from '@storybook/react';
import { ColumnMapper } from './ColumnMapper';

const meta: Meta<typeof ColumnMapper> = {
  title: 'CSV Wizard/ColumnMapper',
  component: ColumnMapper,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Selector y mapeador dinámico de columnas CSV con preajustes de entidades bancarias (BBVA, Santander, Revolut, etc.) y previsualización de 5 filas.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ColumnMapper>;

const sampleHeaders = ['Fecha', 'Hora', 'Concepto', 'Movimiento', 'Importe EUR', 'Saldo'];
const sampleRows = [
  ['10/09/2026', '14:32', 'MERCADONA S.A.', 'COMPRA TARJETA', '-45,20', '1.450,80'],
  ['09/09/2026', '08:15', 'REPSOL ESTACION 24H', 'PAGO TARJETA', '-60,00', '1.496,00'],
  ['05/09/2026', '10:00', 'NOMINA MENSUAL EMPRESA', 'TRANSFERENCIA A FAVOR', '2.250,00', '1.556,00'],
  ['02/09/2026', '20:10', 'RESTAURANTE EL BODEGON', 'PAGO TARJETA', '-32,50', '-694,00'],
  ['01/09/2026', '12:00', 'NETFLIX SUSCRIPCION', 'DOMICILIACION', '-17,99', '-661,50'],
];

export const Default: Story = {
  args: {
    headers: sampleHeaders,
    sampleRows: sampleRows,
    savedTemplates: [
      {
        id: 'tpl-1',
        bankName: 'Mi Banco Personal',
        columnMapping: {
          dateCol: 'Fecha',
          descCol: 'Concepto',
          amountCol: 'Importe EUR',
        },
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ],
    onMappingConfirmed: (config) => {
      console.log('Mapeo confirmado:', config);
    },
    onBack: () => console.log('Volver atrás'),
  },
};
