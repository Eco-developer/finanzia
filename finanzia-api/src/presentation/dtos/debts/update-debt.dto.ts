import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { InterestRateType } from "../../../core/domain/types/debt.types";

export class UpdateDebtDto {
  @ApiPropertyOptional({
    example: "Préstamo Coche Santander (Actualizado)",
    description: "Concepto o descripción de la deuda",
  })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  concept?: string;

  @ApiPropertyOptional({
    example: "Banco Santander",
    description: "Entidad financiera o acreedor",
  })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  creditor?: string;

  @ApiPropertyOptional({
    example: 600,
    description: "Tasa de interés en puntos básicos (ej. 600 = 6.00%)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  interestRateBasisPts?: number;

  @ApiPropertyOptional({
    enum: InterestRateType,
    example: InterestRateType.ANNUAL,
    description: "Tipo de periodicidad de la tasa (ANNUAL o MONTHLY)",
  })
  @IsOptional()
  @IsEnum(InterestRateType)
  interestRateType?: InterestRateType;

  @ApiPropertyOptional({
    example: 21000,
    description: "Cuota mensual pactada o mínima en céntimos",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minimumMonthlyPaymentCents?: number;

  @ApiPropertyOptional({
    example: "2028-06-30T00:00:00.000Z",
    description: "Fecha límite de vencimiento (ISO 8601)",
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    example: "Renegociada rebaja de tipo de interés",
    description: "Notas adicionales",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
