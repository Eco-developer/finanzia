import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateBudgetDto {
  @ApiProperty({
    example: "b5c00e68-466d-4959-994c-8fa2fe3e46c7",
    description: "UUID de la categoría asignada al presupuesto",
  })
  @IsUUID("4", { message: "El categoryId debe ser un UUID válido" })
  @IsNotEmpty({ message: "La categoría es obligatoria" })
  categoryId: string;

  @ApiProperty({
    example: 30000,
    description: "Límite mensual en céntimos enteros (ej. 30000 = 300,00 €)",
  })
  @Type(() => Number)
  @IsInt({
    message: "El límite del presupuesto debe ser un entero en céntimos",
  })
  @Min(1, { message: "El límite debe ser mayor que cero" })
  amountLimitCents: number;

  @ApiProperty({
    example: 9,
    description: "Mes del presupuesto (1-12)",
    minimum: 1,
    maximum: 12,
  })
  @Type(() => Number)
  @IsInt({ message: "El mes debe ser un número entero" })
  @Min(1, { message: "El mes mínimo es 1 (Enero)" })
  @Max(12, { message: "El mes máximo es 12 (Diciembre)" })
  periodMonth: number;

  @ApiProperty({
    example: 2026,
    description: "Año del presupuesto (ej. 2026)",
    minimum: 2000,
    maximum: 2100,
  })
  @Type(() => Number)
  @IsInt({ message: "El año debe ser un número entero" })
  @Min(2000, { message: "Año no válido" })
  @Max(2100, { message: "Año no válido" })
  periodYear: number;

  @ApiPropertyOptional({
    example: 80,
    description:
      "Porcentaje de consumo para disparar advertencia de alerta (default 80%)",
    default: 80,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "El umbral de alerta debe ser un número entero" })
  @Min(1, { message: "El umbral debe ser al menos 1%" })
  @Max(100, { message: "El umbral no puede superar 100%" })
  alertThresholdPct?: number;
}
