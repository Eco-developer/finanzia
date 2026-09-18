import {
  budgetsApi,
  BudgetPacingItem,
  BudgetPacingResponse,
  CreateBudgetDto,
  UpdateBudgetDto,
} from '@/infrastructure/api/budgets.api';

export type { BudgetPacingItem, BudgetPacingResponse, CreateBudgetDto, UpdateBudgetDto };

export function useBudgets() {
  const createBudget = async (dto: CreateBudgetDto) => {
    return await budgetsApi.createBudget(dto);
  };

  const getPacing = async (month: number, year: number) => {
    return await budgetsApi.getPacing(month, year);
  };

  const updateBudget = async (id: string, dto: UpdateBudgetDto) => {
    return await budgetsApi.updateBudget(id, dto);
  };

  const deleteBudget = async (id: string) => {
    return await budgetsApi.deleteBudget(id);
  };

  return {
    createBudget,
    getPacing,
    updateBudget,
    deleteBudget,
  };
}
