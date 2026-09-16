import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { BudgetsService } from "../../src/core/application/budgets/budgets.service";
import { BudgetEntity } from "../../src/core/domain/entities/budget.entity";
import { CategoryEntity } from "../../src/core/domain/entities/category.entity";
import { CategoryType } from "@prisma/client";

describe("BudgetsService (Unit Tests)", () => {
  let budgetsService: BudgetsService;
  let mockBudgetRepository: any;
  let mockCategoryRepository: any;

  const mockCategory = new CategoryEntity(
    "cat-uuid-1",
    "user-1",
    null,
    "Alimentación",
    "shopping-cart",
    "#10B981",
    CategoryType.EXPENSE,
    false,
    new Date(),
    new Date(),
  );

  const mockOtherUserCategory = new CategoryEntity(
    "cat-uuid-other",
    "other-user",
    null,
    "Privado",
    null,
    null,
    CategoryType.EXPENSE,
    false,
    new Date(),
    new Date(),
  );

  const mockBudget = new BudgetEntity(
    "bgt-uuid-1",
    "user-1",
    "cat-uuid-1",
    30000n,
    9,
    2026,
    80,
    new Date(),
    new Date(),
    "Alimentación",
    "#10B981",
    "shopping-cart",
  );

  beforeEach(() => {
    mockBudgetRepository = {
      upsert: jest.fn(),
      findById: jest.fn(),
      findByUserCategoryPeriod: jest.fn(),
      findAllByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      calculatePacing: jest.fn(),
    };

    mockCategoryRepository = {
      findById: jest.fn(),
    };

    budgetsService = new BudgetsService(
      mockBudgetRepository,
      mockCategoryRepository,
    );
  });

  describe("createOrUpdateBudget", () => {
    it("debe crear o actualizar un presupuesto si la categoría es válida", async () => {
      mockCategoryRepository.findById.mockResolvedValue(mockCategory);
      mockBudgetRepository.upsert.mockResolvedValue(mockBudget);

      const result = await budgetsService.createOrUpdateBudget("user-1", {
        categoryId: "cat-uuid-1",
        amountLimitCents: 30000,
        periodMonth: 9,
        periodYear: 2026,
        alertThresholdPct: 80,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe("bgt-uuid-1");
      expect(result.amountLimitCents).toBe(30000);
      expect(mockBudgetRepository.upsert).toHaveBeenCalledWith({
        userId: "user-1",
        categoryId: "cat-uuid-1",
        amountLimitCents: 30000n,
        periodMonth: 9,
        periodYear: 2026,
        alertThresholdPct: 80,
      });
    });

    it("debe lanzar NotFoundException si la categoría no existe", async () => {
      mockCategoryRepository.findById.mockResolvedValue(null);

      await expect(
        budgetsService.createOrUpdateBudget("user-1", {
          categoryId: "cat-inexistente",
          amountLimitCents: 30000,
          periodMonth: 9,
          periodYear: 2026,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("debe lanzar ForbiddenException si la categoría pertenece a otro usuario", async () => {
      mockCategoryRepository.findById.mockResolvedValue(mockOtherUserCategory);

      await expect(
        budgetsService.createOrUpdateBudget("user-1", {
          categoryId: "cat-uuid-other",
          amountLimitCents: 30000,
          periodMonth: 9,
          periodYear: 2026,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("getBudgetPacing", () => {
    it("debe validar que el mes esté entre 1 y 12", async () => {
      await expect(
        budgetsService.getBudgetPacing("user-1", 13, 2026),
      ).rejects.toThrow(BadRequestException);
    });

    it("debe calcular el pacing y resumen correctamente", async () => {
      mockBudgetRepository.calculatePacing.mockResolvedValue([
        {
          budgetId: "bgt-1",
          categoryId: "cat-1",
          categoryName: "Alimentación",
          categoryColorHex: "#10B981",
          categoryIcon: "shopping-cart",
          amountLimitCents: 30000n,
          spentCents: 15000n,
          remainingCents: 15000n,
          percentageUsed: 50,
          alertThresholdPct: 80,
          status: "ON_TRACK",
        },
        {
          budgetId: "bgt-2",
          categoryId: "cat-2",
          categoryName: "Ocio",
          categoryColorHex: "#F59E0B",
          categoryIcon: "film",
          amountLimitCents: 20000n,
          spentCents: 16500n,
          remainingCents: 3500n,
          percentageUsed: 82.5,
          alertThresholdPct: 80,
          status: "WARNING",
        },
        {
          budgetId: "bgt-3",
          categoryId: "cat-3",
          categoryName: "Restaurantes",
          categoryColorHex: "#EF4444",
          categoryIcon: "utensils",
          amountLimitCents: 10000n,
          spentCents: 9500n,
          remainingCents: 500n,
          percentageUsed: 95,
          alertThresholdPct: 80,
          status: "EXCEEDED",
        },
      ]);

      const result = await budgetsService.getBudgetPacing("user-1", 9, 2026);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.summary.totalBudgetedCents).toBe(60000);
      expect(result.summary.totalSpentCents).toBe(41000);
      expect(result.summary.totalRemainingCents).toBe(19000);
      expect(result.summary.overallPercentageUsed).toBe(68.33);
      expect(result.data[0].status).toBe("ON_TRACK");
      expect(result.data[1].status).toBe("WARNING");
      expect(result.data[2].status).toBe("EXCEEDED");
    });
  });

  describe("updateBudget y deleteBudget", () => {
    it("debe lanzar ForbiddenException al intentar modificar un presupuesto ajeno", async () => {
      mockBudgetRepository.findById.mockResolvedValue(mockBudget);

      await expect(
        budgetsService.updateBudget("user-intruso", "bgt-uuid-1", {
          amountLimitCents: 40000,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("debe lanzar ForbiddenException al intentar eliminar un presupuesto ajeno", async () => {
      mockBudgetRepository.findById.mockResolvedValue(mockBudget);

      await expect(
        budgetsService.deleteBudget("user-intruso", "bgt-uuid-1"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("debe eliminar el presupuesto si pertenece al usuario", async () => {
      mockBudgetRepository.findById.mockResolvedValue(mockBudget);
      mockBudgetRepository.delete.mockResolvedValue(undefined);

      await budgetsService.deleteBudget("user-1", "bgt-uuid-1");
      expect(mockBudgetRepository.delete).toHaveBeenCalledWith("bgt-uuid-1");
    });
  });
});
