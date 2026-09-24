/**
 * Tipos de Dominio para el Módulo de Deudas y Amortizaciones (FinanZIA)
 * Totalmente desacoplados de Prisma y bases de datos.
 */

export const InterestRateType = {
  ANNUAL: "ANNUAL",
  MONTHLY: "MONTHLY",
} as const;
export type InterestRateType =
  (typeof InterestRateType)[keyof typeof InterestRateType];

export const DebtStatus = {
  ACTIVE: "ACTIVE",
  PAID_OFF: "PAID_OFF",
} as const;
export type DebtStatus = (typeof DebtStatus)[keyof typeof DebtStatus];

export const DebtPayoffStrategy = {
  AVALANCHE: "AVALANCHE", // Prioriza deudas con mayor tasa de interés (minimiza coste total)
  SNOWBALL: "SNOWBALL",   // Prioriza deudas con menor saldo vivo (victorias psicológicas rápidas)
} as const;
export type DebtPayoffStrategy =
  (typeof DebtPayoffStrategy)[keyof typeof DebtPayoffStrategy];
