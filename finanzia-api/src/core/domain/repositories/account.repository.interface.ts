import { AccountType } from '@prisma/client';
import { AccountEntity } from '../entities/account.entity';

export interface CreateAccountData {
  userId: string;
  name: string;
  type: AccountType;
  initialBalanceCents: bigint;
  currency: string;
}

export interface UpdateAccountData {
  name?: string;
  type?: AccountType;
  isArchived?: boolean;
}

export interface IAccountRepository {
  findAllByUserId(userId: string, includeArchived?: boolean): Promise<AccountEntity[]>;
  findById(id: string): Promise<AccountEntity | null>;
  create(data: CreateAccountData): Promise<AccountEntity>;
  update(id: string, data: UpdateAccountData): Promise<AccountEntity>;
}

export const ACCOUNT_REPOSITORY = Symbol('IAccountRepository');
