import { ApiProperty } from "@nestjs/swagger";

export class BudgetPacingItemDto {
  @ApiProperty({ example: "bgt-1", description: "ID del presupuesto" })
  budgetId: string;

  @ApiProperty({ example: "cat-uuid-ocio", description: "ID de la categoría" })
  categoryId: string;

  @ApiProperty({ example: "Ocio", description: "Nombre de la categoría" })
  categoryName: string;

  @ApiProperty({
    example: "#F59E0B",
    description: "Color de la categoría",
    nullable: true,
  })
  categoryColorHex: string | null;

  @ApiProperty({
    example: "film",
    description: "Icono de la categoría",
    nullable: true,
  })
  categoryIcon: string | null;

  @ApiProperty({ example: 20000, description: "Límite mensual en céntimos" })
  amountLimitCents: number;

  @ApiProperty({
    example: 16500,
    description: "Total gastado en céntimos en el periodo",
  })
  spentCents: number;

  @ApiProperty({ example: 3500, description: "Total restante en céntimos" })
  remainingCents: number;

  @ApiProperty({
    example: 82.5,
    description: "Porcentaje del presupuesto consumido",
  })
  percentageUsed: number;

  @ApiProperty({ example: 80, description: "Umbral de alerta configurado" })
  alertThresholdPct: number;

  @ApiProperty({
    example: "WARNING",
    enum: ["ON_TRACK", "WARNING", "EXCEEDED"],
    description:
      "Estado semafórico: ON_TRACK (<70%), WARNING (70-90%), EXCEEDED (>90%)",
  })
  status: "ON_TRACK" | "WARNING" | "EXCEEDED";
}

export class BudgetPacingResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [BudgetPacingItemDto] })
  data: BudgetPacingItemDto[];

  @ApiProperty({
    example: {
      totalBudgetedCents: 120000,
      totalSpentCents: 95000,
      totalRemainingCents: 25000,
      overallPercentageUsed: 79.17,
      periodMonth: 9,
      periodYear: 2026,
    },
  })
  summary: {
    totalBudgetedCents: number;
    totalSpentCents: number;
    totalRemainingCents: number;
    overallPercentageUsed: number;
    periodMonth: number;
    periodYear: number;
  };
}
