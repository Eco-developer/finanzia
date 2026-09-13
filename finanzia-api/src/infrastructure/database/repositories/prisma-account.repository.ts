import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { AccountEntity } from "../../../core/domain/entities/account.entity";
import {
  IAccountRepository,
  CreateAccountData,
  UpdateAccountData,
} from "../../../core/domain/repositories/account.repository.interface";

@Injectable()
export class PrismaAccountRepository implements IAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUserId(
    userId: string,
    includeArchived = false,
  ): Promise<AccountEntity[]> {
    const records = await this.prisma.account.findMany({
      where: {
        userId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      orderBy: { createdAt: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async findById(id: string): Promise<AccountEntity | null> {
    const record = await this.prisma.account.findUnique({
      where: { id },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async create(data: CreateAccountData): Promise<AccountEntity> {
    const record = await this.prisma.account.create({
      data: {
        userId: data.userId,
        name: data.name.trim(),
        type: data.type,
        initialBalanceCents: data.initialBalanceCents,
        currentBalanceCents: data.initialBalanceCents,
        currency: data.currency.toUpperCase(),
        isArchived: false,
      },
    });
    return this.toDomain(record);
  }

  async update(id: string, data: UpdateAccountData): Promise<AccountEntity> {
    const record = await this.prisma.account.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.isArchived !== undefined
          ? { isArchived: data.isArchived }
          : {}),
      },
    });
    return this.toDomain(record);
  }

  private toDomain(record: any): AccountEntity {
    return new AccountEntity(
      record.id,
      record.userId,
      record.name,
      record.type,
      record.initialBalanceCents,
      record.currentBalanceCents,
      record.currency,
      record.isArchived,
      record.createdAt,
      record.updatedAt,
    );
  }
}
