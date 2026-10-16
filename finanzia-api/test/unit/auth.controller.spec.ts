import { AuthController } from "../../src/presentation/controllers/auth.controller";
import { ForgotPasswordDto } from "../../src/presentation/dtos/auth/forgot-password.dto";
import { ResetPasswordDto } from "../../src/presentation/dtos/auth/reset-password.dto";
import { LoginDto } from "../../src/presentation/dtos/auth/login.dto";

describe("AuthController (Unit Tests)", () => {
  let controller: AuthController;
  let mockAuthService: any;
  let mockResponse: any;
  let mockRequest: any;

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
      refreshToken: jest.fn(),
      logout: jest.fn(),
      logoutAll: jest.fn(),
    };

    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    mockRequest = {
      ip: "127.0.0.1",
      headers: {
        "user-agent": "Mozilla/5.0 Test Browser",
      },
      cookies: {},
    };

    controller = new AuthController(mockAuthService);
  });

  describe("POST /auth/login", () => {
    it("debe invocar a authService.login con metadata y establecer cookies de access y refresh token", async () => {
      mockAuthService.login.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        token: "access-token-15m",
        refreshToken: "refresh-token-7d",
      });

      const dto: LoginDto = { email: "test@example.com", password: "Password123!" };
      const result = await controller.login(dto, mockRequest, mockResponse);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto, {
        ipAddress: "127.0.0.1",
        deviceInfo: "Mozilla/5.0 Test Browser",
      });
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "jwt_token",
        "access-token-15m",
        expect.objectContaining({ maxAge: 15 * 60 * 1000 }),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "refresh_token",
        "refresh-token-7d",
        expect.objectContaining({ maxAge: 7 * 24 * 60 * 60 * 1000, path: "/api/auth" }),
      );
      expect(result.success).toBe(true);
      expect(result.token).toBe("access-token-15m");
      expect(result.refreshToken).toBe("refresh-token-7d");
    });
  });

  describe("POST /auth/refresh", () => {
    it("debe renovar tokens usando cookie refresh_token y establecer nuevas cookies", async () => {
      mockRequest.cookies = { refresh_token: "old-refresh-token" };
      mockAuthService.refreshToken.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        token: "new-access-token",
        refreshToken: "new-refresh-token",
      });

      const result = await controller.refresh(mockRequest, "", mockResponse);

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
        "old-refresh-token",
        expect.objectContaining({ ipAddress: "127.0.0.1" }),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "jwt_token",
        "new-access-token",
        expect.any(Object),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "refresh_token",
        "new-refresh-token",
        expect.objectContaining({ path: "/api/auth" }),
      );
      expect(result.token).toBe("new-access-token");
      expect(result.refreshToken).toBe("new-refresh-token");
    });

    it("debe aceptar refresh token desde el body si no existe en cookies", async () => {
      mockRequest.cookies = {};
      mockAuthService.refreshToken.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
        token: "new-access-token",
        refreshToken: "new-refresh-token",
      });

      const result = await controller.refresh(mockRequest, "body-refresh-token", mockResponse);

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
        "body-refresh-token",
        expect.any(Object),
      );
      expect(result.success).toBe(true);
    });
  });

  describe("POST /auth/logout", () => {
    it("debe invocar a authService.logout y limpiar todas las cookies de sesión", async () => {
      mockRequest.cookies = { refresh_token: "my-refresh-token" };
      mockAuthService.logout.mockResolvedValue({
        success: true,
        message: "Sesión finalizada correctamente",
      });

      const result = await controller.logout(mockRequest, "", mockResponse);

      expect(mockAuthService.logout).toHaveBeenCalledWith("my-refresh-token", undefined);
      expect(mockResponse.clearCookie).toHaveBeenCalledWith("jwt_token", expect.any(Object));
      expect(mockResponse.clearCookie).toHaveBeenCalledWith("auth_token", expect.any(Object));
      expect(mockResponse.clearCookie).toHaveBeenCalledWith("refresh_token", expect.objectContaining({ path: "/api/auth" }));
      expect(result.success).toBe(true);
    });
  });

  describe("POST /auth/logout-all", () => {
    it("debe revocar todas las sesiones del usuario y limpiar cookies en el cliente", async () => {
      mockAuthService.logoutAll.mockResolvedValue({
        success: true,
        message: "Todas las sesiones activas han sido finalizadas",
      });

      const mockUser: any = { id: "user-123", email: "test@example.com" };
      const result = await controller.logoutAll(mockUser, mockResponse);

      expect(mockAuthService.logoutAll).toHaveBeenCalledWith("user-123");
      expect(mockResponse.clearCookie).toHaveBeenCalledWith("jwt_token", expect.any(Object));
      expect(mockResponse.clearCookie).toHaveBeenCalledWith("refresh_token", expect.objectContaining({ path: "/api/auth" }));
      expect(result.success).toBe(true);
    });
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
