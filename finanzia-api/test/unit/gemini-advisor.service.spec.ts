import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { GeminiAdvisorService } from "../../src/infrastructure/ai/gemini-advisor.service";
import { AiToolsService } from "../../src/core/application/ai/ai-tools.service";
import { FinancialProfileService } from "../../src/core/application/ai/financial-profile.service";
import { RecommendationsService } from "../../src/core/application/recommendations/recommendations.service";

describe("GeminiAdvisorService (Natural Language Budget Creation & Human-in-the-Loop Actions)", () => {
  let service: GeminiAdvisorService;
  let mockAiToolsService: jest.Mocked<any>;
  let mockFinancialProfileService: jest.Mocked<any>;
  let mockConfigService: jest.Mocked<any>;
  let mockRecommendationsService: jest.Mocked<any>;

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
      findRecentTransactions: jest.fn(),
      findBudgetForCategory: jest.fn(),
      findSavingsGoalByName: jest.fn(),
      createDebt: jest.fn(),
      getDebts: jest.fn(),
      amortizeDebt: jest.fn(),
      simulateDebtPayoff: jest.fn(),
      analyzeDebtOptimization: jest.fn(),
    };

    mockFinancialProfileService = {
      buildSystemContext: jest
        .fn()
        .mockResolvedValue("Contexto de perfil de prueba"),
    };

    mockRecommendationsService = {
      getPendingRecommendations: jest.fn(),
      applyRecommendation: jest.fn(),
      rejectRecommendation: jest.fn(),
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
        {
          provide: RecommendationsService,
          useValue: mockRecommendationsService,
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

  describe("Supervisión Humana (Human-in-the-Loop) - Edición y Eliminación", () => {
    it("debe proponer la eliminación de un movimiento sin borrarlo directamente", async () => {
      mockAiToolsService.findRecentTransactions.mockResolvedValue([
        {
          id: "tx-rest-1",
          description: "Restaurante La Tagliatella",
          amountCents: -3500,
          accountName: "Cuenta Nómina",
          type: "EXPENSE",
        },
      ]);
      mockAiToolsService.proposeRecommendation.mockResolvedValue({
        recommendationId: "rec-del-tx",
        status: "PROPOSED",
        type: "EXPENSE_ALERT",
        title: 'Eliminar movimiento: "Restaurante La Tagliatella"',
      });

      const message = "elimina el movimiento de restaurante";
      const result = await service.executeChat("user-1", message);

      expect(mockAiToolsService.proposeRecommendation).toHaveBeenCalledWith(
        "user-1",
        "EXPENSE_ALERT",
        expect.stringContaining("Restaurante La Tagliatella"),
        expect.any(String),
        expect.objectContaining({
          actionType: "DELETE_TRANSACTION",
          transactionId: "tx-rest-1",
        }),
      );
      expect(result.content).toContain("Propuesta de Eliminación");
      expect(result.toolExecutions[0].toolName).toBe("propose_recommendation");
    });

    it("debe proponer la edición de un movimiento con el nuevo importe", async () => {
      mockAiToolsService.findRecentTransactions.mockResolvedValue([
        {
          id: "tx-cine-1",
          description: "Entrada Cine Cinesa",
          amountCents: -1200,
          accountName: "Cuenta Nómina",
          type: "EXPENSE",
        },
      ]);
      mockAiToolsService.proposeRecommendation.mockResolvedValue({
        recommendationId: "rec-edit-tx",
        status: "PROPOSED",
        type: "EXPENSE_ALERT",
        title: 'Editar movimiento: "Entrada Cine Cinesa"',
      });

      const message = "cambia el movimiento de cine a 15€";
      const result = await service.executeChat("user-1", message);

      expect(mockAiToolsService.proposeRecommendation).toHaveBeenCalledWith(
        "user-1",
        "EXPENSE_ALERT",
        expect.stringContaining("Entrada Cine Cinesa"),
        expect.any(String),
        expect.objectContaining({
          actionType: "UPDATE_TRANSACTION",
          transactionId: "tx-cine-1",
          amountCents: -1500,
        }),
      );
      expect(result.content).toContain("Propuesta de Modificación");
    });

    it("debe proponer la eliminación de un presupuesto sin borrarlo directamente", async () => {
      mockAiToolsService.findBudgetForCategory.mockResolvedValue({
        budgetId: "bgt-ocio-1",
        categoryId: "cat-ocio",
        categoryName: "Ocio y Cultura",
        amountLimitCents: 15000,
        periodMonth: 9,
        periodYear: 2026,
      });
      mockAiToolsService.proposeRecommendation.mockResolvedValue({
        recommendationId: "rec-del-bgt",
        status: "PROPOSED",
        type: "BUDGET_ADJUSTMENT",
        title: "Eliminar presupuesto: Ocio y Cultura",
      });

      const message = "elimina el presupuesto de ocio";
      const result = await service.executeChat("user-1", message);

      expect(mockAiToolsService.proposeRecommendation).toHaveBeenCalledWith(
        "user-1",
        "BUDGET_ADJUSTMENT",
        expect.stringContaining("Ocio y Cultura"),
        expect.any(String),
        expect.objectContaining({
          actionType: "DELETE_BUDGET",
          budgetId: "bgt-ocio-1",
        }),
      );
      expect(result.content).toContain(
        "Propuesta de Eliminación de Presupuesto",
      );
    });

    it("debe proponer la edición de un presupuesto con el nuevo límite mensual", async () => {
      mockAiToolsService.findBudgetForCategory.mockResolvedValue({
        budgetId: "bgt-super-1",
        categoryId: "cat-super",
        categoryName: "Supermercado",
        amountLimitCents: 20000,
        alertThresholdPct: 90,
        periodMonth: 9,
        periodYear: 2026,
      });
      mockAiToolsService.proposeRecommendation.mockResolvedValue({
        recommendationId: "rec-edit-bgt",
        status: "PROPOSED",
        type: "BUDGET_ADJUSTMENT",
        title: "Ajustar presupuesto: Supermercado",
      });

      const message = "modifica el presupuesto de supermercado a 250€";
      const result = await service.executeChat("user-1", message);

      expect(mockAiToolsService.proposeRecommendation).toHaveBeenCalledWith(
        "user-1",
        "BUDGET_ADJUSTMENT",
        expect.stringContaining("Supermercado"),
        expect.any(String),
        expect.objectContaining({
          actionType: "UPDATE_BUDGET_LIMIT",
          budgetId: "bgt-super-1",
          newLimitCents: 25000,
        }),
      );
      expect(result.content).toContain("Propuesta de Ajuste Presupuestario");
    });

    it("debe proponer la eliminación de una meta de ahorro sin destruirla directamente", async () => {
      mockAiToolsService.findSavingsGoalByName.mockResolvedValue({
        goalId: "goal-vac-1",
        name: "Vacaciones Japón",
        targetAmountCents: 300000,
        currentAmountCents: 100000,
      });
      mockAiToolsService.proposeRecommendation.mockResolvedValue({
        recommendationId: "rec-del-goal",
        status: "PROPOSED",
        type: "SAVINGS_BOOST",
        title: 'Eliminar meta de ahorro: "Vacaciones Japón"',
      });

      const message = "elimina la meta de vacaciones japon";
      const result = await service.executeChat("user-1", message);

      expect(mockAiToolsService.proposeRecommendation).toHaveBeenCalledWith(
        "user-1",
        "SAVINGS_BOOST",
        expect.stringContaining("Vacaciones Japón"),
        expect.any(String),
        expect.objectContaining({
          actionType: "DELETE_SAVINGS_GOAL",
          goalId: "goal-vac-1",
        }),
      );
      expect(result.content).toContain(
        "Propuesta de Eliminación de Meta de Ahorro",
      );
    });

    it("debe proponer la edición del objetivo de una meta de ahorro", async () => {
      mockAiToolsService.findSavingsGoalByName.mockResolvedValue({
        goalId: "goal-emerg-1",
        name: "Fondo de Emergencia",
        targetAmountCents: 300000,
        currentAmountCents: 150000,
      });
      mockAiToolsService.proposeRecommendation.mockResolvedValue({
        recommendationId: "rec-edit-goal",
        status: "PROPOSED",
        type: "SAVINGS_BOOST",
        title: 'Editar meta de ahorro: "Fondo de Emergencia"',
      });

      const message = "cambia la meta fondo de emergencia a 4000 euros";
      const result = await service.executeChat("user-1", message);

      expect(mockAiToolsService.proposeRecommendation).toHaveBeenCalledWith(
        "user-1",
        "SAVINGS_BOOST",
        expect.stringContaining("Fondo de Emergencia"),
        expect.any(String),
        expect.objectContaining({
          actionType: "UPDATE_SAVINGS_GOAL",
          goalId: "goal-emerg-1",
          targetAmountCents: 400000,
        }),
      );
      expect(result.content).toContain(
        "Propuesta de Modificación de Meta de Ahorro",
      );
    });

    it("debe aplicar la recomendación pendiente cuando el usuario responde 'apruebo'", async () => {
      mockRecommendationsService.getPendingRecommendations.mockResolvedValue([
        {
          id: "rec-pending-1",
          title: 'Eliminar movimiento: "Restaurante"',
          status: "PROPOSED",
        },
      ]);
      mockRecommendationsService.applyRecommendation.mockResolvedValue({
        applied: true,
      });

      const message = "sí, apruebo la propuesta";
      const result = await service.executeChat("user-1", message);

      expect(
        mockRecommendationsService.applyRecommendation,
      ).toHaveBeenCalledWith("user-1", "rec-pending-1");
      expect(result.content).toContain(
        "Propuesta Aprobada y Ejecutada con Éxito",
      );
    });

    it("debe descartar la recomendación pendiente cuando el usuario responde 'rechazo'", async () => {
      mockRecommendationsService.getPendingRecommendations.mockResolvedValue([
        {
          id: "rec-pending-1",
          title: 'Eliminar movimiento: "Restaurante"',
          status: "PROPOSED",
        },
      ]);
      mockRecommendationsService.rejectRecommendation.mockResolvedValue({
        rejected: true,
      });

      const message = "rechazo la propuesta, no la apliques";
      const result = await service.executeChat("user-1", message);

      expect(
        mockRecommendationsService.rejectRecommendation,
      ).toHaveBeenCalledWith("user-1", "rec-pending-1");
      expect(result.content).toContain("Propuesta Descartada");
    });
  });

  describe("executeChat - Gestión y Asesoría de Deudas", () => {
    it("debe responder a la consulta de deudas llamando a getDebts y listando los pasivos", async () => {
      mockAiToolsService.getDebts.mockResolvedValue({
        activeDebts: [
          {
            id: "d-1",
            concept: "Préstamo Coche",
            creditor: "Banco Santander",
            initialAmountEur: 15000,
            remainingAmountEur: 8500,
            interestRatePercent: 5.5,
            interestRateType: "ANNUAL",
            minimumMonthlyPaymentEur: 280,
            monthlyInterestCostEur: 38.96,
            status: "ACTIVE",
          },
        ],
        summary: {
          totalRemainingEur: 8500,
          totalInitialEur: 15000,
          activeDebtsCount: 1,
          totalMonthlyCommitmentEur: 280,
          totalMonthlyInterestCostEur: 38.96,
          averageInterestRatePercent: 5.5,
        },
        paidOffDebts: [],
      });

      const result = await service.executeChat(
        "user-1",
        "¿Cuáles son mis deudas activas?",
      );

      expect(mockAiToolsService.getDebts).toHaveBeenCalledWith("user-1", false);
      expect(result.content).toContain("Préstamo Coche");
      expect(result.content).toContain("8500,00 €");
      expect(result.content).toContain("5,50%");
    });

    it("debe dar de alta una deuda en lenguaje natural", async () => {
      mockAiToolsService.createDebt.mockResolvedValue({
        debtId: "d-new-1",
        concept: "Préstamo Coche",
        creditor: null,
        initialAmountEur: 12000,
        remainingAmountEur: 12000,
        interestRatePercent: 6,
        interestRateType: "ANNUAL",
        minimumMonthlyPaymentEur: null,
        status: "ACTIVE",
      });

      const message = "registra un prestamo de coche de 12000 € al 6% anual";
      const result = await service.executeChat("user-1", message);

      expect(mockAiToolsService.createDebt).toHaveBeenCalledWith("user-1", {
        concept: "Préstamo Coche",
        amountEur: 12000,
        interestRatePercent: 6,
        interestRateType: "ANNUAL",
      });
      expect(result.content).toContain(
        "✅ **Nueva Deuda Registrada con Éxito:**",
      );
      expect(result.content).toContain("12000,00 €");
    });

    it("debe amortizar una deuda e informar si queda 100% liquidada e inmutable", async () => {
      mockAiToolsService.amortizeDebt.mockResolvedValue({
        debtId: "d-coche",
        concept: "Préstamo Coche",
        amountAmortizedEur: 500,
        principalAmortizedEur: 485,
        interestCoveredEur: 15,
        remainingAmountEur: 0,
        isFullyPaid: true,
        paidOffAt: "2026-09-25T00:00:00Z",
        isImmutable: true,
        accountDeducted: "Cuenta Nómina",
        message: "Deuda liquidada",
      });

      const message =
        "amortiza 500 euros a mi prestamo coche desde cuenta nomina";
      const result = await service.executeChat("user-1", message);

      expect(mockAiToolsService.amortizeDebt).toHaveBeenCalledWith("user-1", {
        conceptKeyword: "coche",
        amountEur: 500,
        fromAccountName: "nomina",
      });
      expect(result.content).toContain(
        "🏆 **¡ENHORABUENA! Deuda Liquidada al 100%:**",
      );
      expect(result.content).toContain("Inmutabilidad Activada");
    });

    it("debe simular plan acelerado comparativo de amortización", async () => {
      mockAiToolsService.simulateDebtPayoff.mockResolvedValue({
        strategy: "AVALANCHE",
        totalMonths: 15,
        totalInterestPaidCents: 20000n,
        baselineMonths: 24,
        baselineInterestPaidCents: 50000n,
        monthsSaved: 9,
        interestSavedCents: 30000n,
        payoffOrder: [],
      });

      const message =
        "simula pagar 150 euros al mes a mis deudas con avalancha";
      const result = await service.executeChat("user-1", message);

      expect(mockAiToolsService.simulateDebtPayoff).toHaveBeenCalledWith(
        "user-1",
        {
          extraMonthlyBudgetEur: 150,
          strategy: "AVALANCHE",
        },
      );
      expect(result.content).toContain("Simulación de Amortización Acelerada");
      expect(result.content).toContain("9 meses antes");
      expect(result.content).toContain("300,00 €");
    });

    it("debe proponer optimización de gastos para acelerar pago de deudas", async () => {
      mockAiToolsService.analyzeDebtOptimization.mockResolvedValue({
        hasDebts: true,
        totalDebtsCount: 2,
        totalRemainingEur: 5000,
        suggestedReallocation: {
          sourceCategoryName: "Restaurantes",
          currentMonthlySpendEur: 250,
          suggestedMonthlyCutEur: 50,
        },
        simulation: {
          strategy: "AVALANCHE",
          extraMonthlyBudgetEur: 50,
          monthsSaved: 6,
          interestSavedEur: 180,
          totalMonthsToFreedom: 16,
          totalInterestPaidEur: 210,
        },
      });

      const message =
        "como puedo pagar mis deudas antes optimizando mis gastos";
      const result = await service.executeChat("user-1", message);

      expect(mockAiToolsService.analyzeDebtOptimization).toHaveBeenCalledWith(
        "user-1",
      );
      expect(result.content).toContain(
        "Plan de Optimización Financiera de Pasivos",
      );
      expect(result.content).toContain("Restaurantes");
      expect(result.content).toContain("50,00 €/mes");
      expect(result.content).toContain("6 meses antes");
    });
  });
});
