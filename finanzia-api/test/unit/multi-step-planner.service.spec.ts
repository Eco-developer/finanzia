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
      getSavingsGoals: jest.fn().mockResolvedValue([]),
      getActiveDebtsSummary: jest.fn().mockResolvedValue({
        totalRemainingCents: 0,
        totalMonthlyPaymentCents: 0,
        activeDebtsCount: 0,
        debts: [],
      }),
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

  it("debe evitar recomendar una meta duplicada si ya existe una meta con características similares (ej. Vacaciones en 6 meses con 3.000 €)", async () => {
    mockAnalytics.getSavingsGoals.mockResolvedValue([
      {
        goalId: "goal-vac-1",
        name: "Vacaciones de Verano",
        targetAmountCents: 300000,
        currentAmountCents: 100000,
        progressPercent: 33.3,
        isCompleted: false,
        targetDate: "2026-09-01T00:00:00.000Z",
      },
    ]);

    const result = await planner.calculateGoalPlan(
      "user-1",
      300000,
      6,
      "Vacaciones",
    );

    expect(result.isDuplicate).toBe(true);
    expect(result.recommendationId).toBeUndefined();
    expect(result.summary).toContain("Meta de Ahorro ya existente detectada");
    expect(result.summary).toContain("Vacaciones de Verano");
    expect(result.summary).toContain("3.000,00 €");
    expect(mockAnalytics.proposeRecommendation).not.toHaveBeenCalled();
  });

  it("debe tomar en cuenta las deudas actuales (ej. 4.000 € en coche o cuotas de iPhone) y NO recomendar metas de ocio como vacaciones", async () => {
    mockAnalytics.getActiveDebtsSummary.mockResolvedValue({
      totalRemainingCents: 475000,
      totalMonthlyPaymentCents: 31500,
      activeDebtsCount: 2,
      debts: [
        {
          debtId: "d-car",
          concept: "Préstamo Coche",
          creditor: "Banco Santander",
          remainingAmountCents: 400000, // 4.000 €
          initialAmountCents: 1200000,
          minimumMonthlyPaymentCents: 25000,
          interestRateBasisPts: 650,
          interestRateType: "ANNUAL",
        },
        {
          debtId: "d-phone",
          concept: "Financiación iPhone",
          creditor: "Apple Financial",
          remainingAmountCents: 75000, // 750 €
          initialAmountCents: 120000,
          minimumMonthlyPaymentCents: 6500,
          interestRateBasisPts: 0,
          interestRateType: "ANNUAL",
        },
      ],
    });

    const result = await planner.calculateGoalPlan(
      "user-1",
      300000,
      6,
      "Vacaciones en la Playa",
    );

    expect(result.hasDebtConflict).toBe(true);
    expect(result.recommendationId).toBeUndefined();
    expect(result.summary).toContain("Conflicto de Prioridad Financiera");
    expect(result.summary).toContain("Préstamo Coche");
    expect(result.summary).toContain("Financiación iPhone");
    expect(result.summary).toContain("4.750,00 €");
    expect(mockAnalytics.proposeRecommendation).not.toHaveBeenCalled();
  });
});
