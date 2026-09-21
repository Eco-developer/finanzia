import { BadRequestException } from "@nestjs/common";
import { CategoriesService } from "../../src/core/application/categories/categories.service";
import { CategoryEntity } from "../../src/core/domain/entities/category.entity";
import { CategoryType } from "../../src/core/domain/types/financial.types";
import { CategoryNotFoundException } from "../../src/core/domain/exceptions/category-not-found.exception";
import { UnauthorizedCategoryAccessException } from "../../src/core/domain/exceptions/unauthorized-category-access.exception";
import { ParentCategoryNotFoundException } from "../../src/core/domain/exceptions/parent-category-not-found.exception";

describe("CategoriesService (Unit Tests)", () => {
  let categoriesService: CategoriesService;
  let mockCategoryRepository: any;

  const mockSystemCategory = new CategoryEntity(
    "cat-sys-1",
    null,
    null,
    "Alimentación",
    "utensils",
    "#EF4444",
    CategoryType.EXPENSE,
    false,
    new Date(),
    new Date(),
  );

  const mockUserCategory = new CategoryEntity(
    "cat-user-1",
    "user-owner-id",
    "cat-sys-1",
    "Supermercado",
    "shopping-cart",
    "#10B981",
    CategoryType.EXPENSE,
    false,
    new Date(),
    new Date(),
  );

  beforeEach(() => {
    mockCategoryRepository = {
      findAllForUser: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      countByParentId: jest.fn(),
    };

    categoriesService = new CategoriesService(mockCategoryRepository);
  });

  describe("Creación de categorías", () => {
    it("debe crear una categoría personalizada para el usuario autenticado", async () => {
      mockCategoryRepository.findById.mockResolvedValue(mockSystemCategory);
      mockCategoryRepository.create.mockResolvedValue(mockUserCategory);

      const result = await categoriesService.createCategory("user-owner-id", {
        name: "Supermercado",
        type: CategoryType.EXPENSE,
        parentId: "cat-sys-1",
        icon: "shopping-cart",
        colorHex: "#10B981",
      });

      expect(mockCategoryRepository.create).toHaveBeenCalledWith({
        userId: "user-owner-id",
        parentId: "cat-sys-1",
        name: "Supermercado",
        icon: "shopping-cart",
        colorHex: "#10B981",
        type: CategoryType.EXPENSE,
      });
      expect(result.id).toBe("cat-user-1");
      expect(result.isSystem).toBe(false);
    });

    it("debe lanzar ParentCategoryNotFoundException si la categoría padre no existe", async () => {
      mockCategoryRepository.findById.mockResolvedValue(null);

      await expect(
        categoriesService.createCategory("user-owner-id", {
          name: "Supermercado",
          type: CategoryType.EXPENSE,
          parentId: "non-existent-parent",
        }),
      ).rejects.toThrow(ParentCategoryNotFoundException);
    });

    it("debe lanzar UnauthorizedCategoryAccessException si la categoría padre pertenece a otro usuario", async () => {
      const otherUserCategory = new CategoryEntity(
        "cat-other",
        "another-user-id",
        null,
        "Privada",
        null,
        null,
        CategoryType.EXPENSE,
        false,
        new Date(),
        new Date(),
      );
      mockCategoryRepository.findById.mockResolvedValue(otherUserCategory);

      await expect(
        categoriesService.createCategory("user-owner-id", {
          name: "Supermercado",
          type: CategoryType.EXPENSE,
          parentId: "cat-other",
        }),
      ).rejects.toThrow(UnauthorizedCategoryAccessException);
    });
  });

  describe("Listado y detalle de categorías", () => {
    it("debe listar todas las categorías disponibles para el usuario (sistema y propias)", async () => {
      mockCategoryRepository.findAllForUser.mockResolvedValue([
        mockSystemCategory,
        mockUserCategory,
      ]);

      const result = await categoriesService.getUserCategories("user-owner-id");

      expect(mockCategoryRepository.findAllForUser).toHaveBeenCalledWith(
        "user-owner-id",
        false,
      );
      expect(result).toHaveLength(2);
      expect(result[0].isSystem).toBe(true);
      expect(result[1].isSystem).toBe(false);
    });

    it("debe permitir acceder a una categoría del sistema", async () => {
      mockCategoryRepository.findById.mockResolvedValue(mockSystemCategory);

      const result = await categoriesService.getCategoryById(
        "user-owner-id",
        "cat-sys-1",
      );

      expect(result.id).toBe("cat-sys-1");
      expect(result.isSystem).toBe(true);
    });

    it("debe lanzar CategoryNotFoundException si la categoría no existe", async () => {
      mockCategoryRepository.findById.mockResolvedValue(null);

      await expect(
        categoriesService.getCategoryById("user-owner-id", "non-existent-cat"),
      ).rejects.toThrow(CategoryNotFoundException);
    });

    it("debe lanzar UnauthorizedCategoryAccessException si se intenta ver categoría de otro usuario", async () => {
      const otherUserCategory = new CategoryEntity(
        "cat-other",
        "another-user-id",
        null,
        "Privada",
        null,
        null,
        CategoryType.EXPENSE,
        false,
        new Date(),
        new Date(),
      );
      mockCategoryRepository.findById.mockResolvedValue(otherUserCategory);

      await expect(
        categoriesService.getCategoryById("user-owner-id", "cat-other"),
      ).rejects.toThrow(UnauthorizedCategoryAccessException);
    });
  });

  describe("Actualización y archivo de categorías", () => {
    it("debe rechazar la modificación de categorías del sistema", async () => {
      mockCategoryRepository.findById.mockResolvedValue(mockSystemCategory);

      await expect(
        categoriesService.updateCategory("user-owner-id", "cat-sys-1", {
          name: "Nuevo nombre",
        }),
      ).rejects.toThrow(UnauthorizedCategoryAccessException);
    });

    it("debe rechazar que una categoría sea su propio padre", async () => {
      mockCategoryRepository.findById.mockResolvedValue(mockUserCategory);

      await expect(
        categoriesService.updateCategory("user-owner-id", "cat-user-1", {
          parentId: "cat-user-1",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("debe permitir archivar una categoría propia", async () => {
      mockCategoryRepository.findById.mockResolvedValue(mockUserCategory);
      mockCategoryRepository.update.mockResolvedValue(
        new CategoryEntity(
          mockUserCategory.id,
          mockUserCategory.userId,
          mockUserCategory.parentId,
          mockUserCategory.name,
          mockUserCategory.icon,
          mockUserCategory.colorHex,
          mockUserCategory.type,
          true,
          mockUserCategory.createdAt,
          new Date(),
        ),
      );

      const result = await categoriesService.archiveCategory(
        "user-owner-id",
        "cat-user-1",
      );

      expect(mockCategoryRepository.update).toHaveBeenCalledWith("cat-user-1", {
        isArchived: true,
      });
      expect(result.isArchived).toBe(true);
    });
  });
});
