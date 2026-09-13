import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AccountType } from "@prisma/client";
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from "class-validator";

export class CreateAccountDto {
  @ApiProperty({
    example: "Cuenta Nómina BBVA",
    description: "Nombre descriptivo de la cuenta o depósito",
  })
  @IsString({ message: "El nombre de la cuenta debe ser una cadena de texto" })
  @IsNotEmpty({ message: "El nombre de la cuenta es obligatorio" })
  @Length(2, 100, {
    message: "El nombre de la cuenta debe tener entre 2 y 100 caracteres",
  })
  name: string;

  @ApiProperty({
    enum: AccountType,
    example: AccountType.CHECKING,
    description:
      "Tipo de cuenta financiera: CHECKING, SAVINGS, CREDIT_CARD, CASH, INVESTMENT",
  })
  @IsEnum(AccountType, {
    message:
      "El tipo de cuenta debe ser CHECKING, SAVINGS, CREDIT_CARD, CASH o INVESTMENT",
  })
  type: AccountType;

  @ApiPropertyOptional({
    example: 250000,
    description:
      "Saldo inicial de apertura expresado estrictamente en céntimos enteros (ej. 2.500,00 € = 250000). Prohibido uso de floats.",
    default: 0,
  })
  @IsOptional()
  @IsInt({
    message:
      "El saldo inicial debe ser un número entero en céntimos (cero float)",
  })
  initialBalanceCents?: number;

  @ApiPropertyOptional({
    example: "EUR",
    description: "Código de divisa ISO 4217 de la cuenta (por defecto EUR)",
    default: "EUR",
  })
  @IsOptional()
  @IsString({ message: "La divisa debe ser una cadena de texto" })
  @Length(3, 3, {
    message:
      "El código de divisa debe constar exactamente de 3 caracteres (ej. EUR, USD)",
  })
  currency?: string;
}
