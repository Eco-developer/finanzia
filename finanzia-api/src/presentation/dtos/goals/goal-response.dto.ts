import { ApiProperty } from "@nestjs/swagger";

export class GoalResponseDto {
  @ApiProperty({ example: "goal-uuid-1" })
  id: string;

  @ApiProperty({ example: "Fondo de Emergencia" })
  name: string;

  @ApiProperty({ example: 300000, description: "Monto objetivo en céntimos" })
  targetAmountCents: number;

  @ApiProperty({
    example: 100000,
    description: "Monto actual acumulado en céntimos",
  })
  currentAmountCents: number;

  @ApiProperty({
    example: 200000,
    description: "Monto restante para completar la meta",
  })
  remainingCents: number;

  @ApiProperty({
    example: 33.33,
    description: "Porcentaje de cumplimiento (0 - 100)",
  })
  progressPercentage: number;

  @ApiProperty({ example: "2026-12-31T23:59:59.000Z", nullable: true })
  targetDate: string | null;

  @ApiProperty({
    example: 106,
    description: "Días restantes hasta la fecha objetivo",
    nullable: true,
  })
  daysRemaining: number | null;

  @ApiProperty({ example: false })
  isCompleted: boolean;

  @ApiProperty({ example: "2026-09-16T12:00:00.000Z" })
  createdAt: string;

  @ApiProperty({ example: "2026-09-16T12:00:00.000Z" })
  updatedAt: string;
}
