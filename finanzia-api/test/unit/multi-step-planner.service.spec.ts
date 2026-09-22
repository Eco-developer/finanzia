import { Test, TestingModule } from "@nestjs/testing";
import { MultiStepPlannerService } from "../../src/core/application/ai/multi-step-planner.service";
import {
  IFinancialAnalyticsPort,
  FINANCIAL_ANALYTICS_PORT,
} from "../../src/core/application/ports/financial-analytics.port";
import { HistoricalBaselineResult } from "../../src/core/application/ai/ai-tools.service";

describe("MultiStepPlannerService (Deterministic Goal Decomposition & Variable Cuts)", () => {
  let planner: MultiStepPlannerService;
  let mockAnalytics: jest.Mocked<IFinancialAnalyticsPort>;

  const defaultBaseline: HistoricalBaselineResult = {
    monthsAnalyzed: 3,
    averageMonthlyIncomeCents: 250000, // 2.500 €
    averageMonthlyFixedExpensesCents: 120000, // 1.200 €
    averageMonthlyVariableExpensesCents: 80000, // 800 €
    averageMonthlyTotalExpensesCents: 200000, // 2.000 €
    averageMonthlyNetSavingsCents: 50000, // 500 €/mes
    averageSavingsRatePercent: 20,
    topVariableCategories: [
      {
        categoryId: "cat-rest",
        categoryName: "Restaurantes",
        monthlyAverageCents: 35000, // 350 €/mes
        percentageOfVariable: 43.8,
      },
      {
        categoryId: "cat-ocio",
        categoryName: "Ocio y Suscripciones",
        monthlyAverageCents: 25000, // 250 €/mes
        percentageOfVariable: 31.3,
      },
      {
        categoryId: "cat-ropa",
        categoryName: "Compras y Ropa",
        monthlyAverageCents: 20000, // 200 €/mes
        percentageOfVariable: 25.0,
      },
    ],
  };

  beforeEach(async () => {
    mockAnalytics = {
      getFinancialSummary: jest.fn(),
      getExpensesByCategory: jest.fn(),
      getBudgetStatus: jest.fn(),
      proposeRecommendation: jest.fn().mockResolvedValue({
        recommendationId: "rec-plan-1",
        status: "PROPOSED",
        type: "GOAL_CREATION",
        title: "Crear Meta",
      }),
      getAccountBalances: jest.fn(),
      getSavingsGoals: jest.fn(),
      getHistoricalBaseline: jest.fn().mockResolvedValue(defaultBaseline),
      getProactiveInsights: jest.fn(),
      saveUserCategoryRule: jest.fn(),
      findUserCategoryRule: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultiStepPlannerService,
        {
          provide: FINANCIAL_ANALYTICS_PORT,
          useValue: mockAnalytics,
        },
      ],
    }).compile();

    planner = module.get<MultiStepPlannerService>(MultiStepPlannerService);
  });

  it("debe calcular cuota mensual exacta para objetivo alcanzable con ahorro actual", async () => {
    // 2.400 € en 6 meses = 400 €/mes. Como ahorra 500 €/mes, es viable sin recortes.
    const result = await planner.calculateGoalPlan(
      "user-1",
      240000,
      6,
      "Fondo de Emergencia",
    );

    expect(result.monthlyQuotaCents).toBe(40000);
    expect(result.isViableWithCurrentSavings).toBe(true);
    expect(result.gapCents).toBe(0);
    expect(result.suggestedCuts.length).toBe(0);
    expect(result.summary).toContain("400,00 €/mes");
    expect(result.summary).toContain(
      "¡Tu tasa de ahorro actual es suficiente!",
    );
    expect(mockAnalytics.proposeRecommendation).toHaveBeenCalledWith(
      "user-1",
      "GOAL_CREATION",
      expect.stringContaining("Fondo de Emergencia"),
      expect.any(String),
      expect.objectContaining({
        actionType: "CREATE_SAVINGS_GOAL",
        targetAmountCents: 240000,
        monthlyQuotaCents: 40000,
      }),
    );
  });

  it("debe detectar la brecha y proponer recortes únicamente en gastos variables cuando el ahorro no alcanza", async () => {
    // 4.800 € en 6 meses = 800 €/mes. Como ahorra 500 €/mes, la brecha es de 300 €/mes.
    const result = await planner.calculateGoalPlan(
      "user-1",
      480000,
      6,
      "Viaje a Japón",
    );

    expect(result.monthlyQuotaCents).toBe(80000);
    expect(result.isViableWithCurrentSavings).toBe(false);
    expect(result.gapCents).toBe(30000); // 300 € de déficit
    expect(result.suggestedCuts.length).toBeGreaterThan(0);

    // Debe sugerir recortes proporcionales (máx 30%) en Restaurantes u Ocio
    const restCut = result.suggestedCuts.find(
      (c) => c.categoryName === "Restaurantes",
    );
    expect(restCut).toBeDefined();
    expect(restCut!.suggestedCutCents).toBeLessThanOrEqual(35000 * 0.3); // <= 105 €

    expect(result.summary).toContain("brecha de 300,00 €/mes");
    expect(result.summary).toContain("Restaurantes");
  });

  it("debe manejar plazos límites extremos con seguridad (meses >= 1)", async () => {
    const result = await planner.calculateGoalPlan(
      "user-1",
      100000,
      0,
      "Meta Rápida",
    );
    expect(result.months).toBe(1);
    expect(result.monthlyQuotaCents).toBe(100000);
  });
});
