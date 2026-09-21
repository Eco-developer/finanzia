import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { BudgetEntity } from "../../../core/domain/entities/budget.entity";
import {
  IBudgetRepository,
  CreateBudgetData,
  UpdateBudgetData,
  BudgetPacingData,
} from "../../../core/domain/repositories/budget.repository.interface";

@Injectable()
export class PrismaBudgetRepository implements IBudgetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(data: CreateBudgetData): Promise<BudgetEntity> {
    const record = await this.prisma.budget.upsert({
      where: {
        userId_categoryId_periodMonth_periodYear: {
          userId: data.userId,
          categoryId: data.categoryId,
          periodMonth: data.periodMonth,
          periodYear: data.periodYear,
        },
      },
      create: {
        userId: data.userId,
        categoryId: data.categoryId,
        amountLimitCents: data.amountLimitCents,
        periodMonth: data.periodMonth,
        periodYear: data.periodYear,
        alertThresholdPct: data.alertThresholdPct ?? 80,
      },
      update: {
        amountLimitCents: data.amountLimitCents,
        ...(data.alertThresholdPct !== undefined
          ? { alertThresholdPct: data.alertThresholdPct }
          : {}),
      },
      include: {
        category: true,
      },
    });

    return this.toDomain(record);
  }

  async findById(id: string): Promise<BudgetEntity | null> {
    const record = await this.prisma.budget.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findByUserCategoryPeriod(
    userId: string,
    categoryId: string,
    periodMonth: number,
    periodYear: number,
  ): Promise<BudgetEntity | null> {
    const record = await this.prisma.budget.findUnique({
      where: {
        userId_categoryId_periodMonth_periodYear: {
          userId,
          categoryId,
          periodMonth,
          periodYear,
        },
      },
      include: { category: true },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findAllByUserId(
    userId: string,
    periodMonth?: number,
    periodYear?: number,
  ): Promise<BudgetEntity[]> {
    const records = await this.prisma.budget.findMany({
      where: {
        userId,
        ...(periodMonth !== undefined ? { periodMonth } : {}),
        ...(periodYear !== undefined ? { periodYear } : {}),
      },
      include: { category: true },
      orderBy: [
        { periodYear: "desc" },
        { periodMonth: "desc" },
        { createdAt: "asc" },
      ],
    });
    return records.map((r) => this.toDomain(r));
  }

  async update(id: string, data: UpdateBudgetData): Promise<BudgetEntity> {
    const record = await this.prisma.budget.update({
      where: { id },
      data: {
        ...(data.amountLimitCents !== undefined
          ? { amountLimitCents: data.amountLimitCents }
          : {}),
        ...(data.alertThresholdPct !== undefined
          ? { alertThresholdPct: data.alertThresholdPct }
          : {}),
      },
      include: { category: true },
    });
    return this.toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.budget.delete({
      where: { id },
    });
  }

  async calculatePacing(
    userId: string,
    periodMonth: number,
    periodYear: number,
  ): Promise<BudgetPacingData[]> {
    const budgets = await this.prisma.budget.findMany({
      where: {
        userId,
        periodMonth,
        periodYear,
      },
      include: {
        category: true,
      },
    });

    if (budgets.length === 0) {
      return [];
    }

    const startDate = new Date(
      Date.UTC(periodYear, periodMonth - 1, 1, 0, 0, 0, 0),
    );
    const endDate = new Date(Date.UTC(periodYear, periodMonth, 1, 0, 0, 0, 0));

    const categoryIds = budgets.map((b) => b.categoryId);

    const expenseTransactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: "EXPENSE",
        transactionDate: {
          gte: startDate,
          lt: endDate,
        },
        categoryId: {
          in: categoryIds,
        },
      },
      select: {
        categoryId: true,
        amountCents: true,
      },
    });

    const categoryExpenseMap = new Map<string, bigint>();
    for (const tx of expenseTransactions) {
      if (!tx.categoryId) continue;
      const positiveCents =
        tx.amountCents < 0n ? -tx.amountCents : tx.amountCents;
      const current = categoryExpenseMap.get(tx.categoryId) || 0n;
      categoryExpenseMap.set(tx.categoryId, current + positiveCents);
    }

    return budgets.map((b) => {
      const spentCents = categoryExpenseMap.get(b.categoryId) || 0n;
      const limitCents = b.amountLimitCents;
      const diffCents = limitCents - spentCents;
      const remainingCents = diffCents > 0n ? diffCents : 0n;

      let percentageUsed = 0;
      if (limitCents > 0n) {
        percentageUsed = Number((spentCents * 10000n) / limitCents) / 100;
      }

      let status: "ON_TRACK" | "WARNING" | "EXCEEDED" = "ON_TRACK";
      if (percentageUsed >= 90) {
        status = "EXCEEDED";
      } else if (percentageUsed >= 70) {
        status = "WARNING";
      }

      return {
        budgetId: b.id,
        categoryId: b.categoryId,
        categoryName: b.category.name,
        categoryColorHex: b.category.colorHex,
        categoryIcon: b.category.icon,
        amountLimitCents: limitCents,
        spentCents,
        remainingCents,
        percentageUsed,
        alertThresholdPct: b.alertThresholdPct,
        status,
      };
    });
  }

  private toDomain(record: any): BudgetEntity {
    return new BudgetEntity(
      record.id,
      record.userId,
      record.categoryId,
      record.amountLimitCents,
      record.periodMonth,
      record.periodYear,
      record.alertThresholdPct,
      record.createdAt,
      record.updatedAt,
      record.category?.name,
      record.category?.colorHex,
      record.category?.icon,
    );
  }
}
