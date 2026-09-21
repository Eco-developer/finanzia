import { ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionType } from "@prisma/client";
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  NotEquals,
} from "class-validator";

export class UpdateTransactionDto {
  @ApiPropertyOptional({
    example: "acc-uuid-1",
    description: "Identificador UUID de la cuenta financiera asociada",
  })
  @IsOptional()
  @IsUUID("4", { message: "El accountId debe ser un UUID v4 válido" })
  accountId?: string;

  @ApiPropertyOptional({
    example: "cat-uuid-supermercado",
    description:
      "Identificador UUID de la categoría asociada (o null para desasignar)",
    nullable: true,
  })
  @IsOptional()
  @IsUUID("4", { message: "El categoryId debe ser un UUID v4 válido" })
  categoryId?: string | null;

  @ApiPropertyOptional({
    example: -4590,
    description:
      "Importe en céntimos enteros (ej. 45,90 € = 4590; -4590 para gastos). Prohibido uso de floats.",
  })
  @IsOptional()
  @IsInt({
    message: "El importe debe ser un número entero en céntimos (cero float)",
  })
  @NotEquals(0, { message: "El importe no puede ser cero" })
  amountCents?: number;

  @ApiPropertyOptional({
    enum: [TransactionType.INCOME, TransactionType.EXPENSE],
    example: TransactionType.EXPENSE,
    description:
      "Tipo de movimiento monetario: INCOME o EXPENSE. Los traspasos no se pueden modificar directamente.",
  })
  @IsOptional()
  @IsEnum([TransactionType.INCOME, TransactionType.EXPENSE], {
    message:
      "El tipo debe ser INCOME o EXPENSE (los traspasos no son editables)",
  })
  type?: TransactionType;

  @ApiPropertyOptional({
    example: "Compra semanal en Mercadona",
    description: "Concepto o beneficiario de la transacción",
  })
  @IsOptional()
  @IsString({ message: "La descripción debe ser una cadena de texto" })
  @Length(1, 255, {
    message: "La descripción debe tener entre 1 y 255 caracteres",
  })
  description?: string;

  @ApiPropertyOptional({
    example: "2026-09-13T12:00:00.000Z",
    description: "Fecha y hora de la operación bancaria en formato ISO 8601",
  })
  @IsOptional()
  @IsISO8601(
    {},
    {
      message:
        "La fecha de la transacción debe tener un formato ISO 8601 válido",
    },
  )
  transactionDate?: string;

  @ApiPropertyOptional({
    example: "Incluye artículos de limpieza",
    description: "Notas o comentarios adicionales",
  })
  @IsOptional()
  @IsString({ message: "Las notas deben ser una cadena de texto" })
  @Length(0, 500, { message: "Las notas no pueden superar 500 caracteres" })
  notes?: string;
}
