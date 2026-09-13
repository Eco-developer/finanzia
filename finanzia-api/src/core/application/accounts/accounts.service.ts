import { Injectable } from "@nestjs/common";
import { PrismaAccountRepository } from "../../../infrastructure/database/repositories/prisma-account.repository";
import { CreateAccountDto } from "../../../presentation/dtos/accounts/create-account.dto";
import { UpdateAccountDto } from "../../../presentation/dtos/accounts/update-account.dto";
import { AccountResponseDto } from "../../../presentation/dtos/accounts/account-response.dto";
import { AccountNotFoundException } from "../../domain/exceptions/account-not-found.exception";
import { UnauthorizedAccountAccessException } from "../../domain/exceptions/unauthorized-account-access.exception";
import { AccountEntity } from "../../domain/entities/account.entity";

@Injectable()
export class AccountsService {
  constructor(private readonly accountRepository: PrismaAccountRepository) {}

  async createAccount(
    userId: string,
    dto: CreateAccountDto,
  ): Promise<AccountResponseDto> {
    const initialBalanceCents = BigInt(dto.initialBalanceCents ?? 0);

    const account = await this.accountRepository.create({
      userId,
      name: dto.name,
      type: dto.type,
      initialBalanceCents,
      currency: dto.currency || "EUR",
    });

    return this.toResponseDto(account);
  }

  async getUserAccounts(
    userId: string,
    includeArchived = false,
  ): Promise<AccountResponseDto[]> {
    const accounts = await this.accountRepository.findAllByUserId(
      userId,
      includeArchived,
    );
    return accounts.map((account) => this.toResponseDto(account));
  }

  async getAccountById(
    userId: string,
    accountId: string,
  ): Promise<AccountResponseDto> {
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new AccountNotFoundException(accountId);
    }

    if (account.userId !== userId) {
      throw new UnauthorizedAccountAccessException(accountId);
    }

    return this.toResponseDto(account);
  }

  async updateAccount(
    userId: string,
    accountId: string,
    dto: UpdateAccountDto,
  ): Promise<AccountResponseDto> {
    // Valida existencia y pertenencia al usuario
    await this.getAccountById(userId, accountId);

    const updated = await this.accountRepository.update(accountId, {
      name: dto.name,
      type: dto.type,
      isArchived: dto.isArchived,
    });

    return this.toResponseDto(updated);
  }

  async archiveAccount(
    userId: string,
    accountId: string,
  ): Promise<AccountResponseDto> {
    // Valida existencia y pertenencia al usuario
    await this.getAccountById(userId, accountId);

    const archived = await this.accountRepository.update(accountId, {
      isArchived: true,
    });

    return this.toResponseDto(archived);
  }

  private toResponseDto(account: AccountEntity): AccountResponseDto {
    return {
      id: account.id,
      userId: account.userId,
      name: account.name,
      type: account.type,
      initialBalanceCents: Number(account.initialBalanceCents),
      currentBalanceCents: Number(account.currentBalanceCents),
      currency: account.currency,
      isArchived: account.isArchived,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }
}
