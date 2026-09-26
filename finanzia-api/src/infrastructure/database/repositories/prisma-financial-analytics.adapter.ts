import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import {
  FinancialSummaryResult,
  CategoryExpenseItem,
  BudgetStatusItem,
  ProposeRecommendationResult,
  TotalBalancesResult,
  SavingsGoalItem,
  HistoricalBaselineResult,
  ProactiveInsightItem,
} from "../../../core/application/ai/ai-tools.service";
import { IFinancialAnalyticsPort } from "../../../core/application/ports/financial-analytics.port";
import { RecommendationType as PrismaRecommendationType } from "@prisma/client";

const FIXED_EXPENSE_KEYWORDS = [
  "alquiler",
  "hipoteca",
  "comunidad",
  "iberdrola",
  "endesa",
  "naturgy",
  "suministro",
  "luz",
  "gas",
  "agua",
  "seguro",
  "salud",
  "educacion",
  "colegio",
  "universidad",
  "impuesto",
  "tasa",
];

@Injectable()
export class PrismaFinancialAnalyticsAdapter implements IFinancialAnalyticsPort {
  private readonly logger = new Logger(PrismaFinancialAnalyticsAdapter.name);

  constructor(private readonly prisma: PrismaService) {}

  async getFinancialSummary(
    userId: string,
    month: number,
    year: number,
  ): Promise<FinancialSummaryResult> {
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    const transactions = await this.prisma.transaction.findMany({
      where: {
        account: { userId },
        transactionDate: { gte: startDate, lt: endDate },
      },
      select: {
        type: true,
        amountCents: true,
      },
    });

    let totalIncomeCents = 0;
    let totalExpenseCents = 0;

    for (const tx of transactions) {
      const amount = Math.abs(Number(tx.amountCents));
      if (tx.type === "INCOME") {
        totalIncomeCents += amount;
      } else if (tx.type === "EXPENSE") {
        totalExpenseCents += amount;
      }
    }

    const netSavingsCents = totalIncomeCents - totalExpenseCents;
    const savingsRatePercent =
      totalIncomeCents > 0
        ? Number(((netSavingsCents / totalIncomeCents) * 100).toFixed(2))
        : 0;

    return {
      month,
      year,
      totalIncomeCents,
      totalExpenseCents,
      netSavingsCents,
      savingsRatePercent,
      transactionCount: transactions.length,
      currency: "EUR",
    };
  }

  async getExpensesByCategory(
    userId: string,
    startDateStr: string,
    endDateStr: string,
    categoryId?: string,
  ): Promise<CategoryExpenseItem[]> {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    const whereClause: any = {
      account: { userId },
      type: "EXPENSE",
      transactionDate: { gte: startDate, lte: endDate },
    };

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    const transactions = await this.prisma.transaction.findMany({
      where: whereClause,
      include: {
        category: true,
      },
    });

    const categoryMap = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        categoryIcon?: string | null;
        totalAmountCents: number;
        transactionCount: number;
      }
    >();

    let totalGlobalExpenses = 0;

    for (const tx of transactions) {
      const catId = tx.categoryId || "uncategorized";
      const catName = tx.category ? tx.category.name : "Sin categoría";
      const catIcon = tx.category ? tx.category.icon : null;
      const amount = Math.abs(Number(tx.amountCents));

      totalGlobalExpenses += amount;

      const existing = categoryMap.get(catId);
      if (existing) {
        existing.totalAmountCents += amount;
        existing.transactionCount += 1;
      } else {
        categoryMap.set(catId, {
          categoryId: catId,
          categoryName: catName,
          categoryIcon: catIcon,
          totalAmountCents: amount,
          transactionCount: 1,
        });
      }
    }

    const result: CategoryExpenseItem[] = Array.from(categoryMap.values()).map(
      (item) => ({
        ...item,
        percentageOfTotal:
          totalGlobalExpenses > 0
            ? Number(
                ((item.totalAmountCents / totalGlobalExpenses) * 100).toFixed(
                  1,
                ),
              )
            : 0,
      }),
    );

    result.sort((a, b) => b.totalAmountCents - a.totalAmountCents);
    return result;
  }

  async getBudgetStatus(
    userId: string,
    month: number,
    year: number,
  ): Promise<BudgetStatusItem[]> {
    const budgets = await this.prisma.budget.findMany({
      where: {
        userId,
        periodMonth: month,
        periodYear: year,
      },
      include: {
        category: true,
      },
    });

    if (budgets.length === 0) {
      return [];
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    const result: BudgetStatusItem[] = [];

    for (const b of budgets) {
      const categoryIds = [b.categoryId];
      const subcategories = await this.prisma.category.findMany({
        where: { parentId: b.categoryId },
        select: { id: true },
      });
      for (const sub of subcategories) {
        categoryIds.push(sub.id);
      }

      const txs = await this.prisma.transaction.findMany({
        where: {
          account: { userId },
          categoryId: { in: categoryIds },
          type: "EXPENSE",
          transactionDate: { gte: startDate, lt: endDate },
        },
        select: { amountCents: true },
      });

      const spentCents = txs.reduce(
        (sum, tx) => sum + Math.abs(Number(tx.amountCents)),
        0,
      );
      const limitCents = Number(b.amountLimitCents);
      const remainingCents = Math.max(0, limitCents - spentCents);
      const percentageUsed =
        limitCents > 0
          ? Number(((spentCents / limitCents) * 100).toFixed(1))
          : 0;

      let status: "ON_TRACK" | "WARNING" | "EXCEEDED" = "ON_TRACK";
      if (spentCents > limitCents) {
        status = "EXCEEDED";
      } else if (percentageUsed >= b.alertThresholdPct) {
        status = "WARNING";
      }

      result.push({
        budgetId: b.id,
        categoryId: b.categoryId,
        categoryName: b.category.name,
        limitCents,
        spentCents,
        remainingCents,
        percentageUsed,
        status,
      });
    }

    return result;
  }

  async proposeRecommendation(
    userId: string,
    type: string,
    title: string,
    details: string,
    actionPayload: any,
  ): Promise<ProposeRecommendationResult> {
    let validRecommendationType: PrismaRecommendationType =
      PrismaRecommendationType.BUDGET_ADJUSTMENT;
    if (type === "SAVINGS_BOOST") {
      validRecommendationType = PrismaRecommendationType.SAVINGS_BOOST;
    } else if (type === "EXPENSE_ALERT") {
      validRecommendationType = PrismaRecommendationType.EXPENSE_ALERT;
    } else if (type === "GOAL_CREATION") {
      validRecommendationType = PrismaRecommendationType.GOAL_CREATION;
    }

    const rec = await this.prisma.aiRecommendation.create({
      data: {
        userId,
        type: validRecommendationType,
        title,
        details,
        proposedAction: actionPayload || {},
        status: "PROPOSED",
      },
    });

    return {
      recommendationId: rec.id,
      status: "PROPOSED",
      type: validRecommendationType,
      title: rec.title,
    };
  }

  async getAccountBalances(userId: string): Promise<TotalBalancesResult> {
    const accounts = await this.prisma.account.findMany({
      where: { userId, isArchived: false },
      orderBy: { createdAt: "asc" },
    });

    const items = accounts.map((acc) => ({
      accountId: acc.id,
      name: acc.name,
      type: acc.type,
      currency: acc.currency,
      balanceCents: Number(acc.currentBalanceCents),
    }));

    const totalBalanceCents = items.reduce(
      (sum, acc) => sum + acc.balanceCents,
      0,
    );

    return {
      totalBalanceCents,
      accounts: items,
      currency: "EUR",
    };
  }

  async getSavingsGoals(userId: string): Promise<SavingsGoalItem[]> {
    const goals = await this.prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    return goals.map((g) => {
      const target = Number(g.targetAmountCents);
      const current = Number(g.currentAmountCents);
      const progressPercent =
        target > 0
          ? Math.min(100, Number(((current / target) * 100).toFixed(1)))
          : 0;

      return {
        goalId: g.id,
        name: g.name,
        targetAmountCents: target,
        currentAmountCents: current,
        progressPercent,
        targetDate: g.targetDate ? g.targetDate.toISOString() : null,
        isCompleted: g.isCompleted,
      };
    });
  }

  async getHistoricalBaseline(
    userId: string,
  ): Promise<HistoricalBaselineResult> {
    const now = new Date();
    const threeMonthsAgo = new Date(
      Date.UTC(now.getFullYear(), now.getMonth() - 3, 1, 0, 0, 0),
    );

    const transactions = await this.prisma.transaction.findMany({
      where: {
        account: { userId },
        transactionDate: { gte: threeMonthsAgo },
      },
      include: { category: true },
    });

    const monthsAnalyzed = 3;
    let totalIncomeCents = 0;
    let totalFixedExpensesCents = 0;
    let totalVariableExpensesCents = 0;

    const variableCatMap = new Map<
      string,
      { categoryId: string; categoryName: string; totalCents: number }
    >();

    for (const tx of transactions) {
      const amount = Math.abs(Number(tx.amountCents));
      if (tx.type === "INCOME") {
        totalIncomeCents += amount;
      } else if (tx.type === "EXPENSE") {
        const catName = tx.category ? tx.category.name.toLowerCase() : "otros";
        const isFixed = FIXED_EXPENSE_KEYWORDS.some((kw) =>
          catName.includes(kw),
        );

        if (isFixed) {
          totalFixedExpensesCents += amount;
        } else {
          totalVariableExpensesCents += amount;
          const catId = tx.categoryId || "uncategorized";
          const displayName = tx.category ? tx.category.name : "Otros Gastos";
          const existing = variableCatMap.get(catId);
          if (existing) {
            existing.totalCents += amount;
          } else {
            variableCatMap.set(catId, {
              categoryId: catId,
              categoryName: displayName,
              totalCents: amount,
            });
          }
        }
      }
    }

    const averageMonthlyIncomeCents = Math.round(
      totalIncomeCents / monthsAnalyzed,
    );
    const averageMonthlyFixedExpensesCents = Math.round(
      totalFixedExpensesCents / monthsAnalyzed,
    );
    const averageMonthlyVariableExpensesCents = Math.round(
      totalVariableExpensesCents / monthsAnalyzed,
    );
    const averageMonthlyTotalExpensesCents =
      averageMonthlyFixedExpensesCents + averageMonthlyVariableExpensesCents;
    const averageMonthlyNetSavingsCents =
      averageMonthlyIncomeCents - averageMonthlyTotalExpensesCents;
    const averageSavingsRatePercent =
      averageMonthlyIncomeCents > 0
        ? Number(
            (
              (averageMonthlyNetSavingsCents / averageMonthlyIncomeCents) *
              100
            ).toFixed(1),
          )
        : 0;

    const topVariableCategories = Array.from(variableCatMap.values())
      .map((item) => {
        const monthlyAverageCents = Math.round(
          item.totalCents / monthsAnalyzed,
        );
        const percentageOfVariable =
          averageMonthlyVariableExpensesCents > 0
            ? Number(
                (
                  (monthlyAverageCents / averageMonthlyVariableExpensesCents) *
                  100
                ).toFixed(1),
              )
            : 0;
        return {
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          monthlyAverageCents,
          percentageOfVariable,
        };
      })
      .sort((a, b) => b.monthlyAverageCents - a.monthlyAverageCents);

    return {
      monthsAnalyzed,
      averageMonthlyIncomeCents,
      averageMonthlyFixedExpensesCents,
      averageMonthlyVariableExpensesCents,
      averageMonthlyTotalExpensesCents,
      averageMonthlyNetSavingsCents,
      averageSavingsRatePercent,
      topVariableCategories,
    };
  }

  async getProactiveInsights(userId: string): Promise<ProactiveInsightItem[]> {
    const insights: ProactiveInsightItem[] = [];
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [baseline, currentExpenses, goals, budgets] = await Promise.all([
      this.getHistoricalBaseline(userId),
      this.getExpensesByCategory(
        userId,
        `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`,
        `${currentYear}-${String(currentMonth).padStart(2, "0")}-28`,
      ),
      this.getSavingsGoals(userId),
      this.getBudgetStatus(userId, currentMonth, currentYear),
    ]);

    // 1. Detección de repuntes de gasto (+30% vs media histórica)
    for (const cur of currentExpenses) {
      const hist = baseline.topVariableCategories.find(
        (b) => b.categoryId === cur.categoryId,
      );
      if (hist && hist.monthlyAverageCents > 2000) {
        // Al menos 20€ de media para evitar ruido
        const surgeRatio = cur.totalAmountCents / hist.monthlyAverageCents;
        if (surgeRatio >= 1.3) {
          const deviation = Math.round((surgeRatio - 1) * 100);
          const curEur = (cur.totalAmountCents / 100)
            .toFixed(2)
            .replace(".", ",");
          const histEur = (hist.monthlyAverageCents / 100)
            .toFixed(2)
            .replace(".", ",");
          insights.push({
            type: "EXPENSE_SURGE",
            title: `Incremento de gasto en ${cur.categoryName}`,
            description: `Este mes llevas ${curEur} € acumulados en ${cur.categoryName}, un +${deviation}% por encima de tu media habitual (${histEur} €/mes).`,
            importance: deviation > 50 ? "HIGH" : "MEDIUM",
            metric: {
              label: "Desviación",
              value: `+${deviation}%`,
              deviationPercent: deviation,
            },
          });
        }
      }
    }

    // 2. Metas cercanas a cumplirse (>80% y no completadas)
    for (const g of goals) {
      if (!g.isCompleted && g.progressPercent >= 80) {
        const remainingCents = g.targetAmountCents - g.currentAmountCents;
        const remEur = (remainingCents / 100).toFixed(2).replace(".", ",");
        insights.push({
          type: "GOAL_PROGRESS",
          title: `¡Cerca de cumplir "${g.name}"!`,
          description: `Has alcanzado el ${g.progressPercent}% de tu objetivo. Con solo ${remEur} € más completarás esta meta con éxito.`,
          importance: "HIGH",
          metric: {
            label: "Progreso",
            value: `${g.progressPercent}%`,
          },
        });
      }
    }

    // 3. Presupuestos en alerta o excedidos
    for (const b of budgets) {
      if (b.status === "EXCEEDED") {
        insights.push({
          type: "BUDGET_WARNING",
          title: `Límite superado en ${b.categoryName}`,
          description: `Has utilizado el ${b.percentageUsed}% de tu presupuesto fijado en ${b.categoryName}.`,
          importance: "HIGH",
        });
      }
    }

    return insights;
  }

  async saveUserCategoryRule(
    userId: string,
    pattern: string,
    categoryId: string,
  ): Promise<{ id: string; pattern: string; categoryId: string }> {
    const rule = await this.prisma.userCategoryRule.upsert({
      where: {
        userId_pattern: {
          userId,
          pattern,
        },
      },
      create: {
        userId,
        pattern,
        categoryId,
      },
      update: {
        categoryId,
      },
    });

    return {
      id: rule.id,
      pattern: rule.pattern,
      categoryId: rule.categoryId,
    };
  }

  async findUserCategoryRule(
    userId: string,
    pattern: string,
  ): Promise<{
    id: string;
    pattern: string;
    categoryId: string;
    categoryName: string;
  } | null> {
    const rule = await this.prisma.userCategoryRule.findUnique({
      where: {
        userId_pattern: {
          userId,
          pattern,
        },
      },
      include: {
        category: true,
      },
    });

    if (!rule) return null;

    return {
      id: rule.id,
      pattern: rule.pattern,
      categoryId: rule.categoryId,
      categoryName: rule.category.name,
    };
  }
}
