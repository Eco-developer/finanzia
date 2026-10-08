import { UnauthorizedException } from "@nestjs/common";
import {
  JwtStrategy,
  JwtPayload,
} from "../../src/infrastructure/security/jwt.strategy";
import { UserEntity } from "../../src/core/domain/entities/user.entity";

describe("JwtStrategy (Unit Tests)", () => {
  let jwtStrategy: JwtStrategy;
  let mockConfigService: any;
  let mockUserRepository: any;

  const mockUser = new UserEntity(
    "user-uuid-1",
    "test@example.com",
    "hash123",
    "Juan",
    "Perez",
    "EUR",
    new Date(),
    new Date(),
    true,
    true,
    2, // current tokenVersion = 2
  );

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockReturnValue("test-secret"),
    };
    mockUserRepository = {
      findById: jest.fn(),
    };

    jwtStrategy = new JwtStrategy(mockConfigService, mockUserRepository);
  });

  it("debe validar correctamente el usuario si el tokenVersion coincide", async () => {
    mockUserRepository.findById.mockResolvedValue(mockUser);

    const payload: JwtPayload = {
      sub: "user-uuid-1",
      email: "test@example.com",
      tokenVersion: 2,
    };

    const result = await jwtStrategy.validate(payload);

    expect(result).toBeDefined();
    expect(result.id).toBe("user-uuid-1");
    expect(result.email).toBe("test@example.com");
  });

  it("debe rechazar con UnauthorizedException si el tokenVersion es menor (sesión revocada)", async () => {
    mockUserRepository.findById.mockResolvedValue(mockUser); // current = 2

    const payload: JwtPayload = {
      sub: "user-uuid-1",
      email: "test@example.com",
      tokenVersion: 1, // older tokenVersion = 1
    };

    await expect(jwtStrategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("debe rechazar con UnauthorizedException si el usuario no existe", async () => {
    mockUserRepository.findById.mockResolvedValue(null);

    const payload: JwtPayload = {
      sub: "non-existent",
      email: "fake@example.com",
    };

    await expect(jwtStrategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
