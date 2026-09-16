import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { SavingsGoalEntity } from "../../../core/domain/entities/savings-goal.entity";
import {
  ISavingsGoalRepository,
  CreateSavingsGoalData,
  UpdateSavingsGoalData,
} from "../../../core/domain/repositories/savings-goal.repository.interface";

@Injectable()
export class PrismaSavingsGoalRepository implements ISavingsGoalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSavingsGoalData): Promise<SavingsGoalEntity> {
    const isCompleted =
      data.currentAmountCents !== undefined &&
      data.currentAmountCents >= data.targetAmountCents;

    const record = await this.prisma.savingsGoal.create({
      data: {
        userId: data.userId,
        name: data.name.trim(),
        targetAmountCents: data.targetAmountCents,
        currentAmountCents: data.currentAmountCents ?? 0n,
        targetDate: data.targetDate ?? null,
        isCompleted,
      },
    });

    return this.toDomain(record);
  }

  async findById(id: string): Promise<SavingsGoalEntity | null> {
    const record = await this.prisma.savingsGoal.findUnique({
      where: { id },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findAllByUserId(userId: string): Promise<SavingsGoalEntity[]> {
    const records = await this.prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: [{ isCompleted: "asc" }, { createdAt: "desc" }],
    });
    return records.map((r) => this.toDomain(r));
  }

  async update(id: string, data: UpdateSavingsGoalData): Promise<SavingsGoalEntity> {
    const existing = await this.prisma.savingsGoal.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Meta de ahorro con ID ${id} no encontrada`);
    }

    const newTarget = data.targetAmountCents ?? existing.targetAmountCents;
    const isCompleted =
      data.isCompleted !== undefined
        ? data.isCompleted
        : existing.currentAmountCents >= newTarget;

    const record = await this.prisma.savingsGoal.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.targetAmountCents !== undefined
          ? { targetAmountCents: data.targetAmountCents }
          : {}),
        ...(data.targetDate !== undefined ? { targetDate: data.targetDate } : {}),
        isCompleted,
      },
    });

    return this.toDomain(record);
  }

  async addContribution(id: string, amountCents: bigint): Promise<SavingsGoalEntity> {
    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.savingsGoal.findUnique({ where: { id } });
      if (!existing) {
        throw new Error(`Meta de ahorro con ID ${id} no encontrada`);
      }

      const updatedAmount = existing.currentAmountCents + amountCents;
      const isCompleted = updatedAmount >= existing.targetAmountCents;

      const updated = await tx.savingsGoal.update({
        where: { id },
        data: {
          currentAmountCents: updatedAmount,
          isCompleted,
        },
      });

      return this.toDomain(updated);
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.savingsGoal.delete({
      where: { id },
    });
  }

  private toDomain(record: any): SavingsGoalEntity {
    return new SavingsGoalEntity(
      record.id,
      record.userId,
      record.name,
      record.targetAmountCents,
      record.currentAmountCents,
      record.targetDate,
      record.isCompleted,
      record.createdAt,
      record.updatedAt,
    );
  }
}
