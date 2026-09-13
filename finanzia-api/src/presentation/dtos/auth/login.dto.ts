import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
  @ApiProperty({
    example: "usuario@ejemplo.com",
    description: "Correo electrónico registrado del usuario",
  })
  @IsEmail({}, { message: "El correo electrónico proporcionado no es válido" })
  @IsNotEmpty({ message: "El correo electrónico es obligatorio" })
  email: string;

  @ApiProperty({
    example: "FinanZia2026!",
    description: "Contraseña del usuario",
  })
  @IsString({ message: "La contraseña debe ser una cadena de texto" })
  @IsNotEmpty({ message: "La contraseña es obligatoria" })
  password: string;
}
