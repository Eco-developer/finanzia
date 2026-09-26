import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import {
  IDebtRepository,
  DEBT_REPOSITORY,
} from "../../domain/repositories/debt.repository.interface";
import {
  DebtInterestCalculatorService,
  DebtPayoffPlanResult,
} from "../../domain/services/debt-interest-calculator.service";
import { CreateDebtDto } from "../../../presentation/dtos/debts/create-debt.dto";
import { UpdateDebtDto } from "../../../presentation/dtos/debts/update-debt.dto";
import { AmortizeDebtDto } from "../../../presentation/dtos/debts/amortize-debt.dto";
import { SimulatePayoffDto } from "../../../presentation/dtos/debts/simulate-payoff.dto";
import {
  ActiveDebtsResponseDto,
  DebtAmortizationResponseDto,
  DebtResponseDto,
  DebtsSummaryDto,
} from "../../../presentation/dtos/debts/debt-response.dto";
import { DebtEntity } from "../../domain/entities/debt.entity";
import { DebtAmortizationEntity } from "../../domain/entities/debt-amortization.entity";
import {
  DebtPayoffStrategy,
  DebtStatus,
  InterestRateType,
} from "../../domain/types/debt.types";

@Injectable()
export class DebtsService {
  constructor(
    @Inject(DEBT_REPOSITORY)
    private readonly debtRepo: IDebtRepository,
    private readonly calculator: DebtInterestCalculatorService,
  ) {}

  async createDebt(
    userId: string,
    dto: CreateDebtDto,
  ): Promise<DebtResponseDto> {
    const initialAmountCents = BigInt(dto.initialAmountCents);
    const remainingAmountCents =
      dto.remainingAmountCents !== undefined
        ? BigInt(dto.remainingAmountCents)
        : initialAmountCents;

    if (remainingAmountCents > initialAmountCents) {
      throw new BadRequestException(
        "El saldo pendiente no puede ser mayor que el importe inicial de la deuda.",
      );
    }

    const isFullyPaid = remainingAmountCents <= 0n;
    const rateType = dto.interestRateType ?? InterestRateType.ANNUAL;

    const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dueDate && isNaN(dueDate.getTime())) {
      throw new BadRequestException("La fecha de vencimiento no es válida.");
    }

    const debt = await this.debtRepo.create({
      userId,
      concept: dto.concept,
      creditor: dto.creditor ?? null,
      initialAmountCents,
      remainingAmountCents,
      interestRateBasisPts: dto.interestRateBasisPts,
      interestRateType: rateType,
      minimumMonthlyPaymentCents:
        dto.minimumMonthlyPaymentCents !== undefined
          ? BigInt(dto.minimumMonthlyPaymentCents)
          : null,
      dueDate,
      status: isFullyPaid ? DebtStatus.PAID_OFF : DebtStatus.ACTIVE,
      paidOffAt: isFullyPaid ? new Date() : null,
      isImmutable: isFullyPaid,
      notes: dto.notes ?? null,
    });

    return this.toResponse(debt);
  }

  async getActiveDebts(userId: string): Promise<ActiveDebtsResponseDto> {
    const allDebts = await this.debtRepo.findByUserId(userId);
    const activeDebts = allDebts.filter((d) => d.status === DebtStatus.ACTIVE);
    const paidOffDebts = allDebts.filter(
      (d) => d.status === DebtStatus.PAID_OFF,
    );

    let totalRemainingCents = 0n;
    let totalInitialCents = 0n;
    let totalMonthlyCommitmentCents = 0n;
    let totalMonthlyInterestCents = 0n;
    let weightedRateSum = 0n;

    for (const d of activeDebts) {
      totalRemainingCents += d.remainingAmountCents;
      totalInitialCents += d.initialAmountCents;

      // Interés mensual estimado
      const monthlyInterest = this.calculator.calculateMonthlyInterestCents(
        d.remainingAmountCents,
        d.interestRateBasisPts,
        d.interestRateType,
      );
      totalMonthlyInterestCents += monthlyInterest;

      // Cuota mensual
      const minPayment =
        d.minimumMonthlyPaymentCents && d.minimumMonthlyPaymentCents > 0n
          ? d.minimumMonthlyPaymentCents
          : monthlyInterest;
      totalMonthlyCommitmentCents += minPayment;

      // Ponderación de tasa
      weightedRateSum += BigInt(d.annualRateBasisPts) * d.remainingAmountCents;
    }

    const weightedAverageRateBasisPts =
      totalRemainingCents > 0n
        ? Number(weightedRateSum / totalRemainingCents)
        : 0;

    const summary: DebtsSummaryDto = {
      activeDebtsCount: activeDebts.length,
      paidOffDebtsCount: paidOffDebts.length,
      totalRemainingCents: totalRemainingCents.toString(),
      totalInitialCents: totalInitialCents.toString(),
      weightedAverageRateBasisPts,
      totalMonthlyCommitmentCents: totalMonthlyCommitmentCents.toString(),
      totalMonthlyInterestCents: totalMonthlyInterestCents.toString(),
    };

    return {
      debts: activeDebts.map((d) => this.toResponse(d)),
      summary,
    };
  }

  async getDebtHistory(userId: string): Promise<DebtResponseDto[]> {
    const debts = await this.debtRepo.findByUserId(userId, DebtStatus.PAID_OFF);
    return debts.map((d) => this.toResponse(d));
  }

  async getDebtById(userId: string, debtId: string): Promise<DebtResponseDto> {
    const debt = await this.debtRepo.findById(debtId, userId);
    if (!debt) {
      throw new NotFoundException(`La deuda con ID '${debtId}' no existe.`);
    }
    return this.toResponse(debt);
  }

  async updateDebt(
    userId: string,
    debtId: string,
    dto: UpdateDebtDto,
  ): Promise<DebtResponseDto> {
    const debt = await this.debtRepo.findById(debtId, userId);
    if (!debt) {
      throw new NotFoundException(`La deuda con ID '${debtId}' no existe.`);
    }

    // Regla de inmutabilidad
    if (debt.isImmutable || debt.status === DebtStatus.PAID_OFF) {
      throw new ForbiddenException(
        "Esta deuda ha sido amortizada al 100% y forma parte del historial inmutable. No se admiten modificaciones.",
      );
    }

    const dueDate =
      dto.dueDate !== undefined
        ? dto.dueDate
          ? new Date(dto.dueDate)
          : null
        : debt.dueDate;

    if (dueDate && isNaN(dueDate.getTime())) {
      throw new BadRequestException("La fecha de vencimiento no es válida.");
    }

    const updated = new DebtEntity(
      debt.id,
      debt.userId,
      dto.concept !== undefined ? dto.concept.trim() : debt.concept,
      dto.creditor !== undefined ? dto.creditor?.trim() || null : debt.creditor,
      debt.initialAmountCents,
      debt.remainingAmountCents,
      dto.interestRateBasisPts !== undefined
        ? dto.interestRateBasisPts
        : debt.interestRateBasisPts,
      dto.interestRateType !== undefined
        ? dto.interestRateType
        : debt.interestRateType,
      dto.minimumMonthlyPaymentCents !== undefined
        ? BigInt(dto.minimumMonthlyPaymentCents)
        : debt.minimumMonthlyPaymentCents,
      dueDate,
      debt.status,
      debt.paidOffAt,
      debt.isImmutable,
      dto.notes !== undefined ? dto.notes?.trim() || null : debt.notes,
      debt.createdAt,
      new Date(),
      debt.amortizations,
    );

    const saved = await this.debtRepo.update(updated);
    return this.toResponse(saved);
  }

  async deleteDebt(userId: string, debtId: string): Promise<void> {
    const debt = await this.debtRepo.findById(debtId, userId);
    if (!debt) {
      throw new NotFoundException(`La deuda con ID '${debtId}' no existe.`);
    }

    // Regla de inmutabilidad
    if (debt.isImmutable || debt.status === DebtStatus.PAID_OFF) {
      throw new ForbiddenException(
        "Esta deuda ha sido amortizada al 100% y forma parte del historial inmutable. Queda prohibida su eliminación.",
      );
    }

    await this.debtRepo.delete(debtId, userId);
  }

  async amortizeDebt(
    userId: string,
    debtId: string,
    dto: AmortizeDebtDto,
  ): Promise<{
    debt: DebtResponseDto;
    amortization: DebtAmortizationResponseDto;
    isFullyPaid: boolean;
  }> {
    const debt = await this.debtRepo.findById(debtId, userId);
    if (!debt) {
      throw new NotFoundException(`La deuda con ID '${debtId}' no existe.`);
    }

    // Regla de inmutabilidad
    if (debt.isImmutable || debt.status === DebtStatus.PAID_OFF) {
      throw new ForbiddenException(
        "Esta deuda ya se encuentra liquidada al 100% y blindada en el historial inmutable.",
      );
    }

    const amountCents = BigInt(dto.amountCents);
    if (amountCents <= 0n) {
      throw new BadRequestException(
        "El importe a amortizar debe ser mayor que cero.",
      );
    }

    // Calcular el desglose entre intereses y capital
    const split = this.calculator.splitAmortizationPayment(
      amountCents,
      debt.remainingAmountCents,
      debt.interestRateBasisPts,
      debt.interestRateType,
    );

    const isFullyPaid = split.isPaidOff;
    const now = new Date();
    const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : now;

    const updatedDebt = new DebtEntity(
      debt.id,
      debt.userId,
      debt.concept,
      debt.creditor,
      debt.initialAmountCents,
      split.newRemainingCents,
      debt.interestRateBasisPts,
      debt.interestRateType,
      debt.minimumMonthlyPaymentCents,
      debt.dueDate,
      isFullyPaid ? DebtStatus.PAID_OFF : DebtStatus.ACTIVE,
      isFullyPaid ? now : null,
      isFullyPaid, // isImmutable = true si llega a 100%
      debt.notes,
      debt.createdAt,
      now,
    );

    const amortizationData = {
      debtId: debt.id,
      userId,
      accountId: dto.accountId ?? null,
      transactionId: null,
      amountCents,
      principalCents: split.principalCents,
      interestCents: split.interestCents,
      remainingAfterCents: split.newRemainingCents,
      paymentDate,
      notes: dto.notes ?? null,
    };

    const accountDebit = dto.accountId
      ? {
          accountId: dto.accountId,
          amountCents,
          description: `Amortización deuda: ${debt.concept}`,
          date: paymentDate,
        }
      : undefined;

    const result = await this.debtRepo.executeAmortizationTransaction({
      debt: updatedDebt,
      amortization: amortizationData,
      accountDebit,
    });

    return {
      debt: this.toResponse(result.debt),
      amortization: this.toAmortizationResponse(result.amortization),
      isFullyPaid,
    };
  }

  async simulatePayoff(
    userId: string,
    dto: SimulatePayoffDto,
  ): Promise<DebtPayoffPlanResult> {
    const allDebts = await this.debtRepo.findByUserId(
      userId,
      DebtStatus.ACTIVE,
    );
    const extraMonthlyCents = BigInt(dto.extraMonthlyCents);
    const strategy = dto.strategy ?? DebtPayoffStrategy.AVALANCHE;

    return this.calculator.simulatePayoffPlan(
      allDebts,
      extraMonthlyCents,
      strategy,
    );
  }

  private toResponse(entity: DebtEntity): DebtResponseDto {
    const monthlyInterest = this.calculator.calculateMonthlyInterestCents(
      entity.remainingAmountCents,
      entity.interestRateBasisPts,
      entity.interestRateType,
    );

    return {
      id: entity.id,
      concept: entity.concept,
      creditor: entity.creditor,
      initialAmountCents: entity.initialAmountCents.toString(),
      remainingAmountCents: entity.remainingAmountCents.toString(),
      paidAmountCents: entity.paidAmountCents.toString(),
      progressPercentage: entity.progressPercentage,
      interestRateBasisPts: entity.interestRateBasisPts,
      interestRateType: entity.interestRateType,
      estimatedMonthlyInterestCents: monthlyInterest.toString(),
      minimumMonthlyPaymentCents: entity.minimumMonthlyPaymentCents
        ? entity.minimumMonthlyPaymentCents.toString()
        : null,
      dueDate: entity.dueDate ? entity.dueDate.toISOString() : null,
      status: entity.status,
      paidOffAt: entity.paidOffAt ? entity.paidOffAt.toISOString() : null,
      isImmutable: entity.isImmutable,
      notes: entity.notes,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      amortizations: entity.amortizations.map((a) =>
        this.toAmortizationResponse(a),
      ),
    };
  }

  private toAmortizationResponse(
    entity: DebtAmortizationEntity,
  ): DebtAmortizationResponseDto {
    return {
      id: entity.id,
      debtId: entity.debtId,
      accountId: entity.accountId,
      transactionId: entity.transactionId,
      amountCents: entity.amountCents.toString(),
      principalCents: entity.principalCents.toString(),
      interestCents: entity.interestCents.toString(),
      remainingAfterCents: entity.remainingAfterCents.toString(),
      paymentDate: entity.paymentDate.toISOString(),
      notes: entity.notes,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}
