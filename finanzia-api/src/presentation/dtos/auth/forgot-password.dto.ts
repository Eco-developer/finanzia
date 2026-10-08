import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class ForgotPasswordDto {
  @ApiProperty({
    example: "usuario@ejemplo.com",
    description: "Correo electrónico del usuario para recuperar contraseña",
  })
  @IsEmail({}, { message: "El correo electrónico proporcionado no es válido" })
  @IsNotEmpty({ message: "El correo electrónico es obligatorio" })
  email: string;
}
