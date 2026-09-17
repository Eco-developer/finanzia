import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class SendChatMessageDto {
  @ApiPropertyOptional({
    description: "ID de la conversación existente. Si se omite, se creará una nueva.",
    example: "a0000000-0000-0000-0000-000000000001",
  })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiProperty({
    description: "Mensaje o consulta del usuario para el asesor financiero",
    example: "¿Cuánto he gastado este mes en restaurantes y cómo va mi presupuesto?",
  })
  @IsNotEmpty({ message: "El mensaje no puede estar vacío" })
  @IsString()
  @MaxLength(2000, { message: "El mensaje no puede superar los 2000 caracteres" })
  message: string;
}

export interface ToolCallExecution {
  toolName: string;
  args: Record<string, any>;
  result: Record<string, any>;
}

export class ChatMessageResponseDto {
  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  messageId: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ type: [Object], description: "Herramientas backend ejecutadas para verificar los datos" })
  toolExecutions: ToolCallExecution[];

  @ApiProperty()
  createdAt: string;
}
