import { DebtInterestCalculatorService } from "../../src/core/domain/services/debt-interest-calculator.service";
import { DebtEntity } from "../../src/core/domain/entities/debt.entity";
import {
  DebtPayoffStrategy,
  DebtStatus,
  InterestRateType,
} from "../../src/core/domain/types/debt.types";

describe("DebtInterestCalculatorService (Zero-Float Financial Math)", () => {
  let calculator: DebtInterestCalculatorService;

  beforeEach(() => {
    calculator = new DebtInterestCalculatorService();
  });

  describe("Cálculo de intereses mensuales devengados", () => {
    it("debe calcular el interés mensual exacto para tasa anual proporcional (ej. 10.000 € al 6% anual = 50,00 €)", () => {
      const remainingCents = 1000000n; // 10.000,00 €
      const rateBasisPts = 600; // 6.00%
      const interest = calculator.calculateMonthlyInterestCents(
        remainingCents,
        rateBasisPts,
        InterestRateType.ANNUAL,
      );

      expect(interest).toBe(5000n); // 50,00 € exactos
    });

    it("debe aplicar redondeo medio hacia arriba (round-half-up) en tasas anuales con decimales", () => {
      // 1.250,00 € al 18.50% anual (1850 bps):
      // (125000 * 1850 + 60000) / 120000 = (231250000 + 60000) / 120000 = 231310000 / 120000 = 1927.58 -> 1927 céntimos (19,27 €)
      const remainingCents = 125000n; // 1.250,00 €
      const rateBasisPts = 1850; // 18.50%
      const interest = calculator.calculateMonthlyInterestCents(
        remainingCents,
        rateBasisPts,
        InterestRateType.ANNUAL,
      );

      expect(interest).toBe(1927n); // 19,27 €
    });

    it("debe calcular el interés mensual exacto para tasa mensual directa (ej. 1.000 € al 1.50% mensual = 15,00 €)", () => {
      const remainingCents = 100000n; // 1.000,00 €
      const rateBasisPts = 150; // 1.50% mensual
      const interest = calculator.calculateMonthlyInterestCents(
        remainingCents,
        rateBasisPts,
        InterestRateType.MONTHLY,
      );

      expect(interest).toBe(1500n); // 15,00 €
    });

    it("debe devolver 0 si el saldo es cero o la tasa es 0%", () => {
      expect(
        calculator.calculateMonthlyInterestCents(
          0n,
          500,
          InterestRateType.ANNUAL,
        ),
      ).toBe(0n);
      expect(
        calculator.calculateMonthlyInterestCents(
          50000n,
          0,
          InterestRateType.ANNUAL,
        ),
      ).toBe(0n);
    });
  });

  describe("Estimación de cuota mensual constante (Sistema Francés)", () => {
    it("debe calcular cuota lineal exacta cuando el interés es 0%", () => {
      const principalCents = 120000n; // 1.200,00 €
      const termMonths = 12;
      const payment = calculator.estimateMonthlyPaymentCents(
        principalCents,
        0,
        InterestRateType.ANNUAL,
        termMonths,
      );

      expect(payment).toBe(10000n); // 100,00 €/mes
    });

    it("debe estimar la cuota mensual del Sistema Francés con intereses anuales (ej. 10.000 € al 6% a 24 meses)", () => {
      const principalCents = 1000000n; // 10.000,00 €
      const rateBasisPts = 600; // 6.00% anual
      const termMonths = 24;

      const payment = calculator.estimateMonthlyPaymentCents(
        principalCents,
        rateBasisPts,
        InterestRateType.ANNUAL,
        termMonths,
      );

      // Cuota teórica estándar francesa: ~443,21 € (44321 céntimos)
      expect(payment).toBeGreaterThanOrEqual(44315n);
      expect(payment).toBeLessThanOrEqual(44330n);
    });
  });

  describe("Desglose de amortización (splitAmortizationPayment)", () => {
    it("debe desglosar pago entre intereses acumulados y reducción de capital", () => {
      const currentRemaining = 500000n; // 5.000,00 €
      const rateBasisPts = 600; // 6% anual -> 25,00 € de interés mensual
      const paymentAmount = 10000n; // 100,00 € de abono

      const result = calculator.splitAmortizationPayment(
        paymentAmount,
        currentRemaining,
        rateBasisPts,
        InterestRateType.ANNUAL,
      );

      expect(result.interestCents).toBe(2500n); // 25,00 € cubren interés
      expect(result.principalCents).toBe(7500n); // 75,00 € reducen capital
      expect(result.newRemainingCents).toBe(492500n); // 4.925,00 € saldo restante
      expect(result.isPaidOff).toBe(false);
    });

    it("debe liquidar al 100% (isPaidOff: true) si el abono cubre todo el capital restante", () => {
      const currentRemaining = 20000n; // 200,00 € restantes
      const rateBasisPts = 600; // 6% anual -> 1,00 € de interés mensual
      const paymentAmount = 25000n; // 250,00 € de abono (mayor que capital + interés)

      const result = calculator.splitAmortizationPayment(
        paymentAmount,
        currentRemaining,
        rateBasisPts,
        InterestRateType.ANNUAL,
      );

      expect(result.interestCents).toBe(100n); // 1,00 € de interés
      expect(result.principalCents).toBe(20000n); // 200,00 € amortizan todo el capital
      expect(result.newRemainingCents).toBe(0n);
      expect(result.isPaidOff).toBe(true);
    });
  });

  describe("Simulación de estrategias de amortización (Avalancha vs Bola de Nieve)", () => {
    const debtCard = new DebtEntity(
      "debt-1",
      "user-1",
      "Tarjeta Crédito Revolving",
      "Banco Santander",
      200000n, // 2.000 € inicial
      150000n, // 1.500 € pendiente
      1800, // 18.00% anual (tasa alta)
      InterestRateType.ANNUAL,
      6000n, // 60 €/mes mínimo
      null,
      DebtStatus.ACTIVE,
      null,
      false,
      null,
      new Date(),
      new Date(),
    );

    const debtCar = new DebtEntity(
      "debt-2",
      "user-1",
      "Préstamo Coche",
      "BBVA",
      1000000n, // 10.000 € inicial
      800000n, // 8.000 € pendiente (saldo más grande, menor tasa)
      550, // 5.50% anual
      InterestRateType.ANNUAL,
      20000n, // 200 €/mes
      null,
      DebtStatus.ACTIVE,
      null,
      false,
      null,
      new Date(),
      new Date(),
    );

    it("debe simular con éxito la estrategia AVALANCHA (prioriza la tarjeta al 18% frente al coche al 5.5%)", () => {
      const extraMonthlyCents = 15000n; // 150 €/mes extra
      const result = calculator.simulatePayoffPlan(
        [debtCard, debtCar],
        extraMonthlyCents,
        DebtPayoffStrategy.AVALANCHE,
      );

      expect(result.strategy).toBe(DebtPayoffStrategy.AVALANCHE);
      expect(result.totalMonths).toBeLessThan(result.baselineMonths);
      expect(result.monthsSaved).toBeGreaterThan(0);
      expect(result.interestSavedCents).toBeGreaterThan(0n);
      // La primera en liquidarse debe ser la tarjeta con interés más alto
      expect(result.payoffOrder[0].debtId).toBe("debt-1");
    });

    it("debe simular con éxito la estrategia BOLA DE NIEVE (prioriza el saldo menor)", () => {
      const extraMonthlyCents = 15000n; // 150 €/mes extra
      const result = calculator.simulatePayoffPlan(
        [debtCard, debtCar],
        extraMonthlyCents,
        DebtPayoffStrategy.SNOWBALL,
      );

      expect(result.strategy).toBe(DebtPayoffStrategy.SNOWBALL);
      expect(result.totalMonths).toBeLessThan(result.baselineMonths);
      expect(result.monthsSaved).toBeGreaterThan(0);
      expect(result.interestSavedCents).toBeGreaterThan(0n);
      // Saldo menor (1.500 € vs 8.000 €) se liquida primero
      expect(result.payoffOrder[0].debtId).toBe("debt-1");
    });

    it("debe devolver métricas en cero si no hay deudas activas", () => {
      const result = calculator.simulatePayoffPlan(
        [],
        10000n,
        DebtPayoffStrategy.AVALANCHE,
      );

      expect(result.totalMonths).toBe(0);
      expect(result.monthsSaved).toBe(0);
      expect(result.interestSavedCents).toBe(0n);
    });
  });
});
