import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
} from "@nestjs/common";
import {
  IAiRecommendationRepository,
  AI_RECOMMENDATION_REPOSITORY,
} from "../../domain/repositories/ai-recommendation.repository.interface";

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    @Inject(AI_RECOMMENDATION_REPOSITORY)
    private readonly recRepo: IAiRecommendationRepository,
  ) {}

  /**
   * Obtiene todas las recomendaciones pendientes de aprobación humana
   */
  async getPendingRecommendations(userId: string) {
    const recs = await this.recRepo.findPending(userId);

    return recs.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      details: r.details,
      proposedAction: r.proposedAction,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /**
   * Aplica atómicamente la recomendación aprobada por el usuario
   */
  async applyRecommendation(userId: string, id: string) {
    const rec = await this.recRepo.findById(id);

    if (!rec) {
      throw new NotFoundException("La recomendación no existe.");
    }
    if (rec.userId !== userId) {
      throw new ForbiddenException(
        "No tienes permiso sobre esta recomendación.",
      );
    }
    if (rec.status !== "PROPOSED") {
      throw new BadRequestException(
        `Esta recomendación ya fue procesada (estado actual: ${rec.status}).`,
      );
    }

    const payload = (rec.proposedAction as Record<string, any>) || {};

    await this.recRepo.applyAction(userId, payload.actionType, payload);
    await this.recRepo.updateStatus(id, "ACCEPTED");

    return {
      applied: true,
      id,
      status: "ACCEPTED",
      message: `Recomendación "${rec.title}" aplicada con éxito.`,
    };
  }

  /**
   * Rechaza/descarta una recomendación sin alterar datos
   */
  async rejectRecommendation(userId: string, id: string) {
    const rec = await this.recRepo.findById(id);

    if (!rec) {
      throw new NotFoundException("La recomendación no existe.");
    }
    if (rec.userId !== userId) {
      throw new ForbiddenException(
        "No tienes permiso sobre esta recomendación.",
      );
    }
    if (rec.status !== "PROPOSED") {
      throw new BadRequestException(
        `Esta recomendación ya fue procesada (estado actual: ${rec.status}).`,
      );
    }

    await this.recRepo.updateStatus(id, "REJECTED");

    return {
      rejected: true,
      id,
      status: "REJECTED",
      message: `Recomendación "${rec.title}" descartada.`,
    };
  }
}
