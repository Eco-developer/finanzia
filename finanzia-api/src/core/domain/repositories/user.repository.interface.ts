import { UserEntity } from "../entities/user.entity";

export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName?: string | null;
  defaultCurrency?: string;
}

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByVerificationToken(token: string): Promise<UserEntity | null>;
  create(data: CreateUserData): Promise<UserEntity>;
  updateEmailVerified(id: string, verified: boolean): Promise<UserEntity>;
  updateOnboardingCompleted(
    id: string,
    completed: boolean,
  ): Promise<UserEntity>;
  saveVerificationToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<void>;
  savePasswordResetToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<void>;
  findByPasswordResetToken(token: string): Promise<UserEntity | null>;
  updatePasswordAndRevokeSessions(
    userId: string,
    passwordHash: string,
  ): Promise<UserEntity>;
}

export const USER_REPOSITORY = Symbol("IUserRepository");
