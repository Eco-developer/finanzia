import { Test, TestingModule } from "@nestjs/testing";
import { RecommendationsService } from "../../src/core/application/recommendations/recommendations.service";
import { PrismaService } from "../../src/infrastructure/database/prisma.service";
import { RecommendationStatus, RecommendationType } from "@prisma/client";
import { ForbiddenException, NotFoundException } from "@nestjs/common";

describe("RecommendationsService (Human-in-the-Loop)", () => {
  let service: RecommendationsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      aiRecommendation: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      budget: {
        update: jest.fn(),
      },
      savingsGoal: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
  });

  describe("getPendingRecommendations", () => {
    it("debe listar únicamente las recomendaciones con estado PROPOSED", async () => {
      prisma.aiRecommendation.findMany.mockResolvedValue([
        {
          id: "rec-1",
          type: RecommendationType.BUDGET_ADJUSTMENT,
          title: "Ajuste de ocio",
          details: "Detalles",
          proposedAction: { actionType: "UPDATE_BUDGET_LIMIT" },
          status: RecommendationStatus.PROPOSED,
          createdAt: new Date(),
        },
      ]);

      const result = await service.getPendingRecommendations("user-1");

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("rec-1");
      expect(result[0].status).toBe(RecommendationStatus.PROPOSED);
      expect(prisma.aiRecommendation.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1", status: RecommendationStatus.PROPOSED },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("applyRecommendation", () => {
    it("debe aplicar atómicamente el ajuste de presupuesto y marcar ACCEPTED", async () => {
      prisma.aiRecommendation.findUnique.mockResolvedValue({
        id: "rec-1",
        userId: "user-1",
        title: "Ajustar Ocio",
        status: RecommendationStatus.PROPOSED,
        proposedAction: {
          actionType: "UPDATE_BUDGET_LIMIT",
          budgetId: "bgt-123",
          newLimitCents: 25000,
        },
      });

      const result = await service.applyRecommendation("user-1", "rec-1");

      expect(result.applied).toBe(true);
      expect(result.status).toBe(RecommendationStatus.ACCEPTED);
      expect(prisma.budget.update).toHaveBeenCalledWith({
        where: { id: "bgt-123" },
        data: { amountLimitCents: BigInt(25000) },
      });
      expect(prisma.aiRecommendation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "rec-1" },
          data: expect.objectContaining({ status: RecommendationStatus.ACCEPTED }),
        }),
      );
    });

    it("debe lanzar ForbiddenException si el usuario no es el propietario", async () => {
      prisma.aiRecommendation.findUnique.mockResolvedValue({
        id: "rec-1",
        userId: "otro-usuario",
        status: RecommendationStatus.PROPOSED,
      });

      await expect(service.applyRecommendation("user-1", "rec-1")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("debe lanzar NotFoundException si no existe la recomendación", async () => {
      prisma.aiRecommendation.findUnique.mockResolvedValue(null);

      await expect(service.applyRecommendation("user-1", "rec-inexistente")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("rejectRecommendation", () => {
    it("debe marcar la recomendación como REJECTED sin modificar entidades", async () => {
      prisma.aiRecommendation.findUnique.mockResolvedValue({
        id: "rec-1",
        userId: "user-1",
        title: "Sugerencia",
        status: RecommendationStatus.PROPOSED,
      });

      const result = await service.rejectRecommendation("user-1", "rec-1");

      expect(result.rejected).toBe(true);
      expect(result.status).toBe(RecommendationStatus.REJECTED);
      expect(prisma.budget.update).not.toHaveBeenCalled();
      expect(prisma.savingsGoal.update).not.toHaveBeenCalled();
      expect(prisma.aiRecommendation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "rec-1" },
          data: expect.objectContaining({ status: RecommendationStatus.REJECTED }),
        }),
      );
    });
  });
});
