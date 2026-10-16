import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import {
  ISessionRepository,
  CreateSessionData,
} from "../../../core/domain/repositories/session.repository.interface";
import { SessionEntity } from "../../../core/domain/entities/session.entity";

@Injectable()
export class PrismaSessionRepository implements ISessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSessionData): Promise<SessionEntity> {
    const record = await this.prisma.session.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        deviceInfo: data.deviceInfo,
        ipAddress: data.ipAddress,
        expiresAt: data.expiresAt,
      },
    });
    return this.toDomain(record);
  }

  async findByTokenHash(tokenHash: string): Promise<SessionEntity | null> {
    const record = await this.prisma.session.findUnique({
      where: { tokenHash },
    });
    return record ? this.toDomain(record) : null;
  }

  async revokeByTokenHash(tokenHash: string): Promise<void> {
    await this.prisma.session.update({
      where: { tokenHash },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  async revokeAllForUser(userId: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
    return result.count;
  }

  async replaceToken(
    oldTokenHash: string,
    newSessionData: CreateSessionData,
  ): Promise<SessionEntity> {
    return this.prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { tokenHash: oldTokenHash },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          replacedByTokenHash: newSessionData.tokenHash,
        },
      });

      const newRecord = await tx.session.create({
        data: {
          userId: newSessionData.userId,
          tokenHash: newSessionData.tokenHash,
          deviceInfo: newSessionData.deviceInfo,
          ipAddress: newSessionData.ipAddress,
          expiresAt: newSessionData.expiresAt,
        },
      });

      return this.toDomain(newRecord);
    });
  }

  async findActiveByUserId(userId: string): Promise<SessionEntity[]> {
    const records = await this.prisma.session.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: any): SessionEntity {
    return new SessionEntity(
      record.id,
      record.userId,
      record.tokenHash,
      record.deviceInfo,
      record.ipAddress,
      record.expiresAt,
      record.isRevoked,
      record.revokedAt,
      record.replacedByTokenHash,
      record.createdAt,
      record.updatedAt,
    );
  }
}
