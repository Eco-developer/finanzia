import { AuthService } from "../../src/core/application/auth/auth.service";
import { UserAlreadyExistsException } from "../../src/core/domain/exceptions/user-already-exists.exception";
import { InvalidCredentialsException } from "../../src/core/domain/exceptions/invalid-credentials.exception";
import { UserNotFoundException } from "../../src/core/domain/exceptions/user-not-found.exception";
import { EmailNotVerifiedException } from "../../src/core/domain/exceptions/email-not-verified.exception";
import { InvalidVerificationTokenException } from "../../src/core/domain/exceptions/invalid-verification-token.exception";
import { UserEntity } from "../../src/core/domain/entities/user.entity";

describe("AuthService (Unit Tests)", () => {
  let authService: AuthService;
  let mockUserRepository: any;
  let mockHashingService: any;
  let mockJwtService: any;
  let mockEmailPort: any;
  let mockConfigService: any;

  const mockUserVerified = new UserEntity(
    "user-uuid-1",
    "test@example.com",
    "hashed_password_123",
    "Juan",
    "Pérez",
    "EUR",
    new Date(),
    new Date(),
    true, // emailVerified = true
  );

  const mockUserUnverified = new UserEntity(
    "user-uuid-2",
    "unverified@example.com",
    "hashed_password_123",
    "Carlos",
    "Gómez",
    "EUR",
    new Date(),
    new Date(),
    false, // emailVerified = false
  );

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByVerificationToken: jest.fn(),
      create: jest.fn(),
      saveVerificationToken: jest.fn().mockResolvedValue(undefined),
      updateEmailVerified: jest.fn().mockResolvedValue(undefined),
      savePasswordResetToken: jest.fn().mockResolvedValue(undefined),
      findByPasswordResetToken: jest.fn(),
      updatePasswordAndRevokeSessions: jest.fn(),
    };

    mockHashingService = {
      hash: jest.fn().mockResolvedValue("hashed_password_123"),
      verify: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue("mocked.jwt.token"),
      verify: jest.fn(),
    };

    mockEmailPort = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === "FRONTEND_URL") return "http://localhost:3000";
        return null;
      }),
    };

    authService = new AuthService(
      mockUserRepository,
      mockHashingService,
      mockEmailPort,
      mockJwtService,
      mockConfigService,
    );
  });

  describe("Registro de usuarios", () => {
    it("debe registrar un usuario nuevo, generar token de verificación y enviar correo de bienvenida", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUserUnverified);

      const result = await authService.register({
        email: "unverified@example.com",
        password: "Password123!",
        firstName: "Carlos",
        lastName: "Gómez",
        defaultCurrency: "EUR",
      });

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        "unverified@example.com",
      );
      expect(mockHashingService.hash).toHaveBeenCalledWith("Password123!");
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.saveVerificationToken).toHaveBeenCalledWith(
        mockUserUnverified.id,
        expect.any(String),
        expect.any(Date),
      );
      expect(mockEmailPort.sendVerificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "unverified@example.com",
          firstName: "Carlos",
          verificationLink: expect.stringContaining("/verify-email?token="),
        }),
      );
      expect(result.user.id).toBe(mockUserUnverified.id);
      expect(result.requiresVerification).toBe(true);
      expect(result.token).toBeUndefined();
    });

    it("debe lanzar UserAlreadyExistsException si el email ya existe", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUserVerified);

      await expect(
        authService.register({
          email: "test@example.com",
          password: "Password123!",
          firstName: "Juan",
        }),
      ).rejects.toThrow(UserAlreadyExistsException);

      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockEmailPort.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe("Inicio de sesión (Login)", () => {
    it("debe iniciar sesión con credenciales correctas y correo verificado", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUserVerified);
      mockHashingService.verify.mockResolvedValue(true);

      const result = await authService.login({
        email: "test@example.com",
        password: "Password123!",
      });

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        "test@example.com",
      );
      expect(mockHashingService.verify).toHaveBeenCalledWith(
        mockUserVerified.passwordHash,
        "Password123!",
      );
      expect(result.token).toBe("mocked.jwt.token");
      expect(result.user.email).toBe("test@example.com");
      expect(result.user.emailVerified).toBe(true);
    });

    it("debe lanzar EmailNotVerifiedException si el usuario tiene credenciales válidas pero email sin verificar", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUserUnverified);
      mockHashingService.verify.mockResolvedValue(true);

      await expect(
        authService.login({
          email: "unverified@example.com",
          password: "Password123!",
        }),
      ).rejects.toThrow(EmailNotVerifiedException);

      expect(mockJwtService.sign).not.toHaveBeenCalled();
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
      mockUserRepository.findByEmail.mockResolvedValue(mockUserVerified);
      mockHashingService.verify.mockResolvedValue(false);

      await expect(
        authService.login({
          email: "test@example.com",
          password: "WrongPassword!",
        }),
      ).rejects.toThrow(InvalidCredentialsException);
    });
  });

  describe("Verificación de correo electrónico", () => {
    it("debe verificar el correo exitosamente con token válido y retornar sesión", async () => {
      const validToken = "valid-hex-token-12345";
      mockUserRepository.findByVerificationToken.mockResolvedValue(
        mockUserUnverified,
      );
      mockUserRepository.updateEmailVerified.mockResolvedValue(
        mockUserVerified,
      );

      const result = await authService.verifyEmail(validToken);

      expect(mockUserRepository.findByVerificationToken).toHaveBeenCalledWith(
        validToken,
      );
      expect(mockUserRepository.updateEmailVerified).toHaveBeenCalledWith(
        mockUserUnverified.id,
        true,
      );
      expect(result.success).toBe(true);
      expect(result.user.email).toBe(mockUserVerified.email);
      expect(result.token).toBe("mocked.jwt.token");
    });

    it("debe lanzar InvalidVerificationTokenException si el token no existe o ha expirado", async () => {
      mockUserRepository.findByVerificationToken.mockResolvedValue(null);

      await expect(authService.verifyEmail("invalid-token")).rejects.toThrow(
        InvalidVerificationTokenException,
      );
      expect(mockUserRepository.updateEmailVerified).not.toHaveBeenCalled();
    });
  });

  describe("Reenvío de verificación de correo", () => {
    it("debe reenviar correo de verificación si el usuario no está verificado", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUserUnverified);

      const result = await authService.resendVerification(
        "unverified@example.com",
      );

      expect(mockUserRepository.saveVerificationToken).toHaveBeenCalledWith(
        mockUserUnverified.id,
        expect.any(String),
        expect.any(Date),
      );
      expect(mockEmailPort.sendVerificationEmail).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toContain("reenviado");
    });

    it("debe informar que ya está verificado sin enviar correo nuevo", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUserVerified);

      const result = await authService.resendVerification("test@example.com");

      expect(mockUserRepository.saveVerificationToken).not.toHaveBeenCalled();
      expect(mockEmailPort.sendVerificationEmail).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toContain("ya está verificado");
    });

    it("debe lanzar UserNotFoundException si el correo no existe en el sistema", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authService.resendVerification("nonexistent@example.com"),
      ).rejects.toThrow(UserNotFoundException);
    });
  });

  describe("Consulta de usuario actual", () => {
    it("debe devolver el usuario si existe", async () => {
      mockUserRepository.findById.mockResolvedValue(mockUserVerified);

      const result = await authService.getCurrentUser(mockUserVerified.id);
      expect(result.id).toBe(mockUserVerified.id);
      expect(result.email).toBe(mockUserVerified.email);
    });

    it("debe lanzar UserNotFoundException si el usuario no existe", async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(authService.getCurrentUser("non-existent")).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe("Recuperación de contraseña (Password Recovery Flow)", () => {
    describe("requestPasswordReset", () => {
      it("debe retornar respuesta neutra OWASP si el correo no existe sin enviar email", async () => {
        mockUserRepository.findByEmail.mockResolvedValue(null);

        const result = await authService.requestPasswordReset(
          "inexistente@example.com",
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain(
          "Si tu correo electrónico coincide con una cuenta registrada",
        );
        expect(
          mockUserRepository.savePasswordResetToken,
        ).not.toHaveBeenCalled();
        expect(mockEmailPort.sendPasswordResetEmail).not.toHaveBeenCalled();
      });

      it("debe generar token JWT de 30m, guardar en BD y enviar correo si el usuario existe", async () => {
        mockUserRepository.findByEmail.mockResolvedValue(mockUserVerified);

        const result =
          await authService.requestPasswordReset("test@example.com");

        expect(result.success).toBe(true);
        expect(result.message).toContain(
          "Si tu correo electrónico coincide con una cuenta registrada",
        );
        expect(mockJwtService.sign).toHaveBeenCalledWith(
          expect.objectContaining({
            sub: mockUserVerified.id,
            email: mockUserVerified.email,
            type: "password_reset",
            tokenVersion: mockUserVerified.tokenVersion,
          }),
          expect.objectContaining({ expiresIn: "30m" }),
        );
        expect(mockUserRepository.savePasswordResetToken).toHaveBeenCalledWith(
          mockUserVerified.id,
          "mocked.jwt.token",
          expect.any(Date),
        );
        expect(mockEmailPort.sendPasswordResetEmail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: mockUserVerified.email,
            firstName: mockUserVerified.firstName,
            resetLink: expect.stringContaining("mocked.jwt.token"),
          }),
        );
      });
    });

    describe("verifyResetToken", () => {
      it("debe lanzar UnauthorizedException si el token es corrupto o expiró en JwtService", async () => {
        mockJwtService.verify = jest.fn().mockImplementation(() => {
          throw new Error("jwt expired");
        });

        await expect(
          authService.verifyResetToken("expired.token"),
        ).rejects.toThrow();
      });

      it("debe lanzar UnauthorizedException si el token no existe o ya fue usado en BD", async () => {
        mockJwtService.verify = jest.fn().mockReturnValue({
          sub: mockUserVerified.id,
          email: mockUserVerified.email,
          type: "password_reset",
        });
        mockUserRepository.findByPasswordResetToken = jest
          .fn()
          .mockResolvedValue(null);

        await expect(
          authService.verifyResetToken("invalid.token"),
        ).rejects.toThrow();
      });

      it("debe validar exitosamente si el token está vigente y registrado en BD", async () => {
        mockJwtService.verify = jest.fn().mockReturnValue({
          sub: mockUserVerified.id,
          email: mockUserVerified.email,
          type: "password_reset",
        });
        mockUserRepository.findByPasswordResetToken = jest
          .fn()
          .mockResolvedValue(mockUserVerified);

        const result = await authService.verifyResetToken("valid.token");

        expect(result.valid).toBe(true);
        expect(result.email).toBe(mockUserVerified.email);
      });
    });

    describe("resetPassword", () => {
      it("debe hashear la nueva contraseña y revocar sesiones previas incrementando tokenVersion", async () => {
        mockUserRepository.findById.mockResolvedValue(mockUserVerified);
        mockUserRepository.updatePasswordAndRevokeSessions = jest
          .fn()
          .mockResolvedValue(mockUserVerified);

        const result = await authService.resetPassword(
          mockUserVerified.id,
          "NuevaClave123!",
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain("Tu contraseña se ha cambiado");
        expect(mockHashingService.hash).toHaveBeenCalledWith("NuevaClave123!");
        expect(
          mockUserRepository.updatePasswordAndRevokeSessions,
        ).toHaveBeenCalledWith(mockUserVerified.id, "hashed_password_123");
      });
    });
  });
});
