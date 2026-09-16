import { SavingsGoalEntity } from "../entities/savings-goal.entity";

export interface CreateSavingsGoalData {
  userId: string;
  name: string;
  targetAmountCents: bigint;
  currentAmountCents?: bigint;
  targetDate?: Date | null;
}

export interface UpdateSavingsGoalData {
  name?: string;
  targetAmountCents?: bigint;
  targetDate?: Date | null;
  isCompleted?: boolean;
}

export interface ISavingsGoalRepository {
  create(data: CreateSavingsGoalData): Promise<SavingsGoalEntity>;
  findById(id: string): Promise<SavingsGoalEntity | null>;
  findAllByUserId(userId: string): Promise<SavingsGoalEntity[]>;
  update(id: string, data: UpdateSavingsGoalData): Promise<SavingsGoalEntity>;
  addContribution(id: string, amountCents: bigint): Promise<SavingsGoalEntity>;
  delete(id: string): Promise<void>;
}

export const SAVINGS_GOAL_REPOSITORY = Symbol("ISavingsGoalRepository");
