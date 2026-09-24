import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, Min } from "class-validator";
import { Type } from "class-transformer";
import { DebtPayoffStrategy } from "../../../core/domain/types/debt.types";

export class SimulatePayoffDto {
  @ApiProperty({
    example: 15000,
    description: "Presupuesto adicional mensual en céntimos para amortización (ej. 15000 = 150,00 €/mes)",
  })
  @Type(() => Number)
  @IsInt({ message: "El presupuesto extra debe ser un entero en céntimos" })
  @Min(0, { message: "El presupuesto extra no puede ser negativo" })
  extraMonthlyCents: number;

  @ApiPropertyOptional({
    enum: DebtPayoffStrategy,
    example: DebtPayoffStrategy.AVALANCHE,
    description: "Estrategia de priorización: 'AVALANCHE' (mayor interés primero) o 'SNOWBALL' (menor saldo primero)",
    default: DebtPayoffStrategy.AVALANCHE,
  })
  @IsOptional()
  @IsEnum(DebtPayoffStrategy)
  strategy?: DebtPayoffStrategy;
}
