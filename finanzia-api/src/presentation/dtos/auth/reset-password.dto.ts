import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length, Matches } from "class-validator";

export class ResetPasswordDto {
  @ApiProperty({
    example: "FinanZia2026!",
    description:
      "Nueva contraseña segura (mínimo 8 caracteres, 1 mayúscula, 1 número y 1 símbolo especial)",
  })
  @IsString({ message: "La contraseña debe ser una cadena de texto" })
  @Length(8, 72, {
    message: "La contraseña debe tener entre 8 y 72 caracteres",
  })
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, {
    message:
      "La contraseña debe contener al menos una letra mayúscula, un número y un carácter especial",
  })
  password: string;
}
