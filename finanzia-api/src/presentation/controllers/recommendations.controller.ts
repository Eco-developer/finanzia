import {
  Controller,
  Post,
  Get,
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
import { RecommendationsService } from "../../core/application/recommendations/recommendations.service";
import { JwtAuthGuard } from "../../infrastructure/security/guards/jwt-auth.guard";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../decorators/current-user.decorator";

@ApiTags("Recommendations")
@ApiBearerAuth()
@ApiCookieAuth("jwt_token")
@UseGuards(JwtAuthGuard)
@Controller("recommendations")
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get("pending")
  @ApiOperation({
    summary:
      "Listar recomendaciones activas generadas por la IA esperando aprobación humana",
    description:
      "Devuelve las recomendaciones en estado PROPOSED creadas por el asesor para revisión y decisión del usuario.",
  })
  @ApiResponse({
    status: 200,
    description: "Lista de recomendaciones pendientes",
  })
  async getPending(@CurrentUser() user: AuthenticatedUser) {
    const recommendations =
      await this.recommendationsService.getPendingRecommendations(user.id);
    return {
      success: true,
      data: recommendations,
    };
  }

  @Post(":id/apply")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Aprobar y aplicar una recomendación propuesta (Human-in-the-Loop)",
    description:
      "Ejecuta de forma atómica la acción propuesta por la IA (ej. actualizar límite de presupuesto o aportar a una meta) tras el clic voluntario del usuario.",
  })
  @ApiParam({ name: "id", description: "ID de la recomendación (UUID)" })
  @ApiResponse({
    status: 200,
    description: "Recomendación aprobada y ejecutada exitosamente",
  })
  async apply(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const result = await this.recommendationsService.applyRecommendation(
      user.id,
      id,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post(":id/reject")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Rechazar/descartar una recomendación propuesta",
    description:
      "Marca la recomendación como REJECTED sin realizar ninguna modificación en los datos del usuario.",
  })
  @ApiParam({ name: "id", description: "ID de la recomendación (UUID)" })
  @ApiResponse({
    status: 200,
    description: "Recomendación descartada",
  })
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const result = await this.recommendationsService.rejectRecommendation(
      user.id,
      id,
    );
    return {
      success: true,
      data: result,
    };
  }
}
