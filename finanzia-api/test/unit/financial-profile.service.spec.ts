import { Test, TestingModule } from "@nestjs/testing";
import { FinancialProfileService } from "../../src/core/application/ai/financial-profile.service";
import {
  IFinancialAnalyticsPort,
  FINANCIAL_ANALYTICS_PORT,
} from "../../src/core/application/ports/financial-analytics.port";

describe("FinancialProfileService (Cross-Session Long-Term Memory)", () => {
  let service: FinancialProfileService;
  let mockAnalytics: jest.Mocked<IFinancialAnalyticsPort>;

  beforeEach(async () => {
    mockAnalytics = {
      getFinancialSummary: jest.fn(),
      getExpensesByCategory: jest.fn(),
      getBudgetStatus: jest.fn().mockResolvedValue([
        {
          budgetId: "b-1",
          categoryId: "cat-1",
          categoryName: "Ocio",
          limitCents: 10000,
          spentCents: 9500,
          remainingCents: 500,
          percentageUsed: 95,
          status: "WARNING",
        },
      ]),
      proposeRecommendation: jest.fn(),
      getAccountBalances: jest.fn().mockResolvedValue({
        totalBalanceCents: 450000, // 4.500 €
        currency: "EUR",
        accounts: [
          {
            accountId: "acc-1",
            name: "Cuenta Principal",
            type: "CHECKING",
            currency: "EUR",
            balanceCents: 350000,
          },
          {
            accountId: "acc-2",
            name: "Ahorro",
            type: "SAVINGS",
            currency: "EUR",
            balanceCents: 100000,
          },
        ],
      }),
      getSavingsGoals: jest.fn().mockResolvedValue([
        {
          goalId: "g-1",
          name: "Vacaciones",
          targetAmountCents: 200000,
          currentAmountCents: 160000,
          progressPercent: 80,
          targetDate: "2026-12-31",
          isCompleted: false,
        },
      ]),
      getHistoricalBaseline: jest.fn().mockResolvedValue({
        monthsAnalyzed: 3,
        averageMonthlyIncomeCents: 220000,
        averageMonthlyFixedExpensesCents: 110000,
        averageMonthlyVariableExpensesCents: 60000,
        averageMonthlyTotalExpensesCents: 170000,
        averageMonthlyNetSavingsCents: 50000,
        averageSavingsRatePercent: 22.7,
        topVariableCategories: [],
      }),
      getProactiveInsights: jest.fn(),
      saveUserCategoryRule: jest.fn(),
      findUserCategoryRule: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialProfileService,
        {
          provide: FINANCIAL_ANALYTICS_PORT,
          useValue: mockAnalytics,
        },
      ],
    }).compile();

    service = module.get<FinancialProfileService>(FinancialProfileService);
  });

  it("debe compilar el perfil consolidado con importes en euros legibles", async () => {
    const profile = await service.getProfile("user-1");

    expect(profile.totalBalanceEur).toBe("4500,00");
    expect(profile.accountsCount).toBe(2);
    expect(profile.activeGoalsCount).toBe(1);
    expect(profile.goals[0].name).toBe("Vacaciones");
    expect(profile.goals[0].progressPercent).toBe(80);
    expect(profile.baseline.monthlyIncomeEur).toBe("2200,00");
    expect(profile.baseline.monthlyNetSavingsEur).toBe("500,00");
    expect(profile.budgetsUnderRisk.length).toBe(1);
    expect(profile.budgetsUnderRisk[0].categoryName).toBe("Ocio");
  });

  it("debe generar el bloque de contexto inyectable para el prompt del sistema", async () => {
    const context = await service.buildSystemContext("user-1");

    expect(context).toContain("PERFIL FINANCIERO CONSOLIDADO DEL USUARIO");
    expect(context).toContain("4500,00 €");
    expect(context).toContain("Vacaciones");
    expect(context).toContain("80% completado");
    expect(context).toContain("Ocio: 95% consumido (WARNING)");
  });
});
