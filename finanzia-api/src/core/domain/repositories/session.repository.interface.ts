import { SessionEntity } from "../entities/session.entity";

export interface CreateSessionData {
  userId: string;
  tokenHash: string;
  deviceInfo?: string | null;
  ipAddress?: string | null;
  expiresAt: Date;
}

export interface ISessionRepository {
  create(data: CreateSessionData): Promise<SessionEntity>;
  findByTokenHash(tokenHash: string): Promise<SessionEntity | null>;
  revokeByTokenHash(tokenHash: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<number>;
  replaceToken(
    oldTokenHash: string,
    newSessionData: CreateSessionData,
  ): Promise<SessionEntity>;
  findActiveByUserId(userId: string): Promise<SessionEntity[]>;
}

export const SESSION_REPOSITORY = Symbol("ISessionRepository");
