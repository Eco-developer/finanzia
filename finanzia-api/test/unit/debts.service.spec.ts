import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { DebtsService } from "../../src/core/application/debts/debts.service";
import { DebtInterestCalculatorService } from "../../src/core/domain/services/debt-interest-calculator.service";
import {
  DEBT_REPOSITORY,
  IDebtRepository,
} from "../../src/core/domain/repositories/debt.repository.interface";
import { DebtEntity } from "../../src/core/domain/entities/debt.entity";
import { DebtAmortizationEntity } from "../../src/core/domain/entities/debt-amortization.entity";
import { DebtPayoffStrategy, DebtStatus, InterestRateType } from "../../src/core/domain/types/debt.types";

describe("DebtsService (Application Core)", () => {
  let service: DebtsService;
  let debtRepo: jest.Mocked<IDebtRepository>;
  let calculator: DebtInterestCalculatorService;

  const mockUserId = "user-123";

  const createMockDebt = (overrides: Partial<DebtEntity> = {}): DebtEntity =>
    new DebtEntity(
      overrides.id ?? "debt-1",
      overrides.userId ?? mockUserId,
      overrides.concept ?? "Préstamo Coche Santander",
      overrides.creditor ?? "Banco Santander",
      overrides.initialAmountCents ?? 1000000n, // 10.000 €
      overrides.remainingAmountCents ?? 800000n, // 8.000 €
      overrides.interestRateBasisPts ?? 650, // 6.50%
      overrides.interestRateType ?? InterestRateType.ANNUAL,
      overrides.minimumMonthlyPaymentCents ?? 22000n, // 220 €
      overrides.dueDate ?? new Date("2028-06-30"),
      overrides.status ?? DebtStatus.ACTIVE,
      overrides.paidOffAt ?? null,
      overrides.isImmutable ?? false,
      overrides.notes ?? null,
      overrides.createdAt ?? new Date(),
      overrides.updatedAt ?? new Date(),
      overrides.amortizations ?? [],
    );

  beforeEach(async () => {
    calculator = new DebtInterestCalculatorService();

    debtRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createAmortization: jest.fn(),
      getAmortizationsByDebtId: jest.fn(),
      executeAmortizationTransaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DebtsService,
        { provide: DEBT_REPOSITORY, useValue: debtRepo },
        { provide: DebtInterestCalculatorService, useValue: calculator },
      ],
    }).compile();

    service = module.get<DebtsService>(DebtsService);
  });

  describe("createDebt", () => {
    it("debe crear una nueva deuda activa correctamente", async () => {
      const mockCreated = createMockDebt();
      debtRepo.create.mockResolvedValue(mockCreated);

      const result = await service.createDebt(mockUserId, {
        concept: "Préstamo Coche Santander",
        initialAmountCents: 1000000,
        remainingAmountCents: 800000,
        interestRateBasisPts: 650,
        interestRateType: InterestRateType.ANNUAL,
      });

      expect(debtRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          concept: "Préstamo Coche Santander",
          initialAmountCents: 1000000n,
          remainingAmountCents: 800000n,
          status: DebtStatus.ACTIVE,
          isImmutable: false,
        }),
      );
      expect(result.id).toBe("debt-1");
      expect(result.remainingAmountCents).toBe("800000");
    });

    it("debe rechazar si el saldo restante es mayor que el importe original", async () => {
      await expect(
        service.createDebt(mockUserId, {
          concept: "Deuda Invalida",
          initialAmountCents: 50000,
          remainingAmountCents: 60000, // mayor que inicial
          interestRateBasisPts: 500,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getActiveDebts y métricas consolidadas", () => {
    it("debe listar deudas activas y calcular el resumen financiero agregado", async () => {
      const debt1 = createMockDebt({
        id: "d1",
        remainingAmountCents: 100000n, // 1.000 € al 10%
        interestRateBasisPts: 1000,
        interestRateType: InterestRateType.ANNUAL,
        minimumMonthlyPaymentCents: 5000n,
      });
      const debt2 = createMockDebt({
        id: "d2",
        remainingAmountCents: 300000n, // 3.000 € al 5%
        interestRateBasisPts: 500,
        interestRateType: InterestRateType.ANNUAL,
        minimumMonthlyPaymentCents: 10000n,
      });

      debtRepo.findByUserId.mockResolvedValue([debt1, debt2]);

      const result = await service.getActiveDebts(mockUserId);

      expect(result.debts).toHaveLength(2);
      expect(result.summary.activeDebtsCount).toBe(2);
      expect(result.summary.totalRemainingCents).toBe("400000"); // 4.000,00 €
      // Tasa ponderada: (1000€ * 1000bps + 3000€ * 500bps) / 4000€ = (1M + 1.5M)/4000 = 625 bps (6.25%)
      expect(result.summary.weightedAverageRateBasisPts).toBe(625);
    });
  });

  describe("Regla de Inmutabilidad al 100% (update y delete)", () => {
    it("debe actualizar una deuda activa que no esté blindada", async () => {
      const activeDebt = createMockDebt({ isImmutable: false, status: DebtStatus.ACTIVE });
      debtRepo.findById.mockResolvedValue(activeDebt);
      debtRepo.update.mockResolvedValue(
        createMockDebt({ concept: "Concepto Modificado" }),
      );

      const result = await service.updateDebt(mockUserId, "debt-1", {
        concept: "Concepto Modificado",
      });

      expect(result.concept).toBe("Concepto Modificado");
    });

    it("debe rechazar con ForbiddenException si se intenta editar una deuda liquidada (isImmutable = true)", async () => {
      const paidDebt = createMockDebt({
        isImmutable: true,
        status: DebtStatus.PAID_OFF,
        remainingAmountCents: 0n,
      });
      debtRepo.findById.mockResolvedValue(paidDebt);

      await expect(
        service.updateDebt(mockUserId, "debt-1", { concept: "Cambio Prohibido" }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("debe rechazar con ForbiddenException si se intenta eliminar una deuda liquidada del historial inmutable", async () => {
      const paidDebt = createMockDebt({
        isImmutable: true,
        status: DebtStatus.PAID_OFF,
        remainingAmountCents: 0n,
      });
      debtRepo.findById.mockResolvedValue(paidDebt);

      await expect(
        service.deleteDebt(mockUserId, "debt-1"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("Amortización de deudas (amortizeDebt)", () => {
    it("debe registrar una amortización parcial reduciendo el capital vivo", async () => {
      const debt = createMockDebt({
        remainingAmountCents: 500000n, // 5.000 €
        interestRateBasisPts: 600, // 6% anual -> 25 € de interés
      });
      debtRepo.findById.mockResolvedValue(debt);

      const updatedDebt = createMockDebt({
        remainingAmountCents: 452500n,
        status: DebtStatus.ACTIVE,
      });
      const mockAmortization = new DebtAmortizationEntity(
        "amort-1",
        "debt-1",
        mockUserId,
        null,
        null,
        50000n,
        47500n,
        2500n,
        452500n,
        new Date(),
        null,
        new Date(),
      );

      debtRepo.executeAmortizationTransaction.mockResolvedValue({
        debt: updatedDebt,
        amortization: mockAmortization,
      });

      const result = await service.amortizeDebt(mockUserId, "debt-1", {
        amountCents: 50000, // 500 €
      });

      expect(result.isFullyPaid).toBe(false);
      expect(result.amortization.amountCents).toBe("50000");
    });

    it("debe sellar automáticamente al 100% (PAID_OFF, isImmutable: true) cuando el abono extingue la deuda", async () => {
      const debt = createMockDebt({
        remainingAmountCents: 10000n, // 100 € restantes
        interestRateBasisPts: 600, // 0.50 € interés
      });
      debtRepo.findById.mockResolvedValue(debt);

      const fullyPaidDebt = createMockDebt({
        remainingAmountCents: 0n,
        status: DebtStatus.PAID_OFF,
        isImmutable: true,
        paidOffAt: new Date(),
      });
      const mockAmortization = new DebtAmortizationEntity(
        "amort-final",
        "debt-1",
        mockUserId,
        null,
        null,
        15000n,
        10000n,
        50n,
        0n,
        new Date(),
        "Última cuota",
        new Date(),
      );

      debtRepo.executeAmortizationTransaction.mockResolvedValue({
        debt: fullyPaidDebt,
        amortization: mockAmortization,
      });

      const result = await service.amortizeDebt(mockUserId, "debt-1", {
        amountCents: 15000,
        notes: "Última cuota",
      });

      expect(result.isFullyPaid).toBe(true);
      expect(result.debt.status).toBe(DebtStatus.PAID_OFF);
      expect(result.debt.isImmutable).toBe(true);
    });

    it("debe rechazar amortizaciones si la deuda ya fue liquidada", async () => {
      const paidDebt = createMockDebt({
        status: DebtStatus.PAID_OFF,
        isImmutable: true,
        remainingAmountCents: 0n,
      });
      debtRepo.findById.mockResolvedValue(paidDebt);

      await expect(
        service.amortizeDebt(mockUserId, "debt-1", { amountCents: 10000 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("Simulador de amortización (simulatePayoff)", () => {
    it("debe simular plan acelerado comparativo", async () => {
      const activeDebt = createMockDebt();
      debtRepo.findByUserId.mockResolvedValue([activeDebt]);

      const result = await service.simulatePayoff(mockUserId, {
        extraMonthlyCents: 10000,
        strategy: DebtPayoffStrategy.AVALANCHE,
      });

      expect(result.strategy).toBe(DebtPayoffStrategy.AVALANCHE);
      expect(result.totalMonths).toBeGreaterThan(0);
    });
  });
});
