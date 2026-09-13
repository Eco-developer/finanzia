import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CategoryEntity } from "../../../core/domain/entities/category.entity";
import {
  ICategoryRepository,
  CreateCategoryData,
  UpdateCategoryData,
} from "../../../core/domain/repositories/category.repository.interface";

@Injectable()
export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(
    userId: string,
    includeArchived = false,
  ): Promise<CategoryEntity[]> {
    const records = await this.prisma.category.findMany({
      where: {
        OR: [{ userId: null }, { userId }],
        ...(includeArchived ? {} : { isArchived: false }),
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    return records.map((record) => this.toDomain(record));
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    const record = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async create(data: CreateCategoryData): Promise<CategoryEntity> {
    const record = await this.prisma.category.create({
      data: {
        userId: data.userId,
        parentId: data.parentId ?? null,
        name: data.name.trim(),
        icon: data.icon ?? null,
        colorHex: data.colorHex ?? null,
        type: data.type,
        isArchived: false,
      },
    });
    return this.toDomain(record);
  }

  async update(id: string, data: UpdateCategoryData): Promise<CategoryEntity> {
    const record = await this.prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
        ...(data.icon !== undefined ? { icon: data.icon } : {}),
        ...(data.colorHex !== undefined ? { colorHex: data.colorHex } : {}),
        ...(data.isArchived !== undefined
          ? { isArchived: data.isArchived }
          : {}),
      },
    });
    return this.toDomain(record);
  }

  async countByParentId(parentId: string): Promise<number> {
    return this.prisma.category.count({
      where: { parentId },
    });
  }

  private toDomain(record: any): CategoryEntity {
    return new CategoryEntity(
      record.id,
      record.userId,
      record.parentId,
      record.name,
      record.icon,
      record.colorHex,
      record.type,
      record.isArchived,
      record.createdAt,
      record.updatedAt,
    );
  }
}
