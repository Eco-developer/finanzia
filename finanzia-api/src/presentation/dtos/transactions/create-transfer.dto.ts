import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
} from "class-validator";

export class CreateTransferDto {
  @ApiProperty({
    example: "acc-uuid-origen",
    description: "UUID de la cuenta de origen del traspaso",
  })
  @IsUUID("4", { message: "El fromAccountId debe ser un UUID v4 válido" })
  @IsNotEmpty({ message: "La cuenta de origen es obligatoria" })
  fromAccountId: string;

  @ApiProperty({
    example: "acc-uuid-destino",
    description: "UUID de la cuenta de destino del traspaso",
  })
  @IsUUID("4", { message: "El toAccountId debe ser un UUID v4 válido" })
  @IsNotEmpty({ message: "La cuenta de destino es obligatoria" })
  toAccountId: string;

  @ApiProperty({
    example: 15000,
    description:
      "Importe a transferir en céntimos enteros estrictamente positivos (ej. 150,00 € = 15000). Prohibido uso de floats.",
  })
  @IsInt({
    message:
      "El importe de la transferencia debe ser un número entero en céntimos",
  })
  @IsPositive({
    message:
      "El importe de la transferencia debe ser un valor estrictamente positivo",
  })
  amountCents: number;

  @ApiProperty({
    example: "2026-09-13T12:00:00.000Z",
    description: "Fecha y hora de la operación en formato ISO 8601",
  })
  @IsISO8601({}, { message: "La fecha debe tener un formato ISO 8601 válido" })
  transactionDate: string;

  @ApiProperty({
    example: "Traspaso a cuenta de ahorro mensual",
    description: "Concepto descriptivo del movimiento entre cuentas",
  })
  @IsString({ message: "La descripción debe ser una cadena de texto" })
  @IsNotEmpty({ message: "La descripción es obligatoria" })
  @Length(1, 255, {
    message: "La descripción debe tener entre 1 y 255 caracteres",
  })
  description: string;

  @ApiPropertyOptional({
    example: "Aportación de previsión",
    description: "Notas adicionales",
  })
  @IsOptional()
  @IsString({ message: "Las notas deben ser una cadena de texto" })
  @Length(0, 500, { message: "Las notas no pueden superar 500 caracteres" })
  notes?: string;
}
