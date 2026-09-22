import { Test, TestingModule } from "@nestjs/testing";
import { TransactionLearningService } from "../../src/core/application/ai/transaction-learning.service";
import {
  IFinancialAnalyticsPort,
  FINANCIAL_ANALYTICS_PORT,
} from "../../src/core/application/ports/financial-analytics.port";

describe("TransactionLearningService (Intelligent Categorization & Feedback Loop)", () => {
  let service: TransactionLearningService;
  let mockAnalytics: jest.Mocked<IFinancialAnalyticsPort>;

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
      saveUserCategoryRule: jest
        .fn()
        .mockImplementation((userId, pattern, categoryId) =>
          Promise.resolve({ id: "rule-1", pattern, categoryId }),
        ),
      findUserCategoryRule: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionLearningService,
        {
          provide: FINANCIAL_ANALYTICS_PORT,
          useValue: mockAnalytics,
        },
      ],
    }).compile();

    service = module.get<TransactionLearningService>(
      TransactionLearningService,
    );
  });

  it("debe priorizar reglas aprendidas del usuario sobre diccionarios genéricos (Capa 1)", async () => {
    mockAnalytics.findUserCategoryRule.mockImplementation((userId, pattern) => {
      if (pattern === "DECATHLON") {
        return Promise.resolve({
          id: "rule-custom",
          pattern: "DECATHLON",
          categoryId: "cat-deportes-custom",
          categoryName: "Deportes y Fitness",
        });
      }
      return Promise.resolve(null);
    });

    const result = await service.categorizeTransaction(
      "user-1",
      "COMPRA DECATHLON L'ILLA",
    );

    expect(result.suggestedCategoryName).toBe("Deportes y Fitness");
    expect(result.source).toBe("LEARNED_USER_RULE");
    expect(result.confidence).toBe(0.98);
  });

  it("debe clasificar mediante diccionario incorporado si no hay regla aprendida (Capa 2)", async () => {
    mockAnalytics.findUserCategoryRule.mockResolvedValue(null);

    const result = await service.categorizeTransaction(
      "user-1",
      "COMPRA MERCADONA BARCELONA",
    );

    expect(result.suggestedCategoryName).toBe("Supermercado");
    expect(result.source).toBe("PATTERN_MATCH");
    expect(result.confidence).toBe(0.9);
  });

  it("debe retornar fallback cuando no coincide ningún patrón (Capa 3)", async () => {
    mockAnalytics.findUserCategoryRule.mockResolvedValue(null);

    const result = await service.categorizeTransaction(
      "user-1",
      "PAGO DESCONOCIDO XYZ 123",
    );

    expect(result.suggestedCategoryName).toBe("Otros Gastos");
    expect(result.source).toBe("SEMANTIC_FALLBACK");
    expect(result.confidence).toBe(0.5);
  });

  it("debe normalizar y guardar una regla de feedback loop cuando el usuario confirma/corrige", async () => {
    const saved = await service.learnRule(
      "user-1",
      "  tienda de café speciality  ",
      "cat-cafe",
    );

    expect(saved.pattern).toBe("TIENDA DE CAFE SPECIALITY");
    expect(mockAnalytics.saveUserCategoryRule).toHaveBeenCalledWith(
      "user-1",
      "TIENDA DE CAFE SPECIALITY",
      "cat-cafe",
    );
  });
});
