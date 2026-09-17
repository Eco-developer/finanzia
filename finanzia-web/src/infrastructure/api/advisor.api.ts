import { apiClient } from './api-client';

export interface ToolCallExecution {
  toolName: string;
  args: Record<string, any>;
  result: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
  content: string;
  toolCalls?: ToolCallExecution[] | null;
  toolResults?: any[] | null;
  createdAt: string;
}

export interface ConversationItem {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageResponse {
  conversationId: string;
  messageId: string;
  content: string;
  toolExecutions: ToolCallExecution[];
  createdAt: string;
}

export const advisorApi = {
  async sendMessage(message: string, conversationId?: string): Promise<SendMessageResponse> {
    const res = await apiClient<SendMessageResponse>('advisor/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversationId }),
    });
    return res.data;
  },

  async getConversations(): Promise<ConversationItem[]> {
    const res = await apiClient<ConversationItem[]>('advisor/conversations');
    return res.data;
  },

  async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    const res = await apiClient<ChatMessage[]>(`advisor/conversations/${conversationId}/messages`);
    return res.data;
  },

  async deleteConversation(conversationId: string): Promise<void> {
    await apiClient(`advisor/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  },
};
