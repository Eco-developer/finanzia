import { Test, TestingModule } from "@nestjs/testing";
import { RecommendationsService } from "../../src/core/application/recommendations/recommendations.service";
import {
  IAiRecommendationRepository,
  AI_RECOMMENDATION_REPOSITORY,
} from "../../src/core/domain/repositories/ai-recommendation.repository.interface";
import {
  RecommendationStatus,
  RecommendationType,
} from "../../src/core/domain/types/financial.types";
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";

describe("RecommendationsService (Human-in-the-Loop)", () => {
  let service: RecommendationsService;
  let mockRecRepo: jest.Mocked<IAiRecommendationRepository>;

  beforeEach(async () => {
    mockRecRepo = {
      findPending: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      applyAction: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        {
          provide: AI_RECOMMENDATION_REPOSITORY,
          useValue: mockRecRepo,
        },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
  });

  describe("getPendingRecommendations", () => {
    it("debe listar únicamente las recomendaciones con estado PROPOSED", async () => {
      mockRecRepo.findPending.mockResolvedValue([
        {
          id: "rec-1",
          userId: "user-1",
          type: RecommendationType.BUDGET_ADJUSTMENT,
          title: "Ajuste de ocio",
          details: "Detalles",
          proposedAction: { actionType: "UPDATE_BUDGET_LIMIT" },
          status: RecommendationStatus.PROPOSED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getPendingRecommendations("user-1");

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("rec-1");
      expect(result[0].status).toBe(RecommendationStatus.PROPOSED);
      expect(mockRecRepo.findPending).toHaveBeenCalledWith("user-1");
    });
  });

  describe("applyRecommendation", () => {
    it("debe aplicar atómicamente la acción y marcar ACCEPTED", async () => {
      mockRecRepo.findById.mockResolvedValue({
        id: "rec-1",
        userId: "user-1",
        type: RecommendationType.BUDGET_ADJUSTMENT,
        title: "Ajustar Ocio",
        details: "Reducir presupuesto",
        status: RecommendationStatus.PROPOSED,
        proposedAction: {
          actionType: "UPDATE_BUDGET_LIMIT",
          budgetId: "bgt-123",
          newLimitCents: 25000,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.applyRecommendation("user-1", "rec-1");

      expect(result.applied).toBe(true);
      expect(result.status).toBe(RecommendationStatus.ACCEPTED);
      expect(mockRecRepo.applyAction).toHaveBeenCalledWith(
        "user-1",
        "UPDATE_BUDGET_LIMIT",
        {
          actionType: "UPDATE_BUDGET_LIMIT",
          budgetId: "bgt-123",
          newLimitCents: 25000,
        },
      );
      expect(mockRecRepo.updateStatus).toHaveBeenCalledWith(
        "rec-1",
        "ACCEPTED",
      );
    });

    it("debe lanzar ForbiddenException si el usuario no es el propietario", async () => {
      mockRecRepo.findById.mockResolvedValue({
        id: "rec-1",
        userId: "otro-usuario",
        type: RecommendationType.BUDGET_ADJUSTMENT,
        title: "Ajustar Ocio",
        details: "",
        status: RecommendationStatus.PROPOSED,
        proposedAction: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.applyRecommendation("user-1", "rec-1"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("debe lanzar NotFoundException si no existe la recomendación", async () => {
      mockRecRepo.findById.mockResolvedValue(null);

      await expect(
        service.applyRecommendation("user-1", "rec-inexistente"),
      ).rejects.toThrow(NotFoundException);
    });

    it("debe lanzar BadRequestException si la recomendación ya no está en estado PROPOSED", async () => {
      mockRecRepo.findById.mockResolvedValue({
        id: "rec-1",
        userId: "user-1",
        type: RecommendationType.BUDGET_ADJUSTMENT,
        title: "Ajustar Ocio",
        details: "",
        status: RecommendationStatus.ACCEPTED,
        proposedAction: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.applyRecommendation("user-1", "rec-1"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("rejectRecommendation", () => {
    it("debe marcar la recomendación como REJECTED sin aplicar acciones", async () => {
      mockRecRepo.findById.mockResolvedValue({
        id: "rec-1",
        userId: "user-1",
        type: RecommendationType.SAVINGS_OPPORTUNITY,
        title: "Sugerencia",
        details: "",
        status: RecommendationStatus.PROPOSED,
        proposedAction: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.rejectRecommendation("user-1", "rec-1");

      expect(result.rejected).toBe(true);
      expect(result.status).toBe(RecommendationStatus.REJECTED);
      expect(mockRecRepo.applyAction).not.toHaveBeenCalled();
      expect(mockRecRepo.updateStatus).toHaveBeenCalledWith(
        "rec-1",
        "REJECTED",
      );
    });

    it("debe lanzar ForbiddenException si el usuario no es el propietario al rechazar", async () => {
      mockRecRepo.findById.mockResolvedValue({
        id: "rec-1",
        userId: "otro-usuario",
        type: RecommendationType.SAVINGS_OPPORTUNITY,
        title: "Sugerencia",
        details: "",
        status: RecommendationStatus.PROPOSED,
        proposedAction: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.rejectRecommendation("user-1", "rec-1"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("debe lanzar NotFoundException si no existe la recomendación al rechazar", async () => {
      mockRecRepo.findById.mockResolvedValue(null);

      await expect(
        service.rejectRecommendation("user-1", "rec-inexistente"),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
