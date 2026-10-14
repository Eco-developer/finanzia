import { ToolCallExecution } from "../ai/dtos/chat.dto";

export interface AdvisorExecutionResult {
  content: string;
  toolExecutions: ToolCallExecution[];
}

export interface CategorizeMovementInput {
  rowId: string;
  description: string;
  amountCents?: number;
}

export interface CategorizeMovementOutput {
  rowId: string;
  suggestedCategoryId: string | null;
  suggestedCategoryName: string | null;
}

export interface CategoryOption {
  id: string;
  name: string;
}

export interface IAiAdvisorPort {
  executeChat(
    userId: string,
    userMessage: string,
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  ): Promise<AdvisorExecutionResult>;

  categorizeMovements?(
    categories: CategoryOption[],
    movements: CategorizeMovementInput[],
  ): Promise<CategorizeMovementOutput[]>;
}

export const AI_ADVISOR_PORT = Symbol("IAiAdvisorPort");
