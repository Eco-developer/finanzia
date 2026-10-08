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

  async updateOnboardingCompleted(
    id: string,
    completed: boolean,
  ): Promise<UserEntity> {
    const record = await this.prisma.user.update({
      where: { id },
      data: {
        onboardingCompleted: completed,
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

  async savePasswordResetToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expiresAt,
      },
    });
  }

  async findByPasswordResetToken(token: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async updatePasswordAndRevokeSessions(
    userId: string,
    passwordHash: string,
  ): Promise<UserEntity> {
    const record = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        tokenVersion: {
          increment: 1,
        },
      },
    });
    return this.toDomain(record);
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
    onboardingCompleted?: boolean;
    tokenVersion?: number;
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
      record.onboardingCompleted ?? false,
      record.tokenVersion ?? 1,
    );
  }
}
