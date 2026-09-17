import { Injectable, NotFoundException, ForbiddenException, Logger } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { GeminiAdvisorService } from "../../../infrastructure/ai/gemini-advisor.service";
import { SendChatMessageDto, ChatMessageResponseDto } from "./dtos/chat.dto";
import { AiRole } from "@prisma/client";

@Injectable()
export class AiAdvisorService {
  private readonly logger = new Logger(AiAdvisorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiAdvisorService: GeminiAdvisorService,
  ) {}

  /**
   * Envía un mensaje al asesor, ejecuta las herramientas necesarias y persiste la conversación.
   */
  async sendMessage(
    userId: string,
    dto: SendChatMessageDto,
  ): Promise<ChatMessageResponseDto> {
    let conversationId = dto.conversationId;

    if (conversationId) {
      const conv = await this.prisma.aiConversation.findUnique({
        where: { id: conversationId },
      });
      if (!conv) {
        throw new NotFoundException("La conversación especificada no existe.");
      }
      if (conv.userId !== userId) {
        throw new ForbiddenException("No tienes acceso a esta conversación.");
      }
    } else {
      const title =
        dto.message.trim().length > 45
          ? `${dto.message.trim().slice(0, 42)}...`
          : dto.message.trim();
      const newConv = await this.prisma.aiConversation.create({
        data: {
          userId,
          title,
        },
      });
      conversationId = newConv.id;
    }

    // 1. Guardar mensaje del usuario
    await this.prisma.aiMessage.create({
      data: {
        conversationId,
        role: AiRole.USER,
        content: dto.message.trim(),
      },
    });

    // 2. Recuperar historial reciente
    const recentMessages = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    const history = recentMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 3. Ejecutar asesor con herramientas deterministas
    const advisorResult = await this.geminiAdvisorService.executeChat(
      userId,
      dto.message.trim(),
      history,
    );

    // 4. Guardar respuesta del asistente con trazabilidad de herramientas
    const assistantMessage = await this.prisma.aiMessage.create({
      data: {
        conversationId,
        role: AiRole.ASSISTANT,
        content: advisorResult.content,
        toolCalls: advisorResult.toolExecutions as any,
        toolResults: advisorResult.toolExecutions.map((t) => t.result) as any,
      },
    });

    // Actualizar timestamp de la conversación
    await this.prisma.aiConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return {
      conversationId,
      messageId: assistantMessage.id,
      content: assistantMessage.content,
      toolExecutions: advisorResult.toolExecutions,
      createdAt: assistantMessage.createdAt.toISOString(),
    };
  }

  /**
   * Obtiene la lista de conversaciones del usuario
   */
  async getConversations(userId: string) {
    const convs = await this.prisma.aiConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    return convs.map((c) => ({
      id: c.id,
      title: c.title,
      messageCount: c._count.messages,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  /**
   * Obtiene los mensajes de una conversación
   */
  async getConversationMessages(userId: string, conversationId: string) {
    const conv = await this.prisma.aiConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conv) {
      throw new NotFoundException("La conversación no existe.");
    }
    if (conv.userId !== userId) {
      throw new ForbiddenException("No tienes permiso para acceder a esta conversación.");
    }

    const messages = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    return messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      role: m.role,
      content: m.content,
      toolCalls: m.toolCalls,
      toolResults: m.toolResults,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  /**
   * Elimina una conversación
   */
  async deleteConversation(userId: string, conversationId: string) {
    const conv = await this.prisma.aiConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conv) {
      throw new NotFoundException("La conversación no existe.");
    }
    if (conv.userId !== userId) {
      throw new ForbiddenException("No tienes permiso para eliminar esta conversación.");
    }

    await this.prisma.aiConversation.delete({
      where: { id: conversationId },
    });

    return { deleted: true, conversationId };
  }
}
