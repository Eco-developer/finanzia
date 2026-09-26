import {
  recommendationsApi,
  type RecommendationItem,
} from '@/infrastructure/api/recommendations.api';

export type { RecommendationItem };

export function useRecommendations() {
  const getPending = async () => {
    return await recommendationsApi.getPending();
  };

  const applyRecommendation = async (id: string) => {
    return await recommendationsApi.apply(id);
  };

  const rejectRecommendation = async (id: string) => {
    return await recommendationsApi.reject(id);
  };

  return {
    getPending,
    applyRecommendation,
    rejectRecommendation,
  };
}
