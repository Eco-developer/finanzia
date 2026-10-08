import { AuthController } from "../../src/presentation/controllers/auth.controller";
import { ForgotPasswordDto } from "../../src/presentation/dtos/auth/forgot-password.dto";
import { ResetPasswordDto } from "../../src/presentation/dtos/auth/reset-password.dto";

describe("AuthController (Unit Tests)", () => {
  let controller: AuthController;
  let mockAuthService: any;

  beforeEach(() => {
    mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      verifyEmail: jest.fn(),
      resendVerification: jest.fn(),
      getCurrentUser: jest.fn(),
      requestPasswordReset: jest.fn(),
      verifyResetToken: jest.fn(),
      resetPassword: jest.fn(),
    };

    controller = new AuthController(mockAuthService);
  });

  describe("POST /auth/forgot-password", () => {
    it("debe invocar a requestPasswordReset y retornar respuesta 200 neutra", async () => {
      mockAuthService.requestPasswordReset.mockResolvedValue({
        success: true,
        message:
          "Si tu correo electrónico coincide con una cuenta registrada, te hemos enviado un enlace de recuperación.",
      });

      const dto: ForgotPasswordDto = { email: "test@example.com" };
      const result = await controller.forgotPassword(dto);

      expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith(
        "test@example.com",
      );
      expect(result.success).toBe(true);
      expect(result.message).toContain("Si tu correo electrónico coincide");
    });
  });

  describe("GET /auth/verify-reset-token", () => {
    it("debe invocar verifyResetToken con el token provisto", async () => {
      mockAuthService.verifyResetToken.mockResolvedValue({
        valid: true,
        email: "test@example.com",
      });

      const result = await controller.verifyResetToken("test.jwt.token");

      expect(mockAuthService.verifyResetToken).toHaveBeenCalledWith(
        "test.jwt.token",
      );
      expect(result.success).toBe(true);
      expect(result.data.valid).toBe(true);
    });
  });

  describe("POST /auth/reset-password", () => {
    it("debe invocar resetPassword con el id del usuario autenticado y la nueva clave", async () => {
      mockAuthService.resetPassword.mockResolvedValue({
        success: true,
        message: "Tu contraseña se ha cambiado exitosamente.",
      });

      const mockUser: any = {
        id: "user-123",
        email: "test@example.com",
      };
      const dto: ResetPasswordDto = {
        password: "NewPassword123!",
      };

      const result = await controller.resetPassword(mockUser, dto);

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        "user-123",
        "NewPassword123!",
      );
      expect(result.success).toBe(true);
      expect(result.message).toContain("Tu contraseña se ha cambiado");
    });
  });
});
