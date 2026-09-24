/**
 * Tipos y Enums puros del Dominio Financiero (Clean Architecture)
 * Totalmente desacoplados de Prisma, base de datos y librerías externas.
 */

export const AccountType = {
  CHECKING: "CHECKING",
  SAVINGS: "SAVINGS",
  INVESTMENT: "INVESTMENT",
  CASH: "CASH",
  CREDIT_CARD: "CREDIT_CARD",
} as const;
export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export const TransactionType = {
  EXPENSE: "EXPENSE",
  INCOME: "INCOME",
  TRANSFER: "TRANSFER",
} as const;
export type TransactionType =
  (typeof TransactionType)[keyof typeof TransactionType];

export const CategoryType = {
  EXPENSE: "EXPENSE",
  INCOME: "INCOME",
} as const;
export type CategoryType = (typeof CategoryType)[keyof typeof CategoryType];

export const RecommendationType = {
  BUDGET_ADJUSTMENT: "BUDGET_ADJUSTMENT",
  SAVINGS_OPPORTUNITY: "SAVINGS_OPPORTUNITY",
  SAVINGS_BOOST: "SAVINGS_BOOST",
  EXPENSE_ALERT: "EXPENSE_ALERT",
  HABIT_NUDGE: "HABIT_NUDGE",
  GOAL_CREATION: "GOAL_CREATION",
  DEBT_AMORTIZATION: "DEBT_AMORTIZATION",
} as const;
export type RecommendationType =
  (typeof RecommendationType)[keyof typeof RecommendationType];

export const RecommendationStatus = {
  PROPOSED: "PROPOSED",
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  APPLIED: "APPLIED",
  REJECTED: "REJECTED",
  DISMISSED: "DISMISSED",
} as const;
export type RecommendationStatus =
  (typeof RecommendationStatus)[keyof typeof RecommendationStatus];
