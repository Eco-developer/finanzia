import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class UpdateBudgetDto {
  @ApiPropertyOptional({
    example: 35000,
    description: "Nuevo límite mensual en céntimos (ej. 35000 = 350,00 €)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "El límite del presupuesto debe ser un entero en céntimos" })
  @Min(1, { message: "El límite debe ser mayor que cero" })
  amountLimitCents?: number;

  @ApiPropertyOptional({
    example: 85,
    description: "Nuevo porcentaje de umbral de alerta (1-100)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "El umbral de alerta debe ser un número entero" })
  @Min(1, { message: "El umbral debe ser al menos 1%" })
  @Max(100, { message: "El umbral no puede superar 100%" })
  alertThresholdPct?: number;
}
