import { Injectable, NotFoundException, Logger, Inject } from "@nestjs/common";
import {
  IAdvisorHistoryRepository,
  ADVISOR_HISTORY_REPOSITORY,
} from "../../domain/repositories/advisor-history.repository.interface";
import { IAiAdvisorPort, AI_ADVISOR_PORT } from "../ports/ai-advisor.port";
import { SendChatMessageDto, ChatMessageResponseDto } from "./dtos/chat.dto";

@Injectable()
export class AiAdvisorService {
  private readonly logger = new Logger(AiAdvisorService.name);

  constructor(
    @Inject(ADVISOR_HISTORY_REPOSITORY)
    private readonly historyRepo: IAdvisorHistoryRepository,
    @Inject(AI_ADVISOR_PORT)
    private readonly advisorPort: IAiAdvisorPort,
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
      const messages = await this.historyRepo.getConversationMessages(
        userId,
        conversationId,
      );
      if (!messages) {
        throw new NotFoundException("La conversación especificada no existe.");
      }
    } else {
      const title =
        dto.message.trim().length > 45
          ? `${dto.message.trim().slice(0, 42)}...`
          : dto.message.trim();
      const newConv = await this.historyRepo.createConversation(userId, title);
      conversationId = newConv.id;
    }

    // 1. Guardar mensaje del usuario
    await this.historyRepo.saveMessage({
      conversationId: conversationId!,
      role: "USER",
      content: dto.message.trim(),
    });

    // 2. Recuperar historial reciente
    const recentMessages = await this.historyRepo.getConversationMessages(
      userId,
      conversationId!,
    );
    const history = recentMessages.slice(-10).map((m) => ({
      role: m.role.toLowerCase() as "user" | "assistant",
      content: m.content,
    }));

    // 3. Ejecutar asesor con herramientas deterministas
    const advisorResult = await this.advisorPort.executeChat(
      userId,
      dto.message.trim(),
      history,
    );

    // 4. Guardar respuesta del asistente con trazabilidad de herramientas
    const assistantMessage = await this.historyRepo.saveMessage({
      conversationId: conversationId!,
      role: "ASSISTANT",
      content: advisorResult.content,
      toolCalls: advisorResult.toolExecutions,
    });

    return {
      conversationId: conversationId!,
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
    const convs = await this.historyRepo.getUserConversations(userId);

    return convs.map((c) => ({
      id: c.id,
      title: c.title,
      messageCount: c._count?.messages ?? 0,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  /**
   * Obtiene los mensajes de una conversación
   */
  async getConversationMessages(userId: string, conversationId: string) {
    const messages = await this.historyRepo.getConversationMessages(
      userId,
      conversationId,
    );

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
    await this.historyRepo.deleteConversation(userId, conversationId);
    return { deleted: true, conversationId };
  }
}
