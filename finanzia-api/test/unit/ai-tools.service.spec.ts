import { Test, TestingModule } from "@nestjs/testing";
import { AiToolsService } from "../../src/core/application/ai/ai-tools.service";
import {
  IFinancialAnalyticsPort,
  FINANCIAL_ANALYTICS_PORT,
} from "../../src/core/application/ports/financial-analytics.port";
import { MultiStepPlannerService } from "../../src/core/application/ai/multi-step-planner.service";
import { TransactionLearningService } from "../../src/core/application/ai/transaction-learning.service";
import { BudgetsService } from "../../src/core/application/budgets/budgets.service";
import { TransactionsService } from "../../src/core/application/transactions/transactions.service";
import { ACCOUNT_REPOSITORY } from "../../src/core/domain/repositories/account.repository.interface";
import { CATEGORY_REPOSITORY } from "../../src/core/domain/repositories/category.repository.interface";
import { PrismaFinancialAnalyticsAdapter } from "../../src/infrastructure/database/repositories/prisma-financial-analytics.adapter";
import { PrismaService } from "../../src/infrastructure/database/prisma.service";

describe("AiToolsService (Cero Alucinaciones - Application Service)", () => {
  let service: AiToolsService;
  let mockAnalytics: jest.Mocked<IFinancialAnalyticsPort>;
  let mockPlanner: { calculateGoalPlan: jest.Mock };
  let mockLearning: { categorizeTransaction: jest.Mock; learnRule: jest.Mock };
  let mockBudgetsService: { createOrUpdateBudget: jest.Mock };
  let mockTransactionsService: { createTransaction: jest.Mock };
  let mockAccountRepository: { findAllByUserId: jest.Mock };
  let mockCategoryRepository: { findAllForUser: jest.Mock };

  beforeEach(async () => {
    mockAnalytics = {
      getFinancialSummary: jest.fn(),
      getExpensesByCategory: jest.fn(),
      getBudgetStatus: jest.fn(),
      proposeRecommendation: jest.fn(),
      getAccountBalances: jest.fn(),
      getSavingsGoals: jest.fn(),
      getHistoricalBaseline: jest.fn(),
      getProactiveInsights: jest.fn(),
      saveUserCategoryRule: jest.fn(),
      findUserCategoryRule: jest.fn(),
    };

    mockPlanner = {
      calculateGoalPlan: jest.fn(),
    };

    mockLearning = {
      categorizeTransaction: jest.fn(),
      learnRule: jest.fn(),
    };

    mockBudgetsService = {
      createOrUpdateBudget: jest.fn(),
    };

    mockTransactionsService = {
      createTransaction: jest.fn(),
    };

    mockAccountRepository = {
      findAllByUserId: jest.fn(),
    };

    mockCategoryRepository = {
      findAllForUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiToolsService,
        {
          provide: FINANCIAL_ANALYTICS_PORT,
          useValue: mockAnalytics,
        },
        {
          provide: MultiStepPlannerService,
          useValue: mockPlanner,
        },
        {
          provide: TransactionLearningService,
          useValue: mockLearning,
        },
        {
          provide: BudgetsService,
          useValue: mockBudgetsService,
        },
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
        {
          provide: ACCOUNT_REPOSITORY,
          useValue: mockAccountRepository,
        },
        {
          provide: CATEGORY_REPOSITORY,
          useValue: mockCategoryRepository,
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

  it("debe delegar getAccountBalances al port de analíticas", async () => {
    const balances = {
      totalBalanceCents: 150000,
      accounts: [],
      currency: "EUR",
    };
    mockAnalytics.getAccountBalances.mockResolvedValue(balances);

    const result = await service.getAccountBalances("user-1");
    expect(result).toEqual(balances);
    expect(mockAnalytics.getAccountBalances).toHaveBeenCalledWith("user-1");
  });

  it("debe delegar getSavingsGoals al port de analíticas", async () => {
    mockAnalytics.getSavingsGoals.mockResolvedValue([]);
    const result = await service.getSavingsGoals("user-1");
    expect(result).toEqual([]);
    expect(mockAnalytics.getSavingsGoals).toHaveBeenCalledWith("user-1");
  });

  it("debe delegar calculateSavingsPlan a MultiStepPlannerService", async () => {
    const plan = {
      goalName: "Vacaciones",
      targetAmountCents: 300000,
      months: 6,
      monthlyQuotaCents: 50000,
      averageNetSavingsCents: 30000,
      gapCents: 20000,
      isViableWithCurrentSavings: false,
      suggestedCuts: [],
      summary: "Plan",
    };
    mockPlanner.calculateGoalPlan.mockResolvedValue(plan);

    const result = await service.calculateSavingsPlan(
      "user-1",
      300000,
      6,
      "Vacaciones",
    );
    expect(result).toEqual(plan);
    expect(mockPlanner.calculateGoalPlan).toHaveBeenCalledWith(
      "user-1",
      300000,
      6,
      "Vacaciones",
    );
  });

  it("debe delegar categorizeTransaction a TransactionLearningService", async () => {
    const cat = {
      suggestedCategoryId: "cat-1",
      suggestedCategoryName: "Supermercado",
      source: "PATTERN_MATCH" as const,
      confidence: 0.9,
    };
    mockLearning.categorizeTransaction.mockResolvedValue(cat);

    const result = await service.categorizeTransaction("user-1", "Mercadona");
    expect(result).toEqual(cat);
    expect(mockLearning.categorizeTransaction).toHaveBeenCalledWith(
      "user-1",
      "Mercadona",
    );
  });

  it("debe delegar getProactiveInsights al port de analíticas", async () => {
    mockAnalytics.getProactiveInsights.mockResolvedValue([]);
    const result = await service.getProactiveInsights("user-1");
    expect(result).toEqual([]);
    expect(mockAnalytics.getProactiveInsights).toHaveBeenCalledWith("user-1");
  });

  it("debe delegar getHistoricalBaseline al port de analíticas", async () => {
    const baseline = {
      monthsAnalyzed: 3,
      averageMonthlyIncomeCents: 200000,
      averageMonthlyFixedExpensesCents: 100000,
      averageMonthlyVariableExpensesCents: 50000,
      averageMonthlyTotalExpensesCents: 150000,
      averageMonthlyNetSavingsCents: 50000,
      averageSavingsRatePercent: 25,
      topVariableCategories: [],
    };
    mockAnalytics.getHistoricalBaseline.mockResolvedValue(baseline);

    const result = await service.getHistoricalBaseline("user-1");
    expect(result).toEqual(baseline);
    expect(mockAnalytics.getHistoricalBaseline).toHaveBeenCalledWith("user-1");
  });

  describe("createBudget", () => {
    it("debe resolver la categoría por nombre y crear el presupuesto con importes en céntimos", async () => {
      mockCategoryRepository.findAllForUser.mockResolvedValue([
        { id: "cat-ocio-1", name: "Ocio y Cultura" },
        { id: "cat-alim-2", name: "Alimentación" },
      ]);

      mockBudgetsService.createOrUpdateBudget.mockResolvedValue({
        id: "bgt-123",
        categoryId: "cat-ocio-1",
        amountLimitCents: 30000,
        periodMonth: 9,
        periodYear: 2026,
        alertThresholdPct: 80,
      });

      const result = await service.createBudget("user-1", {
        categoryNameOrId: "ocio",
        amountLimitEur: 300,
        month: 9,
        year: 2026,
      });

      expect(result.budgetId).toBe("bgt-123");
      expect(result.categoryName).toBe("Ocio y Cultura");
      expect(result.amountLimitCents).toBe(30000);
      expect(result.amountLimitEur).toBe(300);
      expect(mockBudgetsService.createOrUpdateBudget).toHaveBeenCalledWith(
        "user-1",
        {
          categoryId: "cat-ocio-1",
          amountLimitCents: 30000,
          periodMonth: 9,
          periodYear: 2026,
          alertThresholdPct: 80,
        },
      );
    });

    it("debe lanzar un error descriptivo si la categoría no existe", async () => {
      mockCategoryRepository.findAllForUser.mockResolvedValue([
        { id: "cat-1", name: "Alimentación" },
      ]);

      await expect(
        service.createBudget("user-1", {
          categoryNameOrId: "criptomonedas",
          amountLimitEur: 200,
        }),
      ).rejects.toThrow("No se ha encontrado ninguna categoría");
    });
  });

  describe("createTransaction", () => {
    it("debe registrar un gasto seleccionando la cuenta adecuada y deduciendo saldo", async () => {
      mockAccountRepository.findAllByUserId.mockResolvedValue([
        { id: "acc-1", name: "Cuenta Corriente", type: "CHECKING" },
      ]);
      mockCategoryRepository.findAllForUser.mockResolvedValue([
        { id: "cat-transp", name: "Transporte" },
      ]);

      mockTransactionsService.createTransaction.mockResolvedValue({
        transaction: {
          id: "tx-1",
          amountCents: -4500,
          description: "Gasolina Repsol",
          transactionDate: "2026-09-22T20:00:00.000Z",
        },
        newAccountBalanceCents: 155500,
      });

      const result = await service.createTransaction("user-1", {
        type: "EXPENSE",
        amountEur: 45,
        description: "Gasolina Repsol",
        categoryNameOrId: "Transporte",
      });

      expect(result.transactionId).toBe("tx-1");
      expect(result.amountEur).toBe(45);
      expect(result.accountName).toBe("Cuenta Corriente");
      expect(result.categoryName).toBe("Transporte");
      expect(result.newAccountBalanceEur).toBe(1555);
      expect(mockTransactionsService.createTransaction).toHaveBeenCalledWith(
        "user-1",
        {
          accountId: "acc-1",
          categoryId: "cat-transp",
          amountCents: 4500,
          type: "EXPENSE",
          transactionDate: expect.any(String),
          description: "Gasolina Repsol",
        },
      );
    });

    it("debe clasificar automáticamente con TransactionLearningService si no se especifica categoría", async () => {
      mockAccountRepository.findAllByUserId.mockResolvedValue([
        { id: "acc-1", name: "Cuenta Corriente", type: "CHECKING" },
      ]);
      mockCategoryRepository.findAllForUser.mockResolvedValue([
        { id: "cat-alim", name: "Alimentación" },
      ]);
      mockLearning.categorizeTransaction.mockResolvedValue({
        suggestedCategoryId: "cat-alim",
        suggestedCategoryName: "Alimentación",
      });

      mockTransactionsService.createTransaction.mockResolvedValue({
        transaction: {
          id: "tx-2",
          amountCents: -1250,
          description: "Mercadona",
          transactionDate: "2026-09-22T20:00:00.000Z",
        },
        newAccountBalanceCents: 140000,
      });

      const result = await service.createTransaction("user-1", {
        type: "EXPENSE",
        amountEur: 12.5,
        description: "Mercadona",
      });

      expect(mockLearning.categorizeTransaction).toHaveBeenCalledWith(
        "user-1",
        "Mercadona",
      );
      expect(result.categoryName).toBe("Alimentación");
    });
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
