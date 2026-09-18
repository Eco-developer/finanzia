import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { IAdvisorHistoryRepository } from "../../../core/domain/repositories/advisor-history.repository.interface";
import { AiRole } from "@prisma/client";

@Injectable()
export class PrismaAdvisorHistoryRepository implements IAdvisorHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getUserConversations(userId: string): Promise<any[]> {
    return await this.prisma.aiConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { messages: true } },
      },
    });
  }

  async getConversationMessages(userId: string, conversationId: string): Promise<any[]> {
    return await this.prisma.aiMessage.findMany({
      where: {
        conversationId,
        conversation: { userId },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async createConversation(userId: string, title?: string): Promise<any> {
    return await this.prisma.aiConversation.create({
      data: {
        userId,
        title: title || "Nueva conversación",
      },
    });
  }

  async saveMessage(data: {
    conversationId: string;
    role: "USER" | "ASSISTANT" | "SYSTEM";
    content: string;
    toolCalls?: any;
  }): Promise<any> {
    return await this.prisma.aiMessage.create({
      data: {
        conversationId: data.conversationId,
        role: data.role as AiRole,
        content: data.content,
        toolCalls: data.toolCalls || null,
      },
    });
  }

  async deleteConversation(userId: string, conversationId: string): Promise<void> {
    await this.prisma.aiConversation.deleteMany({
      where: { id: conversationId, userId },
    });
  }

  async findConversationById(id: string): Promise<any | null> {
    return await this.prisma.aiConversation.findUnique({
      where: { id },
    });
  }

  async getRecentMessages(conversationId: string, limit = 10): Promise<any[]> {
    return await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }
}
