import { ToolCallExecution } from "../ai/dtos/chat.dto";

export interface AdvisorExecutionResult {
  content: string;
  toolExecutions: ToolCallExecution[];
}

export interface IAiAdvisorPort {
  executeChat(
    userId: string,
    userMessage: string,
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  ): Promise<AdvisorExecutionResult>;
}

export const AI_ADVISOR_PORT = Symbol("IAiAdvisorPort");
