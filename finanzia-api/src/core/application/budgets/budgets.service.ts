import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import {
  IBudgetRepository,
  BUDGET_REPOSITORY,
} from "../../domain/repositories/budget.repository.interface";
import {
  ICategoryRepository,
  CATEGORY_REPOSITORY,
} from "../../domain/repositories/category.repository.interface";
import { CreateBudgetDto } from "../../../presentation/dtos/budgets/create-budget.dto";
import { UpdateBudgetDto } from "../../../presentation/dtos/budgets/update-budget.dto";
import {
  BudgetPacingResponseDto,
  BudgetPacingItemDto,
} from "../../../presentation/dtos/budgets/budget-pacing-response.dto";
import { BudgetEntity } from "../../domain/entities/budget.entity";

@Injectable()
export class BudgetsService {
  constructor(
    @Inject(BUDGET_REPOSITORY)
    private readonly budgetRepository: IBudgetRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async createOrUpdateBudget(
    userId: string,
    dto: CreateBudgetDto,
  ): Promise<any> {
    const category = await this.categoryRepository.findById(dto.categoryId);
    if (!category) {
      throw new NotFoundException(
        `La categoría con ID ${dto.categoryId} no existe.`,
      );
    }

    if (category.userId !== null && category.userId !== userId) {
      throw new ForbiddenException(
        "No tienes permisos sobre la categoría especificada.",
      );
    }

    const budget = await this.budgetRepository.upsert({
      userId,
      categoryId: dto.categoryId,
      amountLimitCents: BigInt(dto.amountLimitCents),
      periodMonth: dto.periodMonth,
      periodYear: dto.periodYear,
      alertThresholdPct: dto.alertThresholdPct,
    });

    return this.toResponse(budget);
  }

  async getBudgets(
    userId: string,
    month?: number,
    year?: number,
  ): Promise<any[]> {
    const budgets = await this.budgetRepository.findAllByUserId(
      userId,
      month,
      year,
    );
    return budgets.map((b) => this.toResponse(b));
  }

  async getBudgetPacing(
    userId: string,
    month: number,
    year: number,
  ): Promise<BudgetPacingResponseDto> {
    if (!month || month < 1 || month > 12) {
      throw new BadRequestException(
        "El mes debe estar comprendido entre 1 y 12.",
      );
    }
    if (!year || year < 2000 || year > 2100) {
      throw new BadRequestException("El año especificado no es válido.");
    }

    const items = await this.budgetRepository.calculatePacing(
      userId,
      month,
      year,
    );

    let totalBudgeted = 0;
    let totalSpent = 0;

    const data: BudgetPacingItemDto[] = items.map((item) => {
      const budgeted = Number(item.amountLimitCents);
      const spent = Number(item.spentCents);
      const remaining = Number(item.remainingCents);

      totalBudgeted += budgeted;
      totalSpent += spent;

      return {
        budgetId: item.budgetId,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        categoryColorHex: item.categoryColorHex,
        categoryIcon: item.categoryIcon,
        amountLimitCents: budgeted,
        spentCents: spent,
        remainingCents: remaining,
        percentageUsed: item.percentageUsed,
        alertThresholdPct: item.alertThresholdPct,
        status: item.status,
      };
    });

    const totalRemaining = Math.max(0, totalBudgeted - totalSpent);
    const overallPercentageUsed =
      totalBudgeted > 0
        ? Math.round((totalSpent / totalBudgeted) * 10000) / 100
        : 0;

    return {
      success: true,
      data,
      summary: {
        totalBudgetedCents: totalBudgeted,
        totalSpentCents: totalSpent,
        totalRemainingCents: totalRemaining,
        overallPercentageUsed,
        periodMonth: month,
        periodYear: year,
      },
    };
  }

  async updateBudget(
    userId: string,
    id: string,
    dto: UpdateBudgetDto,
  ): Promise<any> {
    const existing = await this.budgetRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`El presupuesto con ID ${id} no existe.`);
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException(
        "No tienes permisos para modificar este presupuesto.",
      );
    }

    const updated = await this.budgetRepository.update(id, {
      amountLimitCents:
        dto.amountLimitCents !== undefined
          ? BigInt(dto.amountLimitCents)
          : undefined,
      alertThresholdPct: dto.alertThresholdPct,
    });

    return this.toResponse(updated);
  }

  async deleteBudget(userId: string, id: string): Promise<void> {
    const existing = await this.budgetRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`El presupuesto con ID ${id} no existe.`);
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException(
        "No tienes permisos para eliminar este presupuesto.",
      );
    }

    await this.budgetRepository.delete(id);
  }

  private toResponse(budget: BudgetEntity) {
    return {
      id: budget.id,
      userId: budget.userId,
      categoryId: budget.categoryId,
      categoryName: budget.categoryName,
      categoryColorHex: budget.categoryColorHex,
      categoryIcon: budget.categoryIcon,
      amountLimitCents: Number(budget.amountLimitCents),
      periodMonth: budget.periodMonth,
      periodYear: budget.periodYear,
      alertThresholdPct: budget.alertThresholdPct,
      createdAt: budget.createdAt.toISOString(),
      updatedAt: budget.updatedAt.toISOString(),
    };
  }
}
