import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { GeminiAdvisorService } from "../../src/infrastructure/ai/gemini-advisor.service";
import { AiToolsService } from "../../src/core/application/ai/ai-tools.service";
import { FinancialProfileService } from "../../src/core/application/ai/financial-profile.service";

describe("GeminiAdvisorService (Natural Language Budget Creation)", () => {
  let service: GeminiAdvisorService;
  let mockAiToolsService: jest.Mocked<any>;
  let mockFinancialProfileService: jest.Mocked<any>;
  let mockConfigService: jest.Mocked<any>;

  beforeEach(async () => {
    mockAiToolsService = {
      createBudget: jest.fn(),
      createTransaction: jest.fn(),
      getFinancialSummary: jest.fn(),
      getExpensesByCategory: jest.fn(),
      getBudgetStatus: jest.fn(),
      getAccountBalances: jest.fn(),
      getSavingsGoals: jest.fn(),
      calculateSavingsPlan: jest.fn(),
      categorizeTransaction: jest.fn(),
      getProactiveInsights: jest.fn(),
      getHistoricalBaseline: jest.fn(),
      proposeRecommendation: jest.fn(),
    };

    mockFinancialProfileService = {
      buildSystemContext: jest
        .fn()
        .mockResolvedValue("Contexto de perfil de prueba"),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === "GEMINI_API_KEY") return ""; // Modo offline / fallback determinista
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiAdvisorService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AiToolsService, useValue: mockAiToolsService },
        {
          provide: FinancialProfileService,
          useValue: mockFinancialProfileService,
        },
      ],
    }).compile();

    service = module.get<GeminiAdvisorService>(GeminiAdvisorService);
  });

  describe("executeChat - Creación de presupuestos", () => {
    it("Ejemplo 1: debe crear presupuesto con mes, año, categoría explícita, límite y porcentaje de alerta", async () => {
      mockAiToolsService.createBudget.mockResolvedValue({
        budgetId: "bgt-1",
        categoryId: "cat-alim",
        categoryName: "Alimentación",
        amountLimitCents: 20000,
        amountLimitEur: 200,
        periodMonth: 9,
        periodYear: 2026,
        alertThresholdPct: 90,
      });

      const message =
        "crea un presupuesto para supermercado mes septiembre 2026, categoria: alimentacion, limite mensual: 200, 90%.";

      const result = await service.executeChat("user-1", message);

      expect(mockAiToolsService.createBudget).toHaveBeenCalledWith("user-1", {
        categoryNameOrId: "alimentacion",
        amountLimitEur: 200,
        month: 9,
        year: 2026,
        alertThresholdPct: 90,
        fallbackCategoryNameOrId: "supermercado",
      });

      expect(result.content).toContain("✅ **Presupuesto creado con éxito:**");
      expect(result.content).toContain("200,00 €");
      expect(result.content).toContain("Alimentación");
      expect(result.content).toContain("9/2026");
      expect(result.content).toContain("90%");

      expect(result.toolExecutions).toHaveLength(1);
      expect(result.toolExecutions[0].toolName).toBe("create_budget");
      expect(result.toolExecutions[0].result.budgetId).toBe("bgt-1");
    });

    it("Ejemplo 2: debe crear presupuesto cuando se omite mes/año, infiriendo mes y año actual", async () => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      mockAiToolsService.createBudget.mockResolvedValue({
        budgetId: "bgt-2",
        categoryId: "cat-alim",
        categoryName: "Alimentación",
        amountLimitCents: 20000,
        amountLimitEur: 200,
        periodMonth: currentMonth,
        periodYear: currentYear,
        alertThresholdPct: 90,
      });

      const message =
        "crea un presupuesto para supermercado, categoria: alimentacion, limite mensual: 200, 90%.";

      const result = await service.executeChat("user-1", message);

      expect(mockAiToolsService.createBudget).toHaveBeenCalledWith("user-1", {
        categoryNameOrId: "alimentacion",
        amountLimitEur: 200,
        month: currentMonth,
        year: currentYear,
        alertThresholdPct: 90,
        fallbackCategoryNameOrId: "supermercado",
      });

      expect(result.content).toContain("✅ **Presupuesto creado con éxito:**");
      expect(result.content).toContain("Alimentación");
      expect(result.content).toContain("200,00 €");
      expect(result.toolExecutions[0].result.budgetId).toBe("bgt-2");
    });

    it("Ejemplo 3: debe crear presupuesto con formato '200/mes, 90%' extrayendo concepto supermercado", async () => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      mockAiToolsService.createBudget.mockResolvedValue({
        budgetId: "bgt-3",
        categoryId: "cat-super",
        categoryName: "Supermercado",
        amountLimitCents: 20000,
        amountLimitEur: 200,
        periodMonth: currentMonth,
        periodYear: currentYear,
        alertThresholdPct: 90,
      });

      const message = "crea un presupuesto para supermercado, 200/mes, 90%";

      const result = await service.executeChat("user-1", message);

      expect(mockAiToolsService.createBudget).toHaveBeenCalledWith("user-1", {
        categoryNameOrId: "supermercado",
        amountLimitEur: 200,
        month: currentMonth,
        year: currentYear,
        alertThresholdPct: 90,
        fallbackCategoryNameOrId: undefined,
      });

      expect(result.content).toContain("✅ **Presupuesto creado con éxito:**");
      expect(result.content).toContain("Supermercado");
      expect(result.toolExecutions[0].toolName).toBe("create_budget");
    });

    it("Variante libre 4: debe crear presupuesto con '300€ para Ocio al 85%'", async () => {
      const now = new Date();
      mockAiToolsService.createBudget.mockResolvedValue({
        budgetId: "bgt-4",
        categoryId: "cat-ocio",
        categoryName: "Ocio",
        amountLimitCents: 30000,
        amountLimitEur: 300,
        periodMonth: now.getMonth() + 1,
        periodYear: now.getFullYear(),
        alertThresholdPct: 85,
      });

      const message = "pon un presupuesto de 300€ para Ocio al 85%";

      const result = await service.executeChat("user-1", message);

      expect(mockAiToolsService.createBudget).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          categoryNameOrId: "ocio",
          amountLimitEur: 300,
          alertThresholdPct: 85,
        }),
      );
      expect(result.content).toContain("300,00 €");
    });

    it("Variante libre 5: debe crear presupuesto con 'limite mensual: 150 en restaurantes'", async () => {
      mockAiToolsService.createBudget.mockResolvedValue({
        budgetId: "bgt-5",
        categoryId: "cat-rest",
        categoryName: "Restaurantes y Bares",
        amountLimitCents: 15000,
        amountLimitEur: 150,
        periodMonth: 9,
        periodYear: 2026,
        alertThresholdPct: 80,
      });

      const message =
        "establece un presupuesto con limite mensual: 150 en restaurantes";

      await service.executeChat("user-1", message);

      expect(mockAiToolsService.createBudget).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          categoryNameOrId: "restaurantes",
          amountLimitEur: 150,
          alertThresholdPct: 80,
        }),
      );
    });

    it("debe solicitar el importe si el usuario solo indica la categoría para el presupuesto", async () => {
      const message = "quiero crear un presupuesto para gasolina";

      const result = await service.executeChat("user-1", message);

      expect(mockAiToolsService.createBudget).not.toHaveBeenCalled();
      expect(result.content).toContain("gasolina");
      expect(result.content).toContain("límite deseado");
    });
  });
});
