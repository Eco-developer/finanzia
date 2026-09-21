import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiParam,
} from "@nestjs/swagger";
import { AiAdvisorService } from "../../core/application/ai/ai-advisor.service";
import {
  SendChatMessageDto,
  ChatMessageResponseDto,
} from "../../core/application/ai/dtos/chat.dto";
import { JwtAuthGuard } from "../../infrastructure/security/guards/jwt-auth.guard";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../decorators/current-user.decorator";

@ApiTags("Advisor")
@ApiBearerAuth()
@ApiCookieAuth("jwt_token")
@UseGuards(JwtAuthGuard)
@Controller("advisor")
export class AdvisorController {
  constructor(private readonly advisorService: AiAdvisorService) {}

  @Post("chat")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Enviar consulta al Asistente FinanZIA AI (Principio de Cero Alucinaciones)",
    description:
      "Recibe una consulta financiera, ejecuta herramientas deterministas de backend si es necesario y devuelve la respuesta verificada con el desglose de herramientas utilizadas.",
  })
  @ApiResponse({
    status: 200,
    description:
      "Respuesta generada por el asesor financiero con trazabilidad de datos verificados",
    type: ChatMessageResponseDto,
  })
  async chat(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendChatMessageDto,
  ) {
    const response = await this.advisorService.sendMessage(user.id, dto);
    return {
      success: true,
      data: response,
    };
  }

  @Get("conversations")
  @ApiOperation({
    summary: "Listar sesiones de conversación del usuario con el asesor",
  })
  @ApiResponse({
    status: 200,
    description:
      "Lista de conversaciones ordenadas por fecha de actualización reciente",
  })
  async getConversations(@CurrentUser() user: AuthenticatedUser) {
    const conversations = await this.advisorService.getConversations(user.id);
    return {
      success: true,
      data: conversations,
    };
  }

  @Get("conversations/:id/messages")
  @ApiOperation({
    summary: "Obtener el historial de mensajes de una conversación específica",
  })
  @ApiParam({ name: "id", description: "ID de la conversación (UUID)" })
  async getConversationMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const messages = await this.advisorService.getConversationMessages(
      user.id,
      id,
    );
    return {
      success: true,
      data: messages,
    };
  }

  @Delete("conversations/:id")
  @ApiOperation({
    summary: "Eliminar una sesión de conversación",
  })
  @ApiParam({
    name: "id",
    description: "ID de la conversación a eliminar (UUID)",
  })
  async deleteConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const result = await this.advisorService.deleteConversation(user.id, id);
    return {
      success: true,
      data: result,
    };
  }
}
