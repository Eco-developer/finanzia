import { validate } from "class-validator";
import { ForgotPasswordDto } from "../../src/presentation/dtos/auth/forgot-password.dto";
import { ResetPasswordDto } from "../../src/presentation/dtos/auth/reset-password.dto";

describe("Auth DTOs Validation (Unit Tests)", () => {
  describe("ForgotPasswordDto", () => {
    it("debe validar un correo electrónico válido", async () => {
      const dto = new ForgotPasswordDto();
      dto.email = "test@example.com";

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("debe fallar si el correo no tiene formato válido", async () => {
      const dto = new ForgotPasswordDto();
      dto.email = "correo-invalido";

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("email");
    });

    it("debe fallar si el correo está vacío", async () => {
      const dto = new ForgotPasswordDto();
      dto.email = "";

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("ResetPasswordDto", () => {
    it("debe validar una contraseña robusta conforme a los criterios de registro", async () => {
      const dto = new ResetPasswordDto();
      dto.password = "FinanZia2026!";

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("debe fallar si tiene menos de 8 caracteres", async () => {
      const dto = new ResetPasswordDto();
      dto.password = "Short1!";

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("debe fallar si no tiene mayúscula", async () => {
      const dto = new ResetPasswordDto();
      dto.password = "password123!";

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("debe fallar si no tiene número", async () => {
      const dto = new ResetPasswordDto();
      dto.password = "PasswordSpecial!";

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("debe fallar si no tiene carácter especial", async () => {
      const dto = new ResetPasswordDto();
      dto.password = "Password12345";

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
