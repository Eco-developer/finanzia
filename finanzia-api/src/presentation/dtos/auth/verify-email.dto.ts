import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class VerifyEmailDto {
  @ApiProperty({
    description: "Token de verificación recibido en el correo electrónico",
    example: "a8f3b2c1d4e5f6...",
  })
  @IsNotEmpty({ message: "El token de verificación es obligatorio" })
  @IsString({ message: "El token debe ser una cadena de texto" })
  token: string;
}

export class ResendVerificationDto {
  @ApiProperty({
    description: "Dirección de correo electrónico a la que reenviar el enlace",
    example: "usuario@ejemplo.com",
  })
  @IsNotEmpty({ message: "El correo electrónico es obligatorio" })
  @IsEmail({}, { message: "El formato del correo electrónico no es válido" })
  email: string;
}
