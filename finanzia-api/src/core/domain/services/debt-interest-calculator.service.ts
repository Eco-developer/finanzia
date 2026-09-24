import { Injectable } from "@nestjs/common";
import { DebtEntity } from "../entities/debt.entity";
import { DebtPayoffStrategy, InterestRateType } from "../types/debt.types";

export interface AmortizationSplitResult {
  principalCents: bigint;
  interestCents: bigint;
  newRemainingCents: bigint;
  isPaidOff: boolean;
}

export interface DebtPayoffPlanResult {
  strategy: DebtPayoffStrategy;
  totalMonths: number;
  totalInterestPaidCents: bigint;
  baselineMonths: number;
  baselineInterestPaidCents: bigint;
  monthsSaved: number;
  interestSavedCents: bigint;
  payoffOrder: Array<{
    debtId: string;
    concept: string;
    monthFinished: number;
    interestPaidCents: bigint;
  }>;
}

@Injectable()
export class DebtInterestCalculatorService {
  /**
   * Calcula los intereses devengados por período mensual para un saldo vivo.
   * Regla de cero flotantes: cálculo mediante aritmética entera escalada con redondeo half-up.
   */
  calculateMonthlyInterestCents(
    remainingCents: bigint,
    rateBasisPts: number,
    rateType: InterestRateType,
  ): bigint {
    if (remainingCents <= 0n || rateBasisPts <= 0) {
      return 0n;
    }

    const basisPtsBig = BigInt(rateBasisPts);

    if (rateType === InterestRateType.MONTHLY) {
      // Tasa mensual: interes = (saldo * basisPts + 5000) / 10000
      return (remainingCents * basisPtsBig + 5000n) / 10000n;
    }

    // Tasa anual: interes mensual = (saldo * basisPts + 60000) / (12 * 10000)
    const divisor = 12n * 10000n; // 120,000
    const halfDivisor = divisor / 2n;
    return (remainingCents * basisPtsBig + halfDivisor) / divisor;
  }

  /**
   * Estima la cuota mensual constante mediante el Sistema Francés de amortización.
   * C = P * [ i * (1 + i)^n ] / [ (1 + i)^n - 1 ]
   * Garantiza precisión de enteros convirtiendo únicamente en el paso de potencia y redondeando a céntimos.
   */
  estimateMonthlyPaymentCents(
    principalCents: bigint,
    rateBasisPts: number,
    rateType: InterestRateType,
    termMonths: number,
  ): bigint {
    if (principalCents <= 0n) return 0n;
    if (termMonths <= 0) return principalCents;

    if (rateBasisPts <= 0) {
      return (principalCents + BigInt(termMonths) - 1n) / BigInt(termMonths);
    }

    // Tasa mensual decimal
    const monthlyRateDecimal =
      rateType === InterestRateType.MONTHLY
        ? rateBasisPts / 10000
        : rateBasisPts / 120000;

    const factor = Math.pow(1 + monthlyRateDecimal, termMonths);
    if (!isFinite(factor) || factor <= 1) {
      return (principalCents + BigInt(termMonths) - 1n) / BigInt(termMonths);
    }

    const numerator = monthlyRateDecimal * factor;
    const denominator = factor - 1;
    const installmentRatio = numerator / denominator;

    // Convertir el principal en número de forma segura para aplicar el ratio y redondear
    const principalNum = Number(principalCents);
    const payment = Math.round(principalNum * installmentRatio);

    return BigInt(payment);
  }

  /**
   * Desglosa un abono extraordinario o mensual entre intereses acumulados y reducción de capital.
   */
  splitAmortizationPayment(
    paymentAmountCents: bigint,
    currentRemainingCents: bigint,
    rateBasisPts: number,
    rateType: InterestRateType,
  ): AmortizationSplitResult {
    if (paymentAmountCents <= 0n) {
      return {
        principalCents: 0n,
        interestCents: 0n,
        newRemainingCents: currentRemainingCents,
        isPaidOff: currentRemainingCents <= 0n,
      };
    }

    const monthlyInterest = this.calculateMonthlyInterestCents(
      currentRemainingCents,
      rateBasisPts,
      rateType,
    );

    let interestCents = 0n;
    let principalCents = 0n;

    if (paymentAmountCents <= monthlyInterest) {
      // El pago no alcanza a cubrir los intereses devengados
      interestCents = paymentAmountCents;
      principalCents = 0n;
    } else {
      interestCents = monthlyInterest;
      principalCents = paymentAmountCents - monthlyInterest;
    }

    // Limitar el pago a capital para no generar saldos negativos
    if (principalCents > currentRemainingCents) {
      principalCents = currentRemainingCents;
    }

    const newRemainingCents = currentRemainingCents - principalCents;
    const isPaidOff = newRemainingCents <= 0n;

    return {
      principalCents,
      interestCents,
      newRemainingCents,
      isPaidOff,
    };
  }

  /**
   * Simula la amortización de múltiples deudas comparando el plan actual frente
   * a un plan acelerado con presupuesto mensual adicional bajo la estrategia elegida (Avalancha o Bola de Nieve).
   */
  simulatePayoffPlan(
    debts: DebtEntity[],
    extraMonthlyCents: bigint,
    strategy: DebtPayoffStrategy,
    maxSimulatedMonths = 360, // 30 años límite
  ): DebtPayoffPlanResult {
    const activeDebts = debts.filter((d) => !d.isFullyPaid);

    if (activeDebts.length === 0) {
      return {
        strategy,
        totalMonths: 0,
        totalInterestPaidCents: 0n,
        baselineMonths: 0,
        baselineInterestPaidCents: 0n,
        monthsSaved: 0,
        interestSavedCents: 0n,
        payoffOrder: [],
      };
    }

    // 1. Simulación Línea Base (Solo cuotas mínimas obligatorias)
    const baseline = this.runSimulationLoop(
      activeDebts,
      0n,
      strategy,
      maxSimulatedMonths,
    );

    // 2. Simulación Acelerada (Cuotas mínimas + extra mensual)
    const accelerated = this.runSimulationLoop(
      activeDebts,
      extraMonthlyCents,
      strategy,
      maxSimulatedMonths,
    );

    const monthsSaved = Math.max(0, baseline.totalMonths - accelerated.totalMonths);
    const interestDiff =
      baseline.totalInterestPaidCents - accelerated.totalInterestPaidCents;
    const interestSavedCents = interestDiff > 0n ? interestDiff : 0n;

    return {
      strategy,
      totalMonths: accelerated.totalMonths,
      totalInterestPaidCents: accelerated.totalInterestPaidCents,
      baselineMonths: baseline.totalMonths,
      baselineInterestPaidCents: baseline.totalInterestPaidCents,
      monthsSaved,
      interestSavedCents,
      payoffOrder: accelerated.payoffOrder,
    };
  }

  /**
   * Bucle interno determinista de simulación de pagos mes a mes.
   */
  private runSimulationLoop(
    debts: DebtEntity[],
    extraMonthlyCents: bigint,
    strategy: DebtPayoffStrategy,
    maxMonths: number,
  ) {
    // Clonar estado de las deudas para la simulación
    const simDebts = debts.map((d) => ({
      id: d.id,
      concept: d.concept,
      remainingCents: d.remainingAmountCents,
      rateBasisPts: d.interestRateBasisPts,
      rateType: d.interestRateType,
      annualRateBasisPts: d.annualRateBasisPts,
      minPaymentCents:
        d.minimumMonthlyPaymentCents && d.minimumMonthlyPaymentCents > 0n
          ? d.minimumMonthlyPaymentCents
          : this.calculateDefaultMinPayment(
              d.remainingAmountCents,
              d.interestRateBasisPts,
              d.interestRateType,
            ),
      totalInterestPaidCents: 0n,
      isPaid: false,
    }));

    let currentMonth = 0;
    const payoffOrder: Array<{
      debtId: string;
      concept: string;
      monthFinished: number;
      interestPaidCents: bigint;
    }> = [];

    while (currentMonth < maxMonths && simDebts.some((d) => !d.isPaid)) {
      currentMonth++;

      // A. Devengar intereses y cobrar cuotas mínimas
      for (const d of simDebts) {
        if (d.isPaid) continue;

        const interest = this.calculateMonthlyInterestCents(
          d.remainingCents,
          d.rateBasisPts,
          d.rateType,
        );
        d.totalInterestPaidCents += interest;

        // Pagar la cuota mínima
        let payment = d.minPaymentCents;
        const totalNeeded = d.remainingCents + interest;
        if (payment > totalNeeded) {
          payment = totalNeeded;
        }

        const principal = payment > interest ? payment - interest : 0n;
        d.remainingCents = d.remainingCents > principal ? d.remainingCents - principal : 0n;

        if (d.remainingCents <= 0n) {
          d.isPaid = true;
          payoffOrder.push({
            debtId: d.id,
            concept: d.concept,
            monthFinished: currentMonth,
            interestPaidCents: d.totalInterestPaidCents,
          });
        }
      }

      // B. Aplicar el extra mensual a la deuda prioritaria según la estrategia
      let extraAvailable = extraMonthlyCents;

      while (extraAvailable > 0n && simDebts.some((d) => !d.isPaid)) {
        // Ordenar según estrategia
        const unpaid = simDebts.filter((d) => !d.isPaid);

        unpaid.sort((a, b) => {
          if (strategy === DebtPayoffStrategy.AVALANCHE) {
            // Mayor tasa anual primero
            return b.annualRateBasisPts - a.annualRateBasisPts;
          }
          // BOLA DE NIEVE: Menor saldo restante primero
          if (a.remainingCents < b.remainingCents) return -1;
          if (a.remainingCents > b.remainingCents) return 1;
          return 0;
        });

        const target = unpaid[0];
        const canPay = extraAvailable > target.remainingCents ? target.remainingCents : extraAvailable;

        target.remainingCents -= canPay;
        extraAvailable -= canPay;

        if (target.remainingCents <= 0n) {
          target.isPaid = true;
          // Si no estaba aún registrada en el orden de liquidación de este mes
          if (!payoffOrder.some((p) => p.debtId === target.id)) {
            payoffOrder.push({
              debtId: target.id,
              concept: target.concept,
              monthFinished: currentMonth,
              interestPaidCents: target.totalInterestPaidCents,
            });
          }
        }
      }
    }

    const totalInterestPaidCents = simDebts.reduce(
      (acc, d) => acc + d.totalInterestPaidCents,
      0n,
    );

    return {
      totalMonths: currentMonth,
      totalInterestPaidCents,
      payoffOrder,
    };
  }

  /**
   * Si una deuda no tiene cuota mínima especificada, se calcula una cuota razonable por defecto:
   * 2.5% del saldo vivo o intereses del mes + 20 € (2.000 céntimos), lo que sea mayor.
   */
  private calculateDefaultMinPayment(
    remainingCents: bigint,
    rateBasisPts: number,
    rateType: InterestRateType,
  ): bigint {
    const monthlyInterest = this.calculateMonthlyInterestCents(
      remainingCents,
      rateBasisPts,
      rateType,
    );
    const twoPercentAndHalf = (remainingCents * 250n + 5000n) / 10000n;
    const baseMin = monthlyInterest + 2000n; // intereses + 20 €
    return twoPercentAndHalf > baseMin ? twoPercentAndHalf : baseMin;
  }
}
