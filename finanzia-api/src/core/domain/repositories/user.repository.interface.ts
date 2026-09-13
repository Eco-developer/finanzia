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
  create(data: CreateUserData): Promise<UserEntity>;
}

export const USER_REPOSITORY = Symbol("IUserRepository");
