export interface IAdvisorHistoryRepository {
  getUserConversations(userId: string): Promise<any[]>;
  getConversationMessages(userId: string, conversationId: string): Promise<any[]>;
  createConversation(userId: string, title?: string): Promise<any>;
  saveMessage(data: {
    conversationId: string;
    role: "USER" | "ASSISTANT" | "SYSTEM";
    content: string;
    toolCalls?: any;
  }): Promise<any>;
  deleteConversation(userId: string, conversationId: string): Promise<void>;
}

export const ADVISOR_HISTORY_REPOSITORY = Symbol("IAdvisorHistoryRepository");
