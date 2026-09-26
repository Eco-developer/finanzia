import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { RecommendationStatus as PrismaRecommendationStatus } from "@prisma/client";
import {
  IAiRecommendationRepository,
  AiRecommendationRecord,
} from "../../../core/domain/repositories/ai-recommendation.repository.interface";
import {
  RecommendationStatus,
  RecommendationType,
} from "../../../core/domain/types/financial.types";

@Injectable()
export class PrismaAiRecommendationRepository implements IAiRecommendationRepository {
  private readonly logger = new Logger(PrismaAiRecommendationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findPending(userId: string): Promise<AiRecommendationRecord[]> {
    const recs = await this.prisma.aiRecommendation.findMany({
      where: {
        userId,
        status: PrismaRecommendationStatus.PROPOSED,
      },
      orderBy: { createdAt: "desc" },
    });

    return recs.map((r) => ({
      id: r.id,
      userId: r.userId,
      type: r.type as RecommendationType,
      title: r.title,
      details: r.details,
      proposedAction: (r.proposedAction as Record<string, any>) || {},
      status: r.status as RecommendationStatus,
      createdAt: r.createdAt,
      updatedAt: r.createdAt,
    }));
  }

  async findById(id: string): Promise<AiRecommendationRecord | null> {
    const r = await this.prisma.aiRecommendation.findUnique({
      where: { id },
    });
    if (!r) return null;

    return {
      id: r.id,
      userId: r.userId,
      type: r.type as RecommendationType,
      title: r.title,
      details: r.details,
      proposedAction: (r.proposedAction as Record<string, any>) || {},
      status: r.status as RecommendationStatus,
      createdAt: r.createdAt,
      updatedAt: r.createdAt,
    };
  }

  async create(data: {
    userId: string;
    type: RecommendationType;
    title: string;
    details: string;
    proposedAction: Record<string, any>;
  }): Promise<AiRecommendationRecord> {
    const r = await this.prisma.aiRecommendation.create({
      data: {
        userId: data.userId,
        type: data.type as any,
        title: data.title,
        details: data.details,
        proposedAction: data.proposedAction,
        status: PrismaRecommendationStatus.PROPOSED,
      },
    });

    return {
      id: r.id,
      userId: r.userId,
      type: r.type as RecommendationType,
      title: r.title,
      details: r.details,
      proposedAction: (r.proposedAction as Record<string, any>) || {},
      status: r.status as RecommendationStatus,
      createdAt: r.createdAt,
      updatedAt: r.createdAt,
    };
  }

  async updateStatus(
    id: string,
    status: RecommendationStatus,
  ): Promise<AiRecommendationRecord> {
    const r = await this.prisma.aiRecommendation.update({
      where: { id },
      data: {
        status: status as any,
        reviewedAt: new Date(),
      },
    });

    return {
      id: r.id,
      userId: r.userId,
      type: r.type as RecommendationType,
      title: r.title,
      details: r.details,
      proposedAction: (r.proposedAction as Record<string, any>) || {},
      status: r.status as RecommendationStatus,
      createdAt: r.createdAt,
      updatedAt: r.createdAt,
    };
  }

  async applyAction(
    userId: string,
    actionType: string,
    payload: Record<string, any>,
  ): Promise<any> {
    return await this.prisma.$transaction(async (tx) => {
      if (
        (actionType === "UPDATE_BUDGET_LIMIT" ||
          actionType === "UPDATE_BUDGET") &&
        payload.budgetId &&
        payload.newLimitCents
      ) {
        this.logger.log(
          `Actualizando límite de presupuesto ${payload.budgetId} a ${payload.newLimitCents} céntimos`,
        );
        const updateData: any = {
          amountLimitCents: BigInt(payload.newLimitCents),
        };
        if (payload.alertThresholdPct !== undefined) {
          updateData.alertThresholdPct = payload.alertThresholdPct;
        }
        await tx.budget.update({
          where: { id: payload.budgetId },
          data: updateData,
        });
      } else if (actionType === "DELETE_BUDGET" && payload.budgetId) {
        this.logger.log(`Eliminando presupuesto ${payload.budgetId}`);
        await tx.budget.delete({
          where: { id: payload.budgetId },
        });
      } else if (actionType === "UPDATE_TRANSACTION" && payload.transactionId) {
        this.logger.log(
          `Actualizando transacción ${payload.transactionId} para usuario ${userId}`,
        );
        const existingTx = await tx.transaction.findFirst({
          where: { id: payload.transactionId, userId },
        });
        if (existingTx) {
          const updatePayload: any = {};
          if (payload.description !== undefined) {
            updatePayload.description = payload.description;
          }
          if (payload.categoryId !== undefined) {
            updatePayload.categoryId = payload.categoryId;
          }
          if (payload.amountCents !== undefined) {
            const newAmountCents = BigInt(payload.amountCents);
            updatePayload.amountCents = newAmountCents;
            // Actualizar saldo de la cuenta
            const deltaCents = newAmountCents - existingTx.amountCents;
            await tx.account.update({
              where: { id: existingTx.accountId },
              data: {
                currentBalanceCents: {
                  increment: deltaCents,
                },
              },
            });
          }
          await tx.transaction.update({
            where: { id: existingTx.id },
            data: updatePayload,
          });
        }
      } else if (actionType === "DELETE_TRANSACTION" && payload.transactionId) {
        this.logger.log(
          `Eliminando transacción ${payload.transactionId} y revirtiendo saldo`,
        );
        const existingTx = await tx.transaction.findFirst({
          where: { id: payload.transactionId, userId },
        });
        if (existingTx) {
          // Revertir saldo de la cuenta
          await tx.account.update({
            where: { id: existingTx.accountId },
            data: {
              currentBalanceCents: {
                decrement: existingTx.amountCents,
              },
            },
          });
          // Si tenía contrapartida
          if (existingTx.transferCounterpartId) {
            const counterpart = await tx.transaction.findUnique({
              where: { id: existingTx.transferCounterpartId },
            });
            if (counterpart) {
              await tx.account.update({
                where: { id: counterpart.accountId },
                data: {
                  currentBalanceCents: {
                    decrement: counterpart.amountCents,
                  },
                },
              });
              await tx.transaction.delete({ where: { id: counterpart.id } });
            }
          }
          await tx.transaction.delete({ where: { id: existingTx.id } });
        }
      } else if (
        (actionType === "UPDATE_SAVINGS_GOAL" ||
          actionType === "UPDATE_GOAL") &&
        payload.goalId
      ) {
        this.logger.log(`Actualizando meta de ahorro ${payload.goalId}`);
        const updateData: any = {};
        if (payload.name) updateData.name = payload.name;
        if (payload.targetAmountCents !== undefined) {
          updateData.targetAmountCents = BigInt(payload.targetAmountCents);
        }
        if (payload.targetDate !== undefined) {
          updateData.targetDate = payload.targetDate
            ? new Date(payload.targetDate)
            : null;
        }
        await tx.savingsGoal.update({
          where: { id: payload.goalId },
          data: updateData,
        });
      } else if (
        (actionType === "DELETE_SAVINGS_GOAL" ||
          actionType === "DELETE_GOAL") &&
        payload.goalId
      ) {
        this.logger.log(`Eliminando meta de ahorro ${payload.goalId}`);
        await tx.savingsGoal.delete({
          where: { id: payload.goalId },
        });
      } else if (actionType === "SAVINGS_CONTRIBUTION" && payload.amountCents) {
        this.logger.log(
          `Registrando aporte extraordinario de ${payload.amountCents} céntimos a meta de ahorro`,
        );
        let goal = null;
        if (payload.goalId) {
          goal = await tx.savingsGoal.findUnique({
            where: { id: payload.goalId },
          });
        } else {
          goal = await tx.savingsGoal.findFirst({
            where: { userId, isCompleted: false },
            orderBy: { createdAt: "asc" },
          });
        }

        if (goal) {
          const newCurrent =
            BigInt(goal.currentAmountCents) + BigInt(payload.amountCents);
          const isCompleted = newCurrent >= BigInt(goal.targetAmountCents);
          await tx.savingsGoal.update({
            where: { id: goal.id },
            data: {
              currentAmountCents: newCurrent,
              isCompleted,
            },
          });
        }
      } else if (
        actionType === "CREATE_SAVINGS_GOAL" &&
        payload.targetAmountCents
      ) {
        this.logger.log(
          `Creando meta de ahorro "${payload.goalName}" de ${payload.targetAmountCents} céntimos`,
        );
        await tx.savingsGoal.create({
          data: {
            userId,
            name: payload.goalName || "Nueva Meta",
            targetAmountCents: BigInt(payload.targetAmountCents),
            currentAmountCents: BigInt(payload.initialAmountCents || 0),
            targetDate: payload.targetDate
              ? new Date(payload.targetDate)
              : null,
          },
        });
      } else if (
        actionType === "SAVE_CATEGORY_RULE" &&
        payload.pattern &&
        payload.categoryId
      ) {
        this.logger.log(
          `Guardando regla aprendida "${payload.pattern}" -> ${payload.categoryId}`,
        );
        await tx.userCategoryRule.upsert({
          where: { userId_pattern: { userId, pattern: payload.pattern } },
          create: {
            userId,
            pattern: payload.pattern,
            categoryId: payload.categoryId,
          },
          update: { categoryId: payload.categoryId },
        });
      }
    });
  }
}
