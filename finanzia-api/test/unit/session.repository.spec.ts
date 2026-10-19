import { PrismaSessionRepository } from "../../src/infrastructure/database/repositories/prisma-session.repository";
import { SessionEntity } from "../../src/core/domain/entities/session.entity";

describe("PrismaSessionRepository (Unit Tests)", () => {
  let repository: PrismaSessionRepository;
  let mockPrisma: any;

  const mockDate = new Date("2026-10-16T12:00:00.000Z");
  const expiresAt = new Date("2026-10-23T12:00:00.000Z");

  const rawSessionRecord = {
    id: "session-uuid-1",
    userId: "user-uuid-1",
    tokenHash: "hashed-token-value-123",
    deviceInfo: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    ipAddress: "127.0.0.1",
    expiresAt,
    isRevoked: false,
    revokedAt: null,
    replacedByTokenHash: null,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  beforeEach(() => {
    mockPrisma = {
      session: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    repository = new PrismaSessionRepository(mockPrisma);
  });

  describe("create", () => {
    it("debe crear una nueva sesión y retornar una SessionEntity válida", async () => {
      mockPrisma.session.create.mockResolvedValue(rawSessionRecord);

      const result = await repository.create({
        userId: "user-uuid-1",
        tokenHash: "hashed-token-value-123",
        deviceInfo: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        ipAddress: "127.0.0.1",
        expiresAt,
      });

      expect(mockPrisma.session.create).toHaveBeenCalledWith({
        data: {
          userId: "user-uuid-1",
          tokenHash: "hashed-token-value-123",
          deviceInfo: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          ipAddress: "127.0.0.1",
          expiresAt,
        },
      });
      expect(result).toBeInstanceOf(SessionEntity);
      expect(result.id).toBe("session-uuid-1");
      expect(result.isValid()).toBe(true);
      expect(result.isExpired()).toBe(false);
    });
  });

  describe("findByTokenHash", () => {
    it("debe retornar la entidad si el tokenHash existe", async () => {
      mockPrisma.session.findUnique.mockResolvedValue(rawSessionRecord);

      const result = await repository.findByTokenHash("hashed-token-value-123");

      expect(mockPrisma.session.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: "hashed-token-value-123" },
      });
      expect(result).toBeInstanceOf(SessionEntity);
      expect(result?.tokenHash).toBe("hashed-token-value-123");
    });

    it("debe retornar null si el tokenHash no existe", async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      const result = await repository.findByTokenHash("no-existe");

      expect(result).toBeNull();
    });
  });

  describe("revokeByTokenHash", () => {
    it("debe marcar la sesión como revocada con fecha actual", async () => {
      mockPrisma.session.update.mockResolvedValue({
        ...rawSessionRecord,
        isRevoked: true,
        revokedAt: new Date(),
      });

      await repository.revokeByTokenHash("hashed-token-value-123");

      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { tokenHash: "hashed-token-value-123" },
        data: {
          isRevoked: true,
          revokedAt: expect.any(Date),
        },
      });
    });
  });

  describe("revokeAllForUser", () => {
    it("debe revocar todas las sesiones activas del usuario", async () => {
      mockPrisma.session.updateMany.mockResolvedValue({ count: 3 });

      const count = await repository.revokeAllForUser("user-uuid-1");

      expect(mockPrisma.session.updateMany).toHaveBeenCalledWith({
        where: {
          userId: "user-uuid-1",
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: expect.any(Date),
        },
      });
      expect(count).toBe(3);
    });
  });

  describe("replaceToken (Rotación RTR)", () => {
    it("debe revocar la sesión anterior con replacedByTokenHash y crear la nueva atómicamente", async () => {
      const newSessionRecord = {
        ...rawSessionRecord,
        id: "session-uuid-2",
        tokenHash: "new-hashed-token-456",
      };

      mockPrisma.session.update.mockResolvedValue({
        ...rawSessionRecord,
        isRevoked: true,
        revokedAt: new Date(),
        replacedByTokenHash: "new-hashed-token-456",
      });
      mockPrisma.session.create.mockResolvedValue(newSessionRecord);

      const result = await repository.replaceToken("hashed-token-value-123", {
        userId: "user-uuid-1",
        tokenHash: "new-hashed-token-456",
        deviceInfo: "Mozilla/5.0",
        ipAddress: "127.0.0.1",
        expiresAt,
      });

      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { tokenHash: "hashed-token-value-123" },
        data: {
          isRevoked: true,
          revokedAt: expect.any(Date),
          replacedByTokenHash: "new-hashed-token-456",
        },
      });
      expect(mockPrisma.session.create).toHaveBeenCalledWith({
        data: {
          userId: "user-uuid-1",
          tokenHash: "new-hashed-token-456",
          deviceInfo: "Mozilla/5.0",
          ipAddress: "127.0.0.1",
          expiresAt,
        },
      });
      expect(result).toBeInstanceOf(SessionEntity);
      expect(result.tokenHash).toBe("new-hashed-token-456");
    });
  });

  describe("findActiveByUserId", () => {
    it("debe retornar todas las sesiones vigentes y no revocadas del usuario", async () => {
      mockPrisma.session.findMany.mockResolvedValue([rawSessionRecord]);

      const results = await repository.findActiveByUserId("user-uuid-1");

      expect(mockPrisma.session.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user-uuid-1",
          isRevoked: false,
          expiresAt: {
            gt: expect.any(Date),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      expect(results).toHaveLength(1);
      expect(results[0]).toBeInstanceOf(SessionEntity);
    });
  });
});
