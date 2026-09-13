import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaCategoryRepository } from "../../../infrastructure/database/repositories/prisma-category.repository";
import { CreateCategoryDto } from "../../../presentation/dtos/categories/create-category.dto";
import { UpdateCategoryDto } from "../../../presentation/dtos/categories/update-category.dto";
import { CategoryResponseDto } from "../../../presentation/dtos/categories/category-response.dto";
import { CategoryEntity } from "../../domain/entities/category.entity";
import { CategoryNotFoundException } from "../../domain/exceptions/category-not-found.exception";
import { UnauthorizedCategoryAccessException } from "../../domain/exceptions/unauthorized-category-access.exception";
import { ParentCategoryNotFoundException } from "../../domain/exceptions/parent-category-not-found.exception";

@Injectable()
export class CategoriesService {
  constructor(private readonly categoryRepository: PrismaCategoryRepository) {}

  async createCategory(
    userId: string,
    dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    if (dto.parentId) {
      const parent = await this.categoryRepository.findById(dto.parentId);
      if (!parent) {
        throw new ParentCategoryNotFoundException(dto.parentId);
      }
      if (parent.userId !== null && parent.userId !== userId) {
        throw new UnauthorizedCategoryAccessException(dto.parentId);
      }
    }

    const category = await this.categoryRepository.create({
      userId,
      parentId: dto.parentId ?? null,
      name: dto.name,
      icon: dto.icon ?? null,
      colorHex: dto.colorHex ?? null,
      type: dto.type,
    });

    return this.toResponseDto(category);
  }

  async getUserCategories(
    userId: string,
    includeArchived = false,
  ): Promise<CategoryResponseDto[]> {
    const categories = await this.categoryRepository.findAllForUser(
      userId,
      includeArchived,
    );
    return categories.map((c) => this.toResponseDto(c));
  }

  async getCategoryById(
    userId: string,
    categoryId: string,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new CategoryNotFoundException(categoryId);
    }

    if (category.userId !== null && category.userId !== userId) {
      throw new UnauthorizedCategoryAccessException(categoryId);
    }

    return this.toResponseDto(category);
  }

  async updateCategory(
    userId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new CategoryNotFoundException(categoryId);
    }

    if (category.userId === null) {
      throw new UnauthorizedCategoryAccessException(
        "Las categorías base del sistema son de solo lectura",
      );
    }

    if (category.userId !== userId) {
      throw new UnauthorizedCategoryAccessException(categoryId);
    }

    if (dto.parentId) {
      if (dto.parentId === categoryId) {
        throw new BadRequestException(
          "Una categoría no puede ser padre de sí misma",
        );
      }

      const parent = await this.categoryRepository.findById(dto.parentId);
      if (!parent) {
        throw new ParentCategoryNotFoundException(dto.parentId);
      }
      if (parent.userId !== null && parent.userId !== userId) {
        throw new UnauthorizedCategoryAccessException(dto.parentId);
      }
    }

    const updated = await this.categoryRepository.update(categoryId, {
      name: dto.name,
      parentId: dto.parentId,
      icon: dto.icon,
      colorHex: dto.colorHex,
      isArchived: dto.isArchived,
    });

    return this.toResponseDto(updated);
  }

  async archiveCategory(
    userId: string,
    categoryId: string,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new CategoryNotFoundException(categoryId);
    }

    if (category.userId === null) {
      throw new UnauthorizedCategoryAccessException(
        "Las categorías base del sistema son de solo lectura",
      );
    }

    if (category.userId !== userId) {
      throw new UnauthorizedCategoryAccessException(categoryId);
    }

    const archived = await this.categoryRepository.update(categoryId, {
      isArchived: true,
    });

    return this.toResponseDto(archived);
  }

  private toResponseDto(category: CategoryEntity): CategoryResponseDto {
    return {
      id: category.id,
      userId: category.userId,
      parentId: category.parentId,
      name: category.name,
      icon: category.icon,
      colorHex: category.colorHex,
      type: category.type,
      isSystem: category.isSystem,
      isArchived: category.isArchived,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
