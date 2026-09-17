import { Test, TestingModule } from "@nestjs/testing";
import { AiToolsService } from "../../src/core/application/ai/ai-tools.service";
import { PrismaService } from "../../src/infrastructure/database/prisma.service";

describe("AiToolsService (Cero Alucinaciones)", () => {
  let service: AiToolsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      transaction: {
        findMany: jest.fn(),
      },
      budget: {
        findMany: jest.fn(),
      },
      category: {
        findMany: jest.fn(),
      },
      aiRecommendation: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiToolsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<AiToolsService>(AiToolsService);
  });

  describe("getFinancialSummary", () => {
    it("debe calcular correctamente ingresos, gastos y ahorro neto en céntimos enteros", async () => {
      prisma.transaction.findMany.mockResolvedValue([
        { type: "INCOME", amountCents: BigInt(250000) }, // 2500.00 €
        { type: "EXPENSE", amountCents: BigInt(-45000) }, // 450.00 €
        { type: "EXPENSE", amountCents: BigInt(-55000) }, // 550.00 €
      ]);

      const result = await service.getFinancialSummary("user-1", 9, 2026);

      expect(result.month).toBe(9);
      expect(result.year).toBe(2026);
      expect(result.totalIncomeCents).toBe(250000);
      expect(result.totalExpenseCents).toBe(100000);
      expect(result.netSavingsCents).toBe(150000);
      expect(result.savingsRatePercent).toBe(60);
      expect(result.transactionCount).toBe(3);
    });

    it("debe devolver tasa de ahorro 0% si no hay ingresos", async () => {
      prisma.transaction.findMany.mockResolvedValue([
        { type: "EXPENSE", amountCents: BigInt(-20000) },
      ]);

      const result = await service.getFinancialSummary("user-1", 9, 2026);

      expect(result.totalIncomeCents).toBe(0);
      expect(result.totalExpenseCents).toBe(20000);
      expect(result.netSavingsCents).toBe(-20000);
      expect(result.savingsRatePercent).toBe(0);
    });
  });

  describe("getExpensesByCategory", () => {
    it("debe agrupar y ordenar los gastos de mayor a menor", async () => {
      prisma.transaction.findMany.mockResolvedValue([
        {
          categoryId: "cat-super",
          amountCents: BigInt(-12000),
          category: { name: "Supermercado", icon: "🛒" },
        },
        {
          categoryId: "cat-ocio",
          amountCents: BigInt(-30000),
          category: { name: "Ocio", icon: "🎮" },
        },
        {
          categoryId: "cat-super",
          amountCents: BigInt(-8000),
          category: { name: "Supermercado", icon: "🛒" },
        },
      ]);

      const result = await service.getExpensesByCategory("user-1", "2026-09-01", "2026-09-30");

      expect(result.length).toBe(2);
      // cat-ocio: 30000, cat-super: 20000 -> Ocio va primero
      expect(result[0].categoryId).toBe("cat-ocio");
      expect(result[0].totalAmountCents).toBe(30000);
      expect(result[0].percentageOfTotal).toBe(60);

      expect(result[1].categoryId).toBe("cat-super");
      expect(result[1].totalAmountCents).toBe(20000);
      expect(result[1].percentageOfTotal).toBe(40);
    });
  });

  describe("getBudgetStatus", () => {
    it("debe calcular correctamente el estado ON_TRACK, WARNING o EXCEEDED", async () => {
      prisma.budget.findMany.mockResolvedValue([
        {
          id: "bgt-1",
          categoryId: "cat-rest",
          amountLimitCents: BigInt(20000), // 200 €
          alertThresholdPct: 80,
          category: { name: "Restaurantes" },
        },
      ]);
      prisma.category.findMany.mockResolvedValue([]); // sin subcategorías
      prisma.transaction.findMany.mockResolvedValue([
        { amountCents: BigInt(-18000) }, // 180 € gastados -> 90% (WARNING)
      ]);

      const result = await service.getBudgetStatus("user-1", 9, 2026);

      expect(result.length).toBe(1);
      expect(result[0].spentCents).toBe(18000);
      expect(result[0].limitCents).toBe(20000);
      expect(result[0].percentageUsed).toBe(90);
      expect(result[0].status).toBe("WARNING");
    });
  });

  describe("proposeRecommendation", () => {
    it("debe guardar una recomendación con estado PROPOSED", async () => {
      prisma.aiRecommendation.create.mockResolvedValue({
        id: "rec-123",
        title: "Ahorro extraordinario",
        status: "PROPOSED",
      });

      const result = await service.proposeRecommendation(
        "user-1",
        "SAVINGS_BOOST",
        "Ahorro extraordinario",
        "Explicación",
        { amountCents: 5000 },
      );

      expect(result.recommendationId).toBe("rec-123");
      expect(result.status).toBe("PROPOSED");
      expect(prisma.aiRecommendation.create).toHaveBeenCalled();
    });
  });
});
