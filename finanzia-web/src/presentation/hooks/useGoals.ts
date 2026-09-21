import {
  goalsApi,
  GoalItem,
  CreateGoalDto,
  ContributeGoalDto,
} from '@/infrastructure/api/goals.api';

export type { GoalItem, CreateGoalDto, ContributeGoalDto };

export function useGoals() {
  const createGoal = async (dto: CreateGoalDto) => {
    return await goalsApi.createGoal(dto);
  };

  const getGoals = async () => {
    return await goalsApi.getGoals();
  };

  const contributeToGoal = async (id: string, dto: ContributeGoalDto) => {
    return await goalsApi.contributeToGoal(id, dto);
  };

  const updateGoal = async (id: string, dto: Parameters<typeof goalsApi.updateGoal>[1]) => {
    return await goalsApi.updateGoal(id, dto);
  };

  const deleteGoal = async (id: string) => {
    return await goalsApi.deleteGoal(id);
  };

  return {
    createGoal,
    getGoals,
    contributeToGoal,
    updateGoal,
    deleteGoal,
  };
}
