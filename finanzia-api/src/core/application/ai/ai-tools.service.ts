import { Injectable, Logger, Inject, forwardRef } from "@nestjs/common";
import {
  IFinancialAnalyticsPort,
  FINANCIAL_ANALYTICS_PORT,
} from "../ports/financial-analytics.port";
import { MultiStepPlannerService } from "./multi-step-planner.service";
import { TransactionLearningService } from "./transaction-learning.service";
import { BudgetsService } from "../budgets/budgets.service";
import { TransactionsService } from "../transactions/transactions.service";
import {
  IAccountRepository,
  ACCOUNT_REPOSITORY,
} from "../../domain/repositories/account.repository.interface";
import {
  ICategoryRepository,
  CATEGORY_REPOSITORY,
} from "../../domain/repositories/category.repository.interface";
import { TransactionType } from "../../domain/types/financial.types";

export interface CreateBudgetToolResult {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  amountLimitCents: number;
  amountLimitEur: number;
  periodMonth: number;
  periodYear: number;
  alertThresholdPct: number;
}

export interface CreateTransactionToolResult {
  transactionId: string;
  type: "EXPENSE" | "INCOME";
  amountCents: number;
  amountEur: number;
  description: string;
  transactionDate: string;
  accountId: string;
  accountName: string;
  categoryId?: string | null;
  categoryName?: string | null;
  newAccountBalanceCents: number;
  newAccountBalanceEur: number;
}

export interface FinancialSummaryResult {
  month: number;
  year: number;
  totalIncomeCents: number;
  totalExpenseCents: number;
  netSavingsCents: number;
  savingsRatePercent: number;
  transactionCount: number;
  currency: string;
}

export interface CategoryExpenseItem {
  categoryId: string;
  categoryName: string;
  categoryIcon?: string | null;
  totalAmountCents: number;
  transactionCount: number;
  percentageOfTotal: number;
}

export interface BudgetStatusItem {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  limitCents: number;
  spentCents: number;
  remainingCents: number;
  percentageUsed: number;
  status: "ON_TRACK" | "WARNING" | "EXCEEDED";
}

export interface ProposeRecommendationResult {
  recommendationId: string;
  status: string;
  type: string;
  title: string;
}

export interface AccountBalanceItem {
  accountId: string;
  name: string;
  type: string;
  currency: string;
  balanceCents: number;
}

export interface TotalBalancesResult {
  totalBalanceCents: number;
  accounts: AccountBalanceItem[];
  currency: string;
}

export interface SavingsGoalItem {
  goalId: string;
  name: string;
  targetAmountCents: number;
  currentAmountCents: number;
  progressPercent: number;
  targetDate: string | null;
  isCompleted: boolean;
}

export interface HistoricalBaselineResult {
  monthsAnalyzed: number;
  averageMonthlyIncomeCents: number;
  averageMonthlyFixedExpensesCents: number;
  averageMonthlyVariableExpensesCents: number;
  averageMonthlyTotalExpensesCents: number;
  averageMonthlyNetSavingsCents: number;
  averageSavingsRatePercent: number;
  topVariableCategories: Array<{
    categoryId: string;
    categoryName: string;
    monthlyAverageCents: number;
    percentageOfVariable: number;
  }>;
}

export interface PlanCategoryCutSuggestion {
  categoryId: string;
  categoryName: string;
  currentMonthlyAverageCents: number;
  suggestedCutCents: number;
  newMonthlyTargetCents: number;
  reason: string;
}

export interface MultiStepSavingsPlanResult {
  goalName: string;
  targetAmountCents: number;
  months: number;
  monthlyQuotaCents: number;
  averageNetSavingsCents: number;
  gapCents: number;
  isViableWithCurrentSavings: boolean;
  suggestedCuts: PlanCategoryCutSuggestion[];
  summary: string;
  recommendationId?: string;
}

export interface ProactiveInsightItem {
  type: "EXPENSE_SURGE" | "GOAL_PROGRESS" | "BUDGET_WARNING";
  title: string;
  description: string;
  importance: "HIGH" | "MEDIUM" | "INFO";
  metric?: {
    label: string;
    value: string;
    deviationPercent?: number;
  };
}

export interface CategorizationResult {
  suggestedCategoryId: string;
  suggestedCategoryName: string;
  source: "LEARNED_USER_RULE" | "PATTERN_MATCH" | "SEMANTIC_FALLBACK";
  confidence: number;
}

@Injectable()
export class AiToolsService {
  private readonly logger = new Logger(AiToolsService.name);

  constructor(
    @Inject(FINANCIAL_ANALYTICS_PORT)
    private readonly analytics: IFinancialAnalyticsPort,
    @Inject(forwardRef(() => MultiStepPlannerService))
    private readonly multiStepPlanner: MultiStepPlannerService,
    @Inject(forwardRef(() => TransactionLearningService))
    private readonly transactionLearning: TransactionLearningService,
    @Inject(forwardRef(() => BudgetsService))
    private readonly budgetsService: BudgetsService,
    @Inject(forwardRef(() => TransactionsService))
    private readonly transactionsService: TransactionsService,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  /**
   * Herramienta 1: Resumen financiero determinista para un mes y año concretos
   */
  async getFinancialSummary(
    userId: string,
    month: number,
    year: number,
  ): Promise<FinancialSummaryResult> {
    this.logger.log(
      `[Tool] getFinancialSummary para usuario ${userId}, ${month}/${year}`,
    );
    return await this.analytics.getFinancialSummary(userId, month, year);
  }

  /**
   * Herramienta 2: Desglose de gastos por categoría en un rango de fechas
   */
  async getExpensesByCategory(
    userId: string,
    startDateStr: string,
    endDateStr: string,
    categoryId?: string,
  ): Promise<CategoryExpenseItem[]> {
    this.logger.log(
      `[Tool] getExpensesByCategory para usuario ${userId} entre ${startDateStr} y ${endDateStr}`,
    );
    return await this.analytics.getExpensesByCategory(
      userId,
      startDateStr,
      endDateStr,
      categoryId,
    );
  }

  /**
   * Herramienta 3: Consulta el estado de ejecución y ritmo de presupuestos del usuario
   */
  async getBudgetStatus(
    userId: string,
    month: number,
    year: number,
  ): Promise<BudgetStatusItem[]> {
    this.logger.log(
      `[Tool] getBudgetStatus para usuario ${userId}, ${month}/${year}`,
    );
    return await this.analytics.getBudgetStatus(userId, month, year);
  }

  /**
   * Herramienta 4: Proponer una recomendación estructurada para aprobación humana
   */
  async proposeRecommendation(
    userId: string,
    type: string,
    title: string,
    details: string,
    actionPayload: any,
  ): Promise<ProposeRecommendationResult> {
    this.logger.log(
      `[Tool] proposeRecommendation: ${title} para usuario ${userId}`,
    );
    return await this.analytics.proposeRecommendation(
      userId,
      type,
      title,
      details,
      actionPayload,
    );
  }

  /**
   * Herramienta 5: Consultar saldos consolidados de cuentas
   */
  async getAccountBalances(userId: string): Promise<TotalBalancesResult> {
    this.logger.log(`[Tool] getAccountBalances para usuario ${userId}`);
    return await this.analytics.getAccountBalances(userId);
  }

  /**
   * Herramienta 6: Consultar estado y progreso de metas de ahorro
   */
  async getSavingsGoals(userId: string): Promise<SavingsGoalItem[]> {
    this.logger.log(`[Tool] getSavingsGoals para usuario ${userId}`);
    return await this.analytics.getSavingsGoals(userId);
  }

  /**
   * Herramienta 7: Planificación multi-paso determinista de metas de ahorro
   */
  async calculateSavingsPlan(
    userId: string,
    targetAmountCents: number,
    months: number,
    goalName?: string,
  ): Promise<MultiStepSavingsPlanResult> {
    this.logger.log(
      `[Tool] calculateSavingsPlan para usuario ${userId}: ${targetAmountCents} céntimos en ${months} meses`,
    );
    return await this.multiStepPlanner.calculateGoalPlan(
      userId,
      targetAmountCents,
      months,
      goalName,
    );
  }

  /**
   * Herramienta 8: Clasificación inteligente de transacciones con feedback loop
   */
  async categorizeTransaction(
    userId: string,
    description: string,
  ): Promise<CategorizationResult> {
    this.logger.log(
      `[Tool] categorizeTransaction para usuario ${userId}: "${description}"`,
    );
    return await this.transactionLearning.categorizeTransaction(
      userId,
      description,
    );
  }

  /**
   * Herramienta 9: Alertas proactivas ante desvíos y progreso de metas
   */
  async getProactiveInsights(userId: string): Promise<ProactiveInsightItem[]> {
    this.logger.log(`[Tool] getProactiveInsights para usuario ${userId}`);
    return await this.analytics.getProactiveInsights(userId);
  }

  /**
   * Herramienta 10: Consulta la línea base histórica de 3 meses (Fijos vs Variables)
   */
  async getHistoricalBaseline(
    userId: string,
  ): Promise<HistoricalBaselineResult> {
    this.logger.log(`[Tool] getHistoricalBaseline para usuario ${userId}`);
    return await this.analytics.getHistoricalBaseline(userId);
  }

  /**
   * Herramienta 11: Crear o actualizar presupuesto para una categoría a partir de lenguaje natural
   */
  async createBudget(
    userId: string,
    params: {
      categoryNameOrId: string;
      amountLimitEur: number;
      month?: number;
      year?: number;
      alertThresholdPct?: number;
      fallbackCategoryNameOrId?: string;
    },
  ): Promise<CreateBudgetToolResult> {
    this.logger.log(
      `[Tool] createBudget para usuario ${userId}: categoría "${params.categoryNameOrId}", ${params.amountLimitEur} €`,
    );

    const now = new Date();
    const periodMonth =
      params.month && params.month >= 1 && params.month <= 12
        ? params.month
        : now.getMonth() + 1;
    const periodYear =
      params.year && params.year >= 2000 ? params.year : now.getFullYear();
    const alertThresholdPct =
      params.alertThresholdPct &&
      params.alertThresholdPct >= 1 &&
      params.alertThresholdPct <= 100
        ? params.alertThresholdPct
        : 80;
    const amountLimitCents = Math.round(params.amountLimitEur * 100);

    if (amountLimitCents <= 0) {
      throw new Error(
        "El límite del presupuesto debe ser un importe positivo mayor a cero.",
      );
    }

    // Resolver la categoría (por ID o por nombre difuso, priorizando categorías de gasto EXPENSE)
    const allCategories = await this.categoryRepository.findAllForUser(userId);
    const expenseCategories = allCategories.filter((c) => c.type === "EXPENSE");
    const categories =
      expenseCategories.length > 0 ? expenseCategories : allCategories;

    const CATEGORY_SYNONYMS: Record<string, string[]> = {
      alimentacion: [
        "comida",
        "super",
        "supermercado",
        "comestibles",
        "alimentos",
        "despensa",
        "compra semanal",
      ],
      supermercado: [
        "super",
        "mercadona",
        "carrefour",
        "lidl",
        "dia",
        "alcampo",
        "alimentacion",
        "comida",
      ],
      combustible: [
        "gasolina",
        "diesel",
        "gasoil",
        "repsol",
        "cepsa",
        "bp",
        "combustibles",
      ],
      transporte: [
        "metro",
        "autobus",
        "bus",
        "tren",
        "renfe",
        "taxi",
        "uber",
        "cabify",
        "billete",
        "gasolina",
      ],
      "restaurantes y bares": [
        "restaurante",
        "restaurantes",
        "bar",
        "bares",
        "cenas",
        "comidas",
        "comer fuera",
        "cafeteria",
      ],
      "ocio y estilo de vida": [
        "ocio",
        "cultura",
        "cine",
        "salidas",
        "conciertos",
        "teatro",
        "fiesta",
        "diversion",
      ],
      vivienda: ["casa", "piso", "alquiler", "hipoteca", "comunidad"],
      "suministros (luz, agua, gas)": [
        "suministros",
        "luz",
        "agua",
        "gas",
        "electricidad",
        "internet",
        "fibra",
        "telefono",
      ],
      "salud y bienestar": [
        "salud",
        "farmacia",
        "medico",
        "dentista",
        "optica",
        "medicamentos",
      ],
      "hobbies y deportes": [
        "gym",
        "gimnasio",
        "deporte",
        "fitness",
        "padel",
        "futbol",
        "hobbies",
      ],
    };

    const resolveCategory = (targetStr: string) => {
      const searchTarget = (targetStr || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

      if (!searchTarget) return undefined;

      // 1. Coincidencia por ID directo
      let matched = categories.find((c) => c.id === targetStr.trim());
      if (matched) return matched;

      // 2. Coincidencia exacta de nombre
      matched = categories.find((c) => {
        const catNorm = c.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();
        return catNorm === searchTarget;
      });
      if (matched) return matched;

      // 3. Coincidencia por palabra completa o prefijo (ej: "ocio" -> "Ocio y Estilo de Vida")
      const words = searchTarget.split(/\s+/).filter((w) => w.length >= 3);
      matched = categories.find((c) => {
        const catNorm = c.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();
        const catWords = catNorm.split(/\s+/);
        return words.some((w) =>
          catWords.some(
            (cw) => cw === w || cw.startsWith(w) || w.startsWith(cw),
          ),
        );
      });
      if (matched) return matched;

      // 4. Coincidencia parcial por inclusión
      matched = categories.find((c) => {
        const catNorm = c.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();
        return catNorm.includes(searchTarget) || searchTarget.includes(catNorm);
      });
      if (matched) return matched;

      // 5. Coincidencia por sinónimos comunes
      for (const [keyCat, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
        if (
          searchTarget === keyCat ||
          synonyms.includes(searchTarget) ||
          synonyms.some(
            (s) => searchTarget.includes(s) || s.includes(searchTarget),
          )
        ) {
          const catByKey = categories.find((c) => {
            const catNorm = c.name
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .trim();
            return (
              catNorm === keyCat ||
              catNorm.includes(keyCat) ||
              synonyms.some((s) => catNorm.includes(s))
            );
          });
          if (catByKey) return catByKey;
        }
      }

      return undefined;
    };

    let matchedCategory = resolveCategory(params.categoryNameOrId);

    // Si no coincide y se proporcionó una categoría/concepto alternativo (ej. "supermercado" con "alimentacion")
    if (!matchedCategory && params.fallbackCategoryNameOrId) {
      matchedCategory = resolveCategory(params.fallbackCategoryNameOrId);
    }

    if (!matchedCategory) {
      const availableNames = categories
        .slice(0, 8)
        .map((c) => c.name)
        .join(", ");
      throw new Error(
        `No se ha encontrado ninguna categoría que coincida con "${params.categoryNameOrId}". Categorías disponibles: ${availableNames}.`,
      );
    }

    const budget = await this.budgetsService.createOrUpdateBudget(userId, {
      categoryId: matchedCategory.id,
      amountLimitCents,
      periodMonth,
      periodYear,
      alertThresholdPct,
    });

    return {
      budgetId: budget.id,
      categoryId: matchedCategory.id,
      categoryName: matchedCategory.name,
      amountLimitCents,
      amountLimitEur: params.amountLimitEur,
      periodMonth,
      periodYear,
      alertThresholdPct,
    };
  }

  /**
   * Herramienta 12: Registrar un gasto o ingreso a partir de lenguaje natural
   */
  async createTransaction(
    userId: string,
    params: {
      type: "EXPENSE" | "INCOME";
      amountEur: number;
      description: string;
      accountNameOrId?: string;
      categoryNameOrId?: string;
      date?: string;
    },
  ): Promise<CreateTransactionToolResult> {
    this.logger.log(
      `[Tool] createTransaction (${params.type}) para usuario ${userId}: "${params.description}", ${params.amountEur} €`,
    );

    const absAmountEur = Math.abs(params.amountEur);
    const amountCents = Math.round(absAmountEur * 100);

    if (amountCents <= 0) {
      throw new Error("El importe de la transacción debe ser mayor a cero.");
    }

    // 1. Resolver cuenta del usuario
    const accounts = await this.accountRepository.findAllByUserId(userId);
    if (!accounts || accounts.length === 0) {
      throw new Error(
        "No tienes ninguna cuenta bancaria registrada para vincular esta transacción. Por favor, añade primero una cuenta.",
      );
    }

    let targetAccount = accounts[0];
    if (params.accountNameOrId) {
      const accSearch = params.accountNameOrId
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

      const matchedAcc =
        accounts.find((a) => a.id === params.accountNameOrId) ||
        accounts.find((a) => {
          const nameNorm = a.name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
          return (
            nameNorm === accSearch ||
            nameNorm.includes(accSearch) ||
            accSearch.includes(nameNorm)
          );
        });

      if (matchedAcc) {
        targetAccount = matchedAcc;
      }
    } else {
      // Buscar cuenta de tipo CHECKING (corriente) por defecto si tiene varias
      const checkingAccount = accounts.find((a) => a.type === "CHECKING");
      if (checkingAccount) {
        targetAccount = checkingAccount;
      }
    }

    // 2. Resolver categoría
    const categories = await this.categoryRepository.findAllForUser(userId);
    let targetCategory: any = null;

    if (params.categoryNameOrId) {
      const catSearch = params.categoryNameOrId
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

      targetCategory =
        categories.find((c) => c.id === params.categoryNameOrId) ||
        categories.find((c) => {
          const nameNorm = c.name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
          return (
            nameNorm === catSearch ||
            nameNorm.includes(catSearch) ||
            catSearch.includes(nameNorm)
          );
        });
    }

    // Si no se especificó o no se encontró categoría, predecir con categorización inteligente
    if (!targetCategory && params.description) {
      const autoCat = await this.transactionLearning.categorizeTransaction(
        userId,
        params.description,
      );
      if (
        autoCat &&
        (autoCat.suggestedCategoryId || autoCat.suggestedCategoryName)
      ) {
        targetCategory =
          categories.find((c) => c.id === autoCat.suggestedCategoryId) ||
          categories.find((c) => {
            const nameNorm = c.name
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .trim();
            const sugNorm = (autoCat.suggestedCategoryName || "")
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .trim();
            if (
              nameNorm === sugNorm ||
              nameNorm.includes(sugNorm) ||
              sugNorm.includes(nameNorm)
            ) {
              return true;
            }
            const sugWords = sugNorm.split(/\s+/).filter((w) => w.length >= 3);
            const nameWords = nameNorm.split(/\s+/);
            return sugWords.some((w) =>
              nameWords.some(
                (nw) => nw === w || nw.startsWith(w) || w.startsWith(nw),
              ),
            );
          }) ||
          null;
      }
    }

    // 3. Resolver fecha
    let transactionDate = new Date();
    if (params.date) {
      const parsedDate = new Date(params.date);
      if (!isNaN(parsedDate.getTime())) {
        transactionDate = parsedDate;
      }
    }

    const typeEnum =
      params.type === "INCOME"
        ? TransactionType.INCOME
        : TransactionType.EXPENSE;

    const result = await this.transactionsService.createTransaction(userId, {
      accountId: targetAccount.id,
      categoryId: targetCategory ? targetCategory.id : undefined,
      amountCents,
      type: typeEnum,
      transactionDate: transactionDate.toISOString(),
      description:
        params.description.trim() ||
        (params.type === "INCOME" ? "Ingreso" : "Gasto"),
    });

    return {
      transactionId: result.transaction.id,
      type: params.type,
      amountCents: Number(result.transaction.amountCents),
      amountEur: absAmountEur,
      description: result.transaction.description,
      transactionDate:
        result.transaction.transactionDate instanceof Date
          ? result.transaction.transactionDate.toISOString()
          : String(result.transaction.transactionDate),
      accountId: targetAccount.id,
      accountName: targetAccount.name,
      categoryId: targetCategory?.id || null,
      categoryName: targetCategory?.name || "Sin categoría",
      newAccountBalanceCents: result.newAccountBalanceCents,
      newAccountBalanceEur: result.newAccountBalanceCents / 100,
    };
  }

  /**
   * Helper para localizar movimientos recientes por búsqueda difusa o importe
   */
  async findRecentTransactions(
    userId: string,
    criteria?: {
      searchQuery?: string;
      amountEur?: number;
      limit?: number;
    },
  ): Promise<any[]> {
    const limit = criteria?.limit || 20;
    const result = await this.transactionsService.getTransactions(userId, {
      limit,
      page: 1,
    });
    let items = result.items || [];

    if (criteria?.searchQuery) {
      const q = criteria.searchQuery
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
      items = items.filter((tx) => {
        const desc = tx.description
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        return desc.includes(q) || q.includes(desc);
      });
    }

    if (criteria?.amountEur !== undefined) {
      const targetCents = Math.round(Math.abs(criteria.amountEur) * 100);
      items = items.filter(
        (tx) => Math.abs(Number(tx.amountCents)) === targetCents,
      );
    }

    return items;
  }

  /**
   * Helper para localizar un presupuesto por categoría y mes/año
   */
  async findBudgetForCategory(
    userId: string,
    categoryNameOrId: string,
    month: number,
    year: number,
  ): Promise<any | null> {
    const pacingRes = await this.budgetsService.getBudgetPacing(
      userId,
      month,
      year,
    );
    if (!pacingRes || !pacingRes.data) return null;

    const searchTarget = categoryNameOrId
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    return (
      pacingRes.data.find(
        (b: any) =>
          b.categoryId === categoryNameOrId || b.budgetId === categoryNameOrId,
      ) ||
      pacingRes.data.find((b: any) => {
        const catNorm = b.categoryName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();
        return (
          catNorm === searchTarget ||
          catNorm.includes(searchTarget) ||
          searchTarget.includes(catNorm)
        );
      }) ||
      null
    );
  }

  /**
   * Helper para localizar una meta de ahorro por nombre
   */
  async findSavingsGoalByName(
    userId: string,
    goalNameOrId: string,
  ): Promise<SavingsGoalItem | null> {
    const goals = await this.analytics.getSavingsGoals(userId);
    if (!goals || goals.length === 0) return null;

    const searchTarget = goalNameOrId
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    return (
      goals.find((g) => g.goalId === goalNameOrId) ||
      goals.find((g) => {
        const gNorm = g.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();
        return (
          gNorm === searchTarget ||
          gNorm.includes(searchTarget) ||
          searchTarget.includes(gNorm)
        );
      }) ||
      null
    );
  }
}
