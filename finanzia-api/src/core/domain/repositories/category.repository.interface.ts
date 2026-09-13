import { CategoryType } from "@prisma/client";
import { CategoryEntity } from "../entities/category.entity";

export interface CreateCategoryData {
  userId: string;
  parentId?: string | null;
  name: string;
  icon?: string | null;
  colorHex?: string | null;
  type: CategoryType;
}

export interface UpdateCategoryData {
  name?: string;
  parentId?: string | null;
  icon?: string | null;
  colorHex?: string | null;
  isArchived?: boolean;
}

export interface ICategoryRepository {
  findAllForUser(
    userId: string,
    includeArchived?: boolean,
  ): Promise<CategoryEntity[]>;
  findById(id: string): Promise<CategoryEntity | null>;
  create(data: CreateCategoryData): Promise<CategoryEntity>;
  update(id: string, data: UpdateCategoryData): Promise<CategoryEntity>;
  countByParentId(parentId: string): Promise<number>;
}

export const CATEGORY_REPOSITORY = Symbol("ICategoryRepository");
