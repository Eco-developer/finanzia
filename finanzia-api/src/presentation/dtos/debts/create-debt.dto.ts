import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { InterestRateType } from "../../../core/domain/types/debt.types";

export class CreateDebtDto {
  @ApiProperty({
    example: "Préstamo Coche Santander",
    description: "Concepto o descripción del pasivo",
  })
  @IsString({ message: "El concepto debe ser una cadena de texto" })
  @IsNotEmpty({ message: "El concepto de la deuda es obligatorio" })
  @Length(2, 100, {
    message: "El concepto debe tener entre 2 y 100 caracteres",
  })
  concept: string;

  @ApiPropertyOptional({
    example: "Banco Santander",
    description: "Entidad financiera o acreedor",
  })
  @IsOptional()
  @IsString({ message: "El acreedor debe ser una cadena de texto" })
  @Length(2, 100)
  creditor?: string;

  @ApiProperty({
    example: 1000000,
    description:
      "Importe original total en céntimos (ej. 1000000 = 10.000,00 €)",
  })
  @Type(() => Number)
  @IsInt({ message: "El importe debe ser un entero en céntimos" })
  @Min(1, { message: "El importe inicial debe ser mayor que cero" })
  initialAmountCents: number;

  @ApiPropertyOptional({
    example: 800000,
    description:
      "Saldo pendiente actual en céntimos (si es inferior al inicial). Por defecto igual al inicial.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "El saldo pendiente debe ser un entero en céntimos" })
  @Min(0, { message: "El saldo pendiente no puede ser negativo" })
  remainingAmountCents?: number;

  @ApiProperty({
    example: 650,
    description: "Tasa de interés en puntos básicos (ej. 650 = 6.50%)",
  })
  @Type(() => Number)
  @IsInt({ message: "La tasa de interés debe ser un entero en puntos básicos" })
  @Min(0, { message: "La tasa de interés no puede ser negativa" })
  interestRateBasisPts: number;

  @ApiPropertyOptional({
    enum: InterestRateType,
    example: InterestRateType.ANNUAL,
    description: "Tipo de periodicidad de la tasa (ANNUAL o MONTHLY)",
    default: InterestRateType.ANNUAL,
  })
  @IsOptional()
  @IsEnum(InterestRateType, {
    message: "El tipo de interés debe ser 'ANNUAL' o 'MONTHLY'",
  })
  interestRateType?: InterestRateType;

  @ApiPropertyOptional({
    example: 22000,
    description:
      "Cuota mensual pactada o mínima obligatoria en céntimos (ej. 22000 = 220,00 €)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "La cuota mensual debe ser un entero en céntimos" })
  @Min(0)
  minimumMonthlyPaymentCents?: number;

  @ApiPropertyOptional({
    example: "2028-06-30T00:00:00.000Z",
    description: "Fecha límite o vencimiento final del préstamo (ISO 8601)",
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: "La fecha de vencimiento debe ser una fecha ISO válida" },
  )
  dueDate?: string;

  @ApiPropertyOptional({
    example: "Contrato firmado con 1% de comisión de cancelación anticipada",
    description: "Notas o comentarios adicionales",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
