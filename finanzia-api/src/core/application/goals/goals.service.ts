import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import {
  ISavingsGoalRepository,
  SAVINGS_GOAL_REPOSITORY,
} from "../../domain/repositories/savings-goal.repository.interface";
import { CreateGoalDto } from "../../../presentation/dtos/goals/create-goal.dto";
import { UpdateGoalDto } from "../../../presentation/dtos/goals/update-goal.dto";
import { ContributeGoalDto } from "../../../presentation/dtos/goals/contribute-goal.dto";
import { GoalResponseDto } from "../../../presentation/dtos/goals/goal-response.dto";
import { SavingsGoalEntity } from "../../domain/entities/savings-goal.entity";

@Injectable()
export class GoalsService {
  constructor(
    @Inject(SAVINGS_GOAL_REPOSITORY)
    private readonly goalRepository: ISavingsGoalRepository,
  ) {}

  async createGoal(
    userId: string,
    dto: CreateGoalDto,
  ): Promise<GoalResponseDto> {
    const targetDate = dto.targetDate ? new Date(dto.targetDate) : null;
    if (targetDate && isNaN(targetDate.getTime())) {
      throw new BadRequestException(
        "La fecha objetivo proporcionada no es válida.",
      );
    }

    const goal = await this.goalRepository.create({
      userId,
      name: dto.name,
      targetAmountCents: BigInt(dto.targetAmountCents),
      currentAmountCents:
        dto.currentAmountCents !== undefined
          ? BigInt(dto.currentAmountCents)
          : 0n,
      targetDate,
    });

    return this.toResponse(goal);
  }

  async getGoals(userId: string): Promise<GoalResponseDto[]> {
    const goals = await this.goalRepository.findAllByUserId(userId);
    return goals.map((g) => this.toResponse(g));
  }

  async getGoalById(userId: string, id: string): Promise<GoalResponseDto> {
    const goal = await this.goalRepository.findById(id);
    if (!goal) {
      throw new NotFoundException(`La meta de ahorro con ID ${id} no existe.`);
    }

    if (goal.userId !== userId) {
      throw new ForbiddenException(
        "No tienes permisos para consultar esta meta.",
      );
    }

    return this.toResponse(goal);
  }

  async updateGoal(
    userId: string,
    id: string,
    dto: UpdateGoalDto,
  ): Promise<GoalResponseDto> {
    const existing = await this.goalRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`La meta de ahorro con ID ${id} no existe.`);
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException(
        "No tienes permisos para modificar esta meta.",
      );
    }

    const targetDate =
      dto.targetDate !== undefined
        ? dto.targetDate
          ? new Date(dto.targetDate)
          : null
        : undefined;

    const updated = await this.goalRepository.update(id, {
      name: dto.name,
      targetAmountCents:
        dto.targetAmountCents !== undefined
          ? BigInt(dto.targetAmountCents)
          : undefined,
      targetDate,
      isCompleted: dto.isCompleted,
    });

    return this.toResponse(updated);
  }

  async contributeToGoal(
    userId: string,
    id: string,
    dto: ContributeGoalDto,
  ): Promise<GoalResponseDto> {
    const existing = await this.goalRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`La meta de ahorro con ID ${id} no existe.`);
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException(
        "No tienes permisos para operar en esta meta.",
      );
    }

    const updated = await this.goalRepository.addContribution(
      id,
      BigInt(dto.amountCents),
    );

    return this.toResponse(updated);
  }

  async deleteGoal(userId: string, id: string): Promise<void> {
    const existing = await this.goalRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`La meta de ahorro con ID ${id} no existe.`);
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException(
        "No tienes permisos para eliminar esta meta.",
      );
    }

    await this.goalRepository.delete(id);
  }

  private toResponse(goal: SavingsGoalEntity): GoalResponseDto {
    return {
      id: goal.id,
      name: goal.name,
      targetAmountCents: Number(goal.targetAmountCents),
      currentAmountCents: Number(goal.currentAmountCents),
      remainingCents: Number(goal.remainingCents),
      progressPercentage: goal.progressPercentage,
      targetDate: goal.targetDate ? goal.targetDate.toISOString() : null,
      daysRemaining: goal.daysRemaining,
      isCompleted: goal.isCompleted,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    };
  }
}
