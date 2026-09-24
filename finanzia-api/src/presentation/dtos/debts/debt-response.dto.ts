import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DebtStatus, InterestRateType } from "../../../core/domain/types/debt.types";

export class DebtAmortizationResponseDto {
  @ApiProperty({ example: "d290f1ee-6c54-4b01-90e6-d701748f0851" })
  id: string;

  @ApiProperty({ example: "c180f1ee-6c54-4b01-90e6-d701748f0850" })
  debtId: string;

  @ApiPropertyOptional({ example: "a8e9d57a-36fb-40c2-9b23-2fe687e14881" })
  accountId?: string | null;

  @ApiPropertyOptional({ example: "t123f1ee-6c54-4b01-90e6-d701748f0899" })
  transactionId?: string | null;

  @ApiProperty({ example: "50000", description: "Importe total amortizado en céntimos" })
  amountCents: string;

  @ApiProperty({ example: "45000", description: "Cantidad destinada a amortizar capital" })
  principalCents: string;

  @ApiProperty({ example: "5000", description: "Cantidad que cubrió intereses" })
  interestCents: string;

  @ApiProperty({ example: "755000", description: "Saldo pendiente restante tras el abono" })
  remainingAfterCents: string;

  @ApiProperty({ example: "2026-09-25T10:00:00.000Z" })
  paymentDate: string;

  @ApiPropertyOptional({ example: "Abono nómina" })
  notes?: string | null;

  @ApiProperty({ example: "2026-09-25T10:00:00.000Z" })
  createdAt: string;
}

export class DebtResponseDto {
  @ApiProperty({ example: "c180f1ee-6c54-4b01-90e6-d701748f0850" })
  id: string;

  @ApiProperty({ example: "Préstamo Coche Santander" })
  concept: string;

  @ApiPropertyOptional({ example: "Banco Santander" })
  creditor?: string | null;

  @ApiProperty({ example: "1000000", description: "Importe inicial en céntimos" })
  initialAmountCents: string;

  @ApiProperty({ example: "800000", description: "Saldo pendiente en céntimos" })
  remainingAmountCents: string;

  @ApiProperty({ example: "200000", description: "Total ya pagado en céntimos" })
  paidAmountCents: string;

  @ApiProperty({ example: 20.0, description: "Porcentaje de amortización (0 - 100%)" })
  progressPercentage: number;

  @ApiProperty({ example: 650, description: "Tasa en puntos básicos (650 = 6.50%)" })
  interestRateBasisPts: number;

  @ApiProperty({ enum: InterestRateType, example: InterestRateType.ANNUAL })
  interestRateType: InterestRateType;

  @ApiProperty({ example: "4333", description: "Interés mensual estimado en céntimos" })
  estimatedMonthlyInterestCents: string;

  @ApiPropertyOptional({ example: "22000", description: "Cuota mensual pactada o mínima en céntimos" })
  minimumMonthlyPaymentCents?: string | null;

  @ApiPropertyOptional({ example: "2028-06-30T00:00:00.000Z" })
  dueDate?: string | null;

  @ApiProperty({ enum: DebtStatus, example: DebtStatus.ACTIVE })
  status: DebtStatus;

  @ApiPropertyOptional({ example: null, description: "Fecha de liquidación al 100%" })
  paidOffAt?: string | null;

  @ApiProperty({ example: false, description: "Bloqueo inmutable al llegar a 100% pagado" })
  isImmutable: boolean;

  @ApiPropertyOptional({ example: "Comentarios sobre condiciones" })
  notes?: string | null;

  @ApiProperty({ example: "2026-09-25T10:00:00.000Z" })
  createdAt: string;

  @ApiProperty({ example: "2026-09-25T10:00:00.000Z" })
  updatedAt: string;

  @ApiPropertyOptional({ type: [DebtAmortizationResponseDto] })
  amortizations?: DebtAmortizationResponseDto[];
}

export class DebtsSummaryDto {
  @ApiProperty({ example: 3, description: "Total de deudas activas" })
  activeDebtsCount: number;

  @ApiProperty({ example: 2, description: "Total de deudas liquidadas en historial" })
  paidOffDebtsCount: number;

  @ApiProperty({ example: "1250000", description: "Total deuda pendiente consolidada en céntimos" })
  totalRemainingCents: string;

  @ApiProperty({ example: "2000000", description: "Total deuda inicial consolidada en céntimos" })
  totalInitialCents: string;

  @ApiProperty({ example: 750, description: "Tasa de interés promedio ponderada en puntos básicos" })
  weightedAverageRateBasisPts: number;

  @ApiProperty({ example: "64000", description: "Suma de cuotas mínimas mensuales en céntimos" })
  totalMonthlyCommitmentCents: string;

  @ApiProperty({ example: "7820", description: "Suma de intereses mensuales devengados en céntimos" })
  totalMonthlyInterestCents: string;
}

export class ActiveDebtsResponseDto {
  @ApiProperty({ type: [DebtResponseDto] })
  debts: DebtResponseDto[];

  @ApiProperty({ type: DebtsSummaryDto })
  summary: DebtsSummaryDto;
}
