import { AuthService } from "../../src/core/application/auth/auth.service";
import { UserAlreadyExistsException } from "../../src/core/domain/exceptions/user-already-exists.exception";
import { InvalidCredentialsException } from "../../src/core/domain/exceptions/invalid-credentials.exception";
import { UserNotFoundException } from "../../src/core/domain/exceptions/user-not-found.exception";
import { UserEntity } from "../../src/core/domain/entities/user.entity";

describe("AuthService (Unit Tests)", () => {
  let authService: AuthService;
  let mockUserRepository: any;
  let mockHashingService: any;
  let mockJwtService: any;

  const mockUser = new UserEntity(
    "user-uuid-1",
    "test@example.com",
    "hashed_password_123",
    "Juan",
    "Pérez",
    "EUR",
    new Date(),
    new Date(),
  );

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    mockHashingService = {
      hash: jest.fn().mockResolvedValue("hashed_password_123"),
      verify: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue("mocked.jwt.token"),
    };

    authService = new AuthService(
      mockUserRepository,
      mockHashingService,
      mockJwtService,
    );
  });

  describe("Registro de usuarios", () => {
    it("debe registrar un usuario nuevo correctamente y generar token JWT", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await authService.register({
        email: "test@example.com",
        password: "Password123!",
        firstName: "Juan",
        lastName: "Pérez",
        defaultCurrency: "EUR",
      });

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        "test@example.com",
      );
      expect(mockHashingService.hash).toHaveBeenCalledWith("Password123!");
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
      expect(result.user.id).toBe(mockUser.id);
      expect(result.token).toBe("mocked.jwt.token");
    });

    it("debe lanzar UserAlreadyExistsException si el email ya existe", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(
        authService.register({
          email: "test@example.com",
          password: "Password123!",
          firstName: "Juan",
        }),
      ).rejects.toThrow(UserAlreadyExistsException);

      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("Inicio de sesión (Login)", () => {
    it("debe iniciar sesión con credenciales correctas", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockHashingService.verify.mockResolvedValue(true);

      const result = await authService.login({
        email: "test@example.com",
        password: "Password123!",
      });

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        "test@example.com",
      );
      expect(mockHashingService.verify).toHaveBeenCalledWith(
        mockUser.passwordHash,
        "Password123!",
      );
      expect(result.token).toBe("mocked.jwt.token");
      expect(result.user.email).toBe("test@example.com");
    });

    it("debe lanzar InvalidCredentialsException si el usuario no existe", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({
          email: "unknown@example.com",
          password: "Password123!",
        }),
      ).rejects.toThrow(InvalidCredentialsException);
    });

    it("debe lanzar InvalidCredentialsException si la contraseña no coincide", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockHashingService.verify.mockResolvedValue(false);

      await expect(
        authService.login({
          email: "test@example.com",
          password: "WrongPassword!",
        }),
      ).rejects.toThrow(InvalidCredentialsException);
    });
  });

  describe("Consulta de usuario actual", () => {
    it("debe devolver el usuario si existe", async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await authService.getCurrentUser(mockUser.id);
      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
    });

    it("debe lanzar UserNotFoundException si el usuario no existe", async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(authService.getCurrentUser("non-existent")).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });
});
