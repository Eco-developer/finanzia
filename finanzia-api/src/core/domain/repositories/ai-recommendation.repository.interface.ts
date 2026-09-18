import { RecommendationType, RecommendationStatus } from "../types/financial.types";

export interface AiRecommendationRecord {
  id: string;
  userId: string;
  type: RecommendationType;
  title: string;
  details: string;
  proposedAction: Record<string, any>;
  status: RecommendationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAiRecommendationRepository {
  findPending(userId: string): Promise<AiRecommendationRecord[]>;
  findById(id: string): Promise<AiRecommendationRecord | null>;
  create(data: {
    userId: string;
    type: RecommendationType;
    title: string;
    details: string;
    proposedAction: Record<string, any>;
  }): Promise<AiRecommendationRecord>;
  updateStatus(id: string, status: RecommendationStatus): Promise<AiRecommendationRecord>;
  applyAction(userId: string, actionType: string, payload: Record<string, any>): Promise<any>;
}

export const AI_RECOMMENDATION_REPOSITORY = Symbol("IAiRecommendationRepository");
