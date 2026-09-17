import { apiClient } from './api-client';

export interface RecommendationItem {
  id: string;
  type: 'BUDGET_ADJUSTMENT' | 'SAVINGS_BOOST' | 'EXPENSE_ALERT';
  title: string;
  details: string;
  proposedAction: Record<string, any>;
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
}

export const recommendationsApi = {
  async getPending(): Promise<RecommendationItem[]> {
    const res = await apiClient<RecommendationItem[]>('recommendations/pending');
    return res.data;
  },

  async apply(id: string): Promise<{ applied: boolean; message: string }> {
    const res = await apiClient<{ applied: boolean; message: string }>(`recommendations/${id}/apply`, {
      method: 'POST',
    });
    return res.data;
  },

  async reject(id: string): Promise<{ rejected: boolean; message: string }> {
    const res = await apiClient<{ rejected: boolean; message: string }>(`recommendations/${id}/reject`, {
      method: 'POST',
    });
    return res.data;
  },
};
