import { Test, TestingModule } from "@nestjs/testing";
import { AiToolsService } from "../../src/core/application/ai/ai-tools.service";
import {
  IFinancialAnalyticsPort,
  FINANCIAL_ANALYTICS_PORT,
} from "../../src/core/application/ports/financial-analytics.port";
import { PrismaFinancialAnalyticsAdapter } from "../../src/infrastructure/database/repositories/prisma-financial-analytics.adapter";
import { PrismaService } from "../../src/infrastructure/database/prisma.service";

describe("AiToolsService (Cero Alucinaciones - Application Service)", () => {
  let service: AiToolsService;
  let mockAnalytics: jest.Mocked<IFinancialAnalyticsPort>;

  beforeEach(async () => {
    mockAnalytics = {
      getFinancialSummary: jest.fn(),
      getExpensesByCategory: jest.fn(),
      getBudgetStatus: jest.fn(),
      proposeRecommendation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiToolsService,
        {
          provide: FINANCIAL_ANALYTICS_PORT,
          useValue: mockAnalytics,
        },
      ],
    }).compile();

    service = module.get<AiToolsService>(AiToolsService);
  });

  it("debe delegar getFinancialSummary al port de analíticas", async () => {
    const summary = {
      month: 9,
      year: 2026,
      totalIncomeCents: 250000,
      totalExpenseCents: 100000,
      netSavingsCents: 150000,
      savingsRatePercent: 60,
      transactionCount: 3,
      currency: "EUR",
    };
    mockAnalytics.getFinancialSummary.mockResolvedValue(summary);

    const result = await service.getFinancialSummary("user-1", 9, 2026);
    expect(result).toEqual(summary);
    expect(mockAnalytics.getFinancialSummary).toHaveBeenCalledWith(
      "user-1",
      9,
      2026,
    );
  });

  it("debe delegar getExpensesByCategory al port de analíticas", async () => {
    mockAnalytics.getExpensesByCategory.mockResolvedValue([]);
    const result = await service.getExpensesByCategory(
      "user-1",
      "2026-09-01",
      "2026-09-30",
    );
    expect(result).toEqual([]);
    expect(mockAnalytics.getExpensesByCategory).toHaveBeenCalledWith(
      "user-1",
      "2026-09-01",
      "2026-09-30",
      undefined,
    );
  });

  it("debe delegar getBudgetStatus al port de analíticas", async () => {
    mockAnalytics.getBudgetStatus.mockResolvedValue([]);
    const result = await service.getBudgetStatus("user-1", 9, 2026);
    expect(result).toEqual([]);
    expect(mockAnalytics.getBudgetStatus).toHaveBeenCalledWith(
      "user-1",
      9,
      2026,
    );
  });

  it("debe delegar proposeRecommendation al port de analíticas", async () => {
    const recResult = {
      recommendationId: "rec-123",
      status: "PROPOSED",
      type: "SAVINGS_OPPORTUNITY",
      title: "Ahorro",
    };
    mockAnalytics.proposeRecommendation.mockResolvedValue(recResult);

    const result = await service.proposeRecommendation(
      "user-1",
      "SAVINGS_OPPORTUNITY",
      "Ahorro",
      "Razón",
      { amountCents: 5000 },
    );
    expect(result).toEqual(recResult);
    expect(mockAnalytics.proposeRecommendation).toHaveBeenCalledWith(
      "user-1",
      "SAVINGS_OPPORTUNITY",
      "Ahorro",
      "Razón",
      { amountCents: 5000 },
    );
  });
});

describe("PrismaFinancialAnalyticsAdapter (Deterministic Calculations & Edge Cases)", () => {
  let adapter: PrismaFinancialAnalyticsAdapter;
  let prisma: any;

  beforeEach(() => {
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

    adapter = new PrismaFinancialAnalyticsAdapter(prisma as PrismaService);
  });

  describe("getFinancialSummary", () => {
    it("debe calcular correctamente ingresos, gastos y ahorro neto en céntimos enteros", async () => {
      prisma.transaction.findMany.mockResolvedValue([
        { type: "INCOME", amountCents: BigInt(250000) }, // 2500.00 €
        { type: "EXPENSE", amountCents: BigInt(-45000) }, // 450.00 €
        { type: "EXPENSE", amountCents: BigInt(-55000) }, // 550.00 €
      ]);

      const result = await adapter.getFinancialSummary("user-1", 9, 2026);

      expect(result.month).toBe(9);
      expect(result.year).toBe(2026);
      expect(result.totalIncomeCents).toBe(250000);
      expect(result.totalExpenseCents).toBe(100000);
      expect(result.netSavingsCents).toBe(150000);
      expect(result.savingsRatePercent).toBe(60);
      expect(result.transactionCount).toBe(3);
    });

    it("debe devolver tasa de ahorro 0% si no hay ingresos (caso límite / división por cero)", async () => {
      prisma.transaction.findMany.mockResolvedValue([
        { type: "EXPENSE", amountCents: BigInt(-20000) },
      ]);

      const result = await adapter.getFinancialSummary("user-1", 9, 2026);

      expect(result.totalIncomeCents).toBe(0);
      expect(result.totalExpenseCents).toBe(20000);
      expect(result.netSavingsCents).toBe(-20000);
      expect(result.savingsRatePercent).toBe(0);
    });

    it("debe manejar caso de cero transacciones en el periodo", async () => {
      prisma.transaction.findMany.mockResolvedValue([]);

      const result = await adapter.getFinancialSummary("user-1", 1, 2026);

      expect(result.totalIncomeCents).toBe(0);
      expect(result.totalExpenseCents).toBe(0);
      expect(result.netSavingsCents).toBe(0);
      expect(result.savingsRatePercent).toBe(0);
      expect(result.transactionCount).toBe(0);
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

      const result = await adapter.getExpensesByCategory(
        "user-1",
        "2026-09-01",
        "2026-09-30",
      );

      expect(result.length).toBe(2);
      expect(result[0].categoryId).toBe("cat-ocio");
      expect(result[0].totalAmountCents).toBe(30000);
      expect(result[0].percentageOfTotal).toBe(60);

      expect(result[1].categoryId).toBe("cat-super");
      expect(result[1].totalAmountCents).toBe(20000);
      expect(result[1].percentageOfTotal).toBe(40);
    });

    it("debe manejar rango vacío sin gastos de forma segura", async () => {
      prisma.transaction.findMany.mockResolvedValue([]);

      const result = await adapter.getExpensesByCategory(
        "user-1",
        "2026-09-01",
        "2026-09-30",
      );

      expect(result).toEqual([]);
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

      const result = await adapter.getBudgetStatus("user-1", 9, 2026);

      expect(result.length).toBe(1);
      expect(result[0].spentCents).toBe(18000);
      expect(result[0].limitCents).toBe(20000);
      expect(result[0].percentageUsed).toBe(90);
      expect(result[0].status).toBe("WARNING");
    });

    it("debe marcar EXCEEDED cuando el gasto supera el 100% del límite", async () => {
      prisma.budget.findMany.mockResolvedValue([
        {
          id: "bgt-2",
          categoryId: "cat-viajes",
          amountLimitCents: BigInt(10000), // 100 €
          alertThresholdPct: 80,
          category: { name: "Viajes" },
        },
      ]);
      prisma.category.findMany.mockResolvedValue([]);
      prisma.transaction.findMany.mockResolvedValue([
        { amountCents: BigInt(-15000) }, // 150 € gastados -> 150% (EXCEEDED)
      ]);

      const result = await adapter.getBudgetStatus("user-1", 9, 2026);

      expect(result.length).toBe(1);
      expect(result[0].spentCents).toBe(15000);
      expect(result[0].limitCents).toBe(10000);
      expect(result[0].percentageUsed).toBe(150);
      expect(result[0].status).toBe("EXCEEDED");
    });

    it("debe marcar ON_TRACK cuando el gasto está por debajo del umbral de alerta", async () => {
      prisma.budget.findMany.mockResolvedValue([
        {
          id: "bgt-3",
          categoryId: "cat-luz",
          amountLimitCents: BigInt(10000),
          alertThresholdPct: 80,
          category: { name: "Luz" },
        },
      ]);
      prisma.category.findMany.mockResolvedValue([]);
      prisma.transaction.findMany.mockResolvedValue([
        { amountCents: BigInt(-4000) }, // 40% (ON_TRACK)
      ]);

      const result = await adapter.getBudgetStatus("user-1", 9, 2026);

      expect(result.length).toBe(1);
      expect(result[0].spentCents).toBe(4000);
      expect(result[0].percentageUsed).toBe(40);
      expect(result[0].status).toBe("ON_TRACK");
    });
  });

  describe("proposeRecommendation", () => {
    it("debe guardar una recomendación con estado PROPOSED", async () => {
      prisma.aiRecommendation.create.mockResolvedValue({
        id: "rec-123",
        title: "Ahorro extraordinario",
        status: "PROPOSED",
        type: "SAVINGS_OPPORTUNITY",
      });

      const result = await adapter.proposeRecommendation(
        "user-1",
        "SAVINGS_OPPORTUNITY",
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
