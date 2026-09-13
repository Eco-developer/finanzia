import { apiClient } from './api-client';

export type CategoryType = 'INCOME' | 'EXPENSE';

export interface CategoryItem {
  id: string;
  userId: string | null;
  parentId: string | null;
  name: string;
  icon: string | null;
  colorHex: string | null;
  type: CategoryType;
  isSystem: boolean;
  isArchived: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const categoriesApi = {
  async getCategories(includeArchived = false): Promise<CategoryItem[]> {
    const res = await apiClient<CategoryItem[]>(
      `/categories?includeArchived=${includeArchived}`,
    );
    return res.data;
  },
};
