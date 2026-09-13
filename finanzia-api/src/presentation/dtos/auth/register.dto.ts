import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from "class-validator";

export class RegisterDto {
  @ApiProperty({
    example: "usuario@ejemplo.com",
    description: "Correo electrónico único del usuario",
  })
  @IsEmail({}, { message: "El correo electrónico proporcionado no es válido" })
  @IsNotEmpty({ message: "El correo electrónico es obligatorio" })
  email: string;

  @ApiProperty({
    example: "FinanZia2026!",
    description:
      "Contraseña segura (mínimo 8 caracteres, 1 mayúscula, 1 número y 1 símbolo especial)",
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

  @ApiProperty({
    example: "Miguel",
    description: "Nombre de pila del usuario",
  })
  @IsString({ message: "El nombre debe ser una cadena de texto" })
  @IsNotEmpty({ message: "El nombre es obligatorio" })
  @Length(2, 50, { message: "El nombre debe tener entre 2 y 50 caracteres" })
  firstName: string;

  @ApiPropertyOptional({
    example: "García",
    description: "Apellidos del usuario (opcional)",
  })
  @IsOptional()
  @IsString({ message: "Los apellidos deben ser una cadena de texto" })
  @Length(2, 80, {
    message: "Los apellidos deben tener entre 2 y 80 caracteres",
  })
  lastName?: string;

  @ApiPropertyOptional({
    example: "EUR",
    description: "Código de divisa ISO 4217 principal (por defecto EUR)",
    default: "EUR",
  })
  @IsOptional()
  @IsString({ message: "La divisa debe ser una cadena de texto" })
  @Length(3, 3, {
    message:
      "El código de divisa debe constar exactamente de 3 caracteres (ej. EUR, USD)",
  })
  defaultCurrency?: string;
}
