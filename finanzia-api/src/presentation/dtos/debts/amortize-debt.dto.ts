import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class AmortizeDebtDto {
  @ApiProperty({
    example: 50000,
    description: "Importe total a amortizar en céntimos enteros (ej. 50000 = 500,00 €)",
  })
  @Type(() => Number)
  @IsInt({ message: "El importe a amortizar debe ser un entero en céntimos" })
  @Min(1, { message: "El importe a amortizar debe ser mayor que cero" })
  amountCents: number;

  @ApiPropertyOptional({
    example: "a8e9d57a-36fb-40c2-9b23-2fe687e14881",
    description:
      "ID de la cuenta financiera desde donde se debita el dinero. Si se indica, descuenta saldo y genera una transacción de gasto.",
  })
  @IsOptional()
  @IsUUID("4", { message: "El ID de la cuenta debe ser un UUID válido" })
  accountId?: string;

  @ApiPropertyOptional({
    example: "2026-09-25T10:00:00.000Z",
    description: "Fecha efectiva del pago (ISO 8601). Por defecto la fecha actual.",
  })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({
    example: "Abono extraordinario de la paga extra",
    description: "Notas o concepto de la amortización",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
