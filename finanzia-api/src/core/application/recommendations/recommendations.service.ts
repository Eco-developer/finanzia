import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { RecommendationStatus } from "@prisma/client";

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene todas las recomendaciones pendientes de aprobación humana
   */
  async getPendingRecommendations(userId: string) {
    const recs = await this.prisma.aiRecommendation.findMany({
      where: {
        userId,
        status: RecommendationStatus.PROPOSED,
      },
      orderBy: { createdAt: "desc" },
    });

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
    const rec = await this.prisma.aiRecommendation.findUnique({
      where: { id },
    });

    if (!rec) {
      throw new NotFoundException("La recomendación no existe.");
    }
    if (rec.userId !== userId) {
      throw new ForbiddenException("No tienes permiso sobre esta recomendación.");
    }
    if (rec.status !== RecommendationStatus.PROPOSED) {
      throw new BadRequestException(`Esta recomendación ya fue procesada (estado actual: ${rec.status}).`);
    }

    const payload = (rec.proposedAction as Record<string, any>) || {};

    // Ejecución de la acción según el tipo
    await this.prisma.$transaction(async (tx) => {
      if (payload.actionType === "UPDATE_BUDGET_LIMIT" && payload.budgetId && payload.newLimitCents) {
        this.logger.log(`Actualizando límite de presupuesto ${payload.budgetId} a ${payload.newLimitCents} céntimos`);
        await tx.budget.update({
          where: { id: payload.budgetId },
          data: { amountLimitCents: BigInt(payload.newLimitCents) },
        });
      } else if (payload.actionType === "SAVINGS_CONTRIBUTION" && payload.amountCents) {
        this.logger.log(`Registrando aporte extraordinario de ${payload.amountCents} céntimos a meta de ahorro`);
        // Buscar la meta indicada o la primera activa
        let goal = null;
        if (payload.goalId) {
          goal = await tx.savingsGoal.findUnique({ where: { id: payload.goalId } });
        } else {
          goal = await tx.savingsGoal.findFirst({
            where: { userId, isCompleted: false },
            orderBy: { createdAt: "asc" },
          });
        }

        if (goal) {
          const newCurrent = BigInt(goal.currentAmountCents) + BigInt(payload.amountCents);
          const isCompleted = newCurrent >= BigInt(goal.targetAmountCents);
          await tx.savingsGoal.update({
            where: { id: goal.id },
            data: {
              currentAmountCents: newCurrent,
              isCompleted,
            },
          });
        }
      }

      // Marcar recomendación como aceptada
      await tx.aiRecommendation.update({
        where: { id },
        data: {
          status: RecommendationStatus.ACCEPTED,
          reviewedAt: new Date(),
        },
      });
    });

    return {
      applied: true,
      id,
      status: RecommendationStatus.ACCEPTED,
      message: `Recomendación "${rec.title}" aplicada con éxito.`,
    };
  }

  /**
   * Rechaza/descarta una recomendación sin alterar datos
   */
  async rejectRecommendation(userId: string, id: string) {
    const rec = await this.prisma.aiRecommendation.findUnique({
      where: { id },
    });

    if (!rec) {
      throw new NotFoundException("La recomendación no existe.");
    }
    if (rec.userId !== userId) {
      throw new ForbiddenException("No tienes permiso sobre esta recomendación.");
    }
    if (rec.status !== RecommendationStatus.PROPOSED) {
      throw new BadRequestException(`Esta recomendación ya fue procesada (estado actual: ${rec.status}).`);
    }

    await this.prisma.aiRecommendation.update({
      where: { id },
      data: {
        status: RecommendationStatus.REJECTED,
        reviewedAt: new Date(),
      },
    });

    return {
      rejected: true,
      id,
      status: RecommendationStatus.REJECTED,
      message: `Recomendación "${rec.title}" descartada.`,
    };
  }
}
