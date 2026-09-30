import { useCallback } from 'react';
import {
  debtsApi,
  type DebtItem,
  type DebtAmortizationItem,
  type DebtsSummary,
  type ActiveDebtsResponse,
  type CreateDebtDto,
  type UpdateDebtDto,
  type AmortizeDebtDto,
  type SimulatePayoffDto,
  type DebtPayoffPlanResult,
  type AmortizeDebtResult,
  type InterestRateType,
  type DebtStatus,
  type DebtPayoffStrategy,
} from '@/infrastructure/api/debts.api';

export type {
  DebtItem,
  DebtAmortizationItem,
  DebtsSummary,
  ActiveDebtsResponse,
  CreateDebtDto,
  UpdateDebtDto,
  AmortizeDebtDto,
  SimulatePayoffDto,
  DebtPayoffPlanResult,
  AmortizeDebtResult,
  InterestRateType,
  DebtStatus,
  DebtPayoffStrategy,
};

export function useDebts() {
  const getActiveDebts = useCallback(async () => {
    return await debtsApi.getActiveDebts();
  }, []);

  const getDebtHistory = useCallback(async () => {
    return await debtsApi.getDebtHistory();
  }, []);

  const getDebtById = useCallback(async (id: string) => {
    return await debtsApi.getDebtById(id);
  }, []);

  const createDebt = useCallback(async (dto: CreateDebtDto) => {
    return await debtsApi.createDebt(dto);
  }, []);

  const updateDebt = useCallback(async (id: string, dto: UpdateDebtDto) => {
    return await debtsApi.updateDebt(id, dto);
  }, []);

  const deleteDebt = useCallback(async (id: string) => {
    return await debtsApi.deleteDebt(id);
  }, []);

  const amortizeDebt = useCallback(async (id: string, dto: AmortizeDebtDto) => {
    return await debtsApi.amortizeDebt(id, dto);
  }, []);

  const simulatePayoff = useCallback(async (dto: SimulatePayoffDto) => {
    return await debtsApi.simulatePayoff(dto);
  }, []);

  return {
    getActiveDebts,
    getDebtHistory,
    getDebtById,
    createDebt,
    updateDebt,
    deleteDebt,
    amortizeDebt,
    simulatePayoff,
  };
}
