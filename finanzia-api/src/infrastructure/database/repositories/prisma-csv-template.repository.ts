import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import {
  CsvTemplateEntity,
  CsvColumnMapping,
} from "../../../core/domain/entities/csv-template.entity";
import { ICsvTemplateRepository } from "../../../core/domain/repositories/csv-template.repository.interface";

@Injectable()
export class PrismaCsvTemplateRepository implements ICsvTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUserId(userId: string): Promise<CsvTemplateEntity[]> {
    const records = await this.prisma.csvTemplate.findMany({
      where: { userId },
      orderBy: { bankName: "asc" },
    });

    return records.map((r) => this.toDomain(r));
  }

  async findByUserIdAndBank(
    userId: string,
    bankName: string,
  ): Promise<CsvTemplateEntity | null> {
    const record = await this.prisma.csvTemplate.findUnique({
      where: {
        userId_bankName: {
          userId,
          bankName,
        },
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async upsertTemplate(
    userId: string,
    bankName: string,
    columnMapping: CsvColumnMapping,
  ): Promise<CsvTemplateEntity> {
    const record = await this.prisma.csvTemplate.upsert({
      where: {
        userId_bankName: {
          userId,
          bankName,
        },
      },
      update: {
        columnMapping: columnMapping as any,
      },
      create: {
        userId,
        bankName,
        columnMapping: columnMapping as any,
      },
    });

    return this.toDomain(record);
  }

  async deleteById(userId: string, id: string): Promise<boolean> {
    const existing = await this.prisma.csvTemplate.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return false;
    }

    await this.prisma.csvTemplate.delete({
      where: { id },
    });

    return true;
  }

  private toDomain(record: any): CsvTemplateEntity {
    return new CsvTemplateEntity(
      record.id,
      record.userId,
      record.bankName,
      record.columnMapping as CsvColumnMapping,
      record.createdAt,
      record.updatedAt,
    );
  }
}
