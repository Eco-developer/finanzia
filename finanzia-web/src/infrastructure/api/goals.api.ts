import { apiClient } from './api-client';

export interface GoalItem {
  id: string;
  name: string;
  targetAmountCents: number;
  currentAmountCents: number;
  remainingCents: number;
  progressPercentage: number;
  targetDate: string | null;
  daysRemaining: number | null;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalDto {
  name: string;
  targetAmountCents: number;
  currentAmountCents?: number;
  targetDate?: string;
}

export interface UpdateGoalDto {
  name?: string;
  targetAmountCents?: number;
  targetDate?: string;
  isCompleted?: boolean;
}

export interface ContributeGoalDto {
  amountCents: number;
}

export const goalsApi = {
  async getGoals(): Promise<GoalItem[]> {
    const res = await apiClient<GoalItem[]>('/goals');
    return res.data;
  },

  async getGoalById(id: string): Promise<GoalItem> {
    const res = await apiClient<GoalItem>(`/goals/${id}`);
    return res.data;
  },

  async createGoal(dto: CreateGoalDto): Promise<GoalItem> {
    const res = await apiClient<GoalItem>('/goals', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return res.data;
  },

  async updateGoal(id: string, dto: UpdateGoalDto): Promise<GoalItem> {
    const res = await apiClient<GoalItem>(`/goals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
    return res.data;
  },

  async contributeToGoal(id: string, dto: ContributeGoalDto): Promise<GoalItem> {
    const res = await apiClient<GoalItem>(`/goals/${id}/contribute`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return res.data;
  },

  async deleteGoal(id: string): Promise<void> {
    await apiClient(`/goals/${id}`, {
      method: 'DELETE',
    });
  },
};
