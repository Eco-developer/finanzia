import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { UserEntity } from "../../../core/domain/entities/user.entity";
import {
  IUserRepository,
  CreateUserData,
} from "../../../core/domain/repositories/user.repository.interface";

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findByVerificationToken(token: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date(),
        },
      },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    const record = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash: data.passwordHash,
        firstName: data.firstName.trim(),
        lastName: data.lastName ? data.lastName.trim() : null,
        defaultCurrency: data.defaultCurrency || "EUR",
        emailVerified: false,
      },
    });
    return this.toDomain(record);
  }

  async updateEmailVerified(
    id: string,
    verified: boolean,
  ): Promise<UserEntity> {
    const record = await this.prisma.user.update({
      where: { id },
      data: {
        emailVerified: verified,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });
    return this.toDomain(record);
  }

  async saveVerificationToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: token,
        emailVerificationExpires: expiresAt,
      },
    });
  }

  private toDomain(record: {
    id: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string | null;
    defaultCurrency: string;
    createdAt: Date;
    updatedAt: Date;
    emailVerified?: boolean;
  }): UserEntity {
    return new UserEntity(
      record.id,
      record.email,
      record.passwordHash,
      record.firstName,
      record.lastName,
      record.defaultCurrency,
      record.createdAt,
      record.updatedAt,
      record.emailVerified ?? false,
    );
  }
}
