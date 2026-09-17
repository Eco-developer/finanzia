import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { RecommendationType } from "@prisma/client";

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

@Injectable()
export class AiToolsService {
  private readonly logger = new Logger(AiToolsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Herramienta 1: Resumen financiero determinista para un mes y año concretos
   */
  async getFinancialSummary(
    userId: string,
    month: number,
    year: number,
  ): Promise<FinancialSummaryResult> {
    this.logger.log(`[Tool] getFinancialSummary para usuario ${userId}, ${month}/${year}`);

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

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    // Asegurar cubrir hasta el final del día
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
                ((item.totalAmountCents / totalGlobalExpenses) * 100).toFixed(1),
              )
            : 0,
      }),
    );

    // Ordenar de mayor a menor gasto
    result.sort((a, b) => b.totalAmountCents - a.totalAmountCents);
    return result;
  }

  /**
   * Herramienta 3: Consulta el estado de ejecución y ritmo de presupuestos del usuario
   */
  async getBudgetStatus(
    userId: string,
    month: number,
    year: number,
  ): Promise<BudgetStatusItem[]> {
    this.logger.log(`[Tool] getBudgetStatus para usuario ${userId}, ${month}/${year}`);

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
      // Incluir subcategorías hijas
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
    this.logger.log(`[Tool] proposeRecommendation: ${title} para usuario ${userId}`);

    let validRecommendationType: RecommendationType = RecommendationType.BUDGET_ADJUSTMENT;
    if (type === "SAVINGS_BOOST") {
      validRecommendationType = RecommendationType.SAVINGS_BOOST;
    } else if (type === "EXPENSE_ALERT") {
      validRecommendationType = RecommendationType.EXPENSE_ALERT;
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
}
