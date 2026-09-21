import { TransactionsService } from "../../src/core/application/transactions/transactions.service";
import { TransactionEntity } from "../../src/core/domain/entities/transaction.entity";
import { AccountEntity } from "../../src/core/domain/entities/account.entity";
import { CategoryEntity } from "../../src/core/domain/entities/category.entity";
import {
  AccountType,
  CategoryType,
  TransactionType,
} from "../../src/core/domain/types/financial.types";
import { AccountNotFoundException } from "../../src/core/domain/exceptions/account-not-found.exception";
import { UnauthorizedAccountAccessException } from "../../src/core/domain/exceptions/unauthorized-account-access.exception";
import { CategoryNotFoundException } from "../../src/core/domain/exceptions/category-not-found.exception";
import { UnauthorizedCategoryAccessException } from "../../src/core/domain/exceptions/unauthorized-category-access.exception";
import { InvalidTransactionAmountException } from "../../src/core/domain/exceptions/invalid-transaction-amount.exception";
import { InvalidTransferException } from "../../src/core/domain/exceptions/invalid-transfer.exception";

describe("TransactionsService (Unit Tests)", () => {
  let transactionsService: TransactionsService;
  let mockTransactionRepository: any;
  let mockAccountRepository: any;
  let mockCategoryRepository: any;

  const mockAccount = new AccountEntity(
    "acc-owner-1",
    "user-owner-id",
    "Cuenta Principal",
    AccountType.CHECKING,
    BigInt(100000), // 1.000,00 €
    BigInt(100000),
    "EUR",
    false,
    new Date(),
    new Date(),
  );

  const mockTargetAccount = new AccountEntity(
    "acc-owner-2",
    "user-owner-id",
    "Cuenta Ahorro",
    AccountType.SAVINGS,
    BigInt(50000), // 500,00 €
    BigInt(50000),
    "EUR",
    false,
    new Date(),
    new Date(),
  );

  const mockCategory = new CategoryEntity(
    "cat-owner-1",
    "user-owner-id",
    null,
    "Alimentación",
    "shopping-cart",
    "#10B981",
    CategoryType.EXPENSE,
    false,
    new Date(),
    new Date(),
  );

  beforeEach(() => {
    mockTransactionRepository = {
      createTransactionWithBalance: jest.fn(),
      createTransferWithBalances: jest.fn(),
      findAllByUserId: jest.fn(),
      findById: jest.fn(),
      deleteTransactionWithBalance: jest.fn(),
      updateTransactionWithBalance: jest.fn(),
    };

    mockAccountRepository = {
      findById: jest.fn(),
    };

    mockCategoryRepository = {
      findById: jest.fn(),
    };

    transactionsService = new TransactionsService(
      mockTransactionRepository,
      mockAccountRepository,
      mockCategoryRepository,
    );
  });

  describe("Creación de transacciones (Ingresos y Gastos)", () => {
    it("debe registrar un gasto asegurando importe negativo en céntimos y saldo actualizado atómicamente", async () => {
      mockAccountRepository.findById.mockResolvedValue(mockAccount);
      mockCategoryRepository.findById.mockResolvedValue(mockCategory);

      const createdTx = new TransactionEntity(
        "tx-1",
        "user-owner-id",
        "acc-owner-1",
        "cat-owner-1",
        BigInt(-4590), // -45,90 €
        TransactionType.EXPENSE,
        new Date("2026-09-13T12:00:00Z"),
        "Mercadona",
        "Compra semanal",
        false,
        null,
        null,
        new Date(),
        new Date(),
      );

      mockTransactionRepository.createTransactionWithBalance.mockResolvedValue({
        transaction: createdTx,
        newAccountBalanceCents: BigInt(95410), // 100000 - 4590 = 95410
      });

      const result = await transactionsService.createTransaction(
        "user-owner-id",
        {
          accountId: "acc-owner-1",
          categoryId: "cat-owner-1",
          amountCents: 4590, // Enviado positivo o negativo se normaliza según EXPENSE
          type: TransactionType.EXPENSE,
          transactionDate: "2026-09-13T12:00:00.000Z",
          description: "Mercadona",
          notes: "Compra semanal",
        },
      );

      expect(
        mockTransactionRepository.createTransactionWithBalance,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-owner-id",
          accountId: "acc-owner-1",
          categoryId: "cat-owner-1",
          amountCents: BigInt(-4590),
          type: TransactionType.EXPENSE,
        }),
      );
      expect(result.transaction.amountCents).toBe(-4590);
      expect(result.newAccountBalanceCents).toBe(95410);
    });

    it("debe registrar un ingreso asegurando importe positivo en céntimos", async () => {
      mockAccountRepository.findById.mockResolvedValue(mockAccount);

      const createdTx = new TransactionEntity(
        "tx-2",
        "user-owner-id",
        "acc-owner-1",
        null,
        BigInt(200000), // +2.000,00 €
        TransactionType.INCOME,
        new Date("2026-09-13T12:00:00Z"),
        "Nómina Septiembre",
        null,
        false,
        null,
        null,
        new Date(),
        new Date(),
      );

      mockTransactionRepository.createTransactionWithBalance.mockResolvedValue({
        transaction: createdTx,
        newAccountBalanceCents: BigInt(300000),
      });

      const result = await transactionsService.createTransaction(
        "user-owner-id",
        {
          accountId: "acc-owner-1",
          amountCents: 200000,
          type: TransactionType.INCOME,
          transactionDate: "2026-09-13T12:00:00.000Z",
          description: "Nómina Septiembre",
        },
      );

      expect(
        mockTransactionRepository.createTransactionWithBalance,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          amountCents: BigInt(200000),
          type: TransactionType.INCOME,
        }),
      );
      expect(result.transaction.amountCents).toBe(200000);
      expect(result.newAccountBalanceCents).toBe(300000);
    });

    it("debe rechazar importe igual a cero", async () => {
      mockAccountRepository.findById.mockResolvedValue(mockAccount);

      await expect(
        transactionsService.createTransaction("user-owner-id", {
          accountId: "acc-owner-1",
          amountCents: 0,
          type: TransactionType.EXPENSE,
          transactionDate: "2026-09-13T12:00:00.000Z",
          description: "Cero",
        }),
      ).rejects.toThrow(InvalidTransactionAmountException);
    });

    it("debe rechazar transacción sobre una cuenta que no pertenece al usuario", async () => {
      const foreignAccount = new AccountEntity(
        "acc-foreign",
        "another-user-id",
        "Cuenta Ajena",
        AccountType.CHECKING,
        BigInt(50000),
        BigInt(50000),
        "EUR",
        false,
        new Date(),
        new Date(),
      );
      mockAccountRepository.findById.mockResolvedValue(foreignAccount);

      await expect(
        transactionsService.createTransaction("user-owner-id", {
          accountId: "acc-foreign",
          amountCents: 1000,
          type: TransactionType.EXPENSE,
          transactionDate: "2026-09-13T12:00:00.000Z",
          description: "Intento indebido",
        }),
      ).rejects.toThrow(UnauthorizedAccountAccessException);
    });

    it("debe lanzar AccountNotFoundException si la cuenta no existe", async () => {
      mockAccountRepository.findById.mockResolvedValue(null);

      await expect(
        transactionsService.createTransaction("user-owner-id", {
          accountId: "non-existent-account",
          amountCents: 1000,
          type: TransactionType.EXPENSE,
          transactionDate: "2026-09-13T12:00:00.000Z",
          description: "Prueba",
        }),
      ).rejects.toThrow(AccountNotFoundException);
    });

    it("debe lanzar CategoryNotFoundException si la categoría asignada no existe", async () => {
      mockAccountRepository.findById.mockResolvedValue(mockAccount);
      mockCategoryRepository.findById.mockResolvedValue(null);

      await expect(
        transactionsService.createTransaction("user-owner-id", {
          accountId: "acc-owner-1",
          categoryId: "non-existent-category",
          amountCents: 1000,
          type: TransactionType.EXPENSE,
          transactionDate: "2026-09-13T12:00:00.000Z",
          description: "Prueba",
        }),
      ).rejects.toThrow(CategoryNotFoundException);
    });

    it("debe rechazar asignación de categoría de otro usuario", async () => {
      mockAccountRepository.findById.mockResolvedValue(mockAccount);
      const foreignCategory = new CategoryEntity(
        "cat-foreign",
        "another-user-id",
        null,
        "Privada",
        null,
        null,
        CategoryType.EXPENSE,
        false,
        new Date(),
        new Date(),
      );
      mockCategoryRepository.findById.mockResolvedValue(foreignCategory);

      await expect(
        transactionsService.createTransaction("user-owner-id", {
          accountId: "acc-owner-1",
          categoryId: "cat-foreign",
          amountCents: 1000,
          type: TransactionType.EXPENSE,
          transactionDate: "2026-09-13T12:00:00.000Z",
          description: "Intento indebido",
        }),
      ).rejects.toThrow(UnauthorizedCategoryAccessException);
    });
  });

  describe("Transferencias entre cuentas propias", () => {
    it("debe crear dos transacciones vinculadas y actualizar saldos de ambas cuentas", async () => {
      mockAccountRepository.findById
        .mockResolvedValueOnce(mockAccount)
        .mockResolvedValueOnce(mockTargetAccount);

      const fromTx = new TransactionEntity(
        "tx-from",
        "user-owner-id",
        "acc-owner-1",
        null,
        BigInt(-15000),
        TransactionType.TRANSFER,
        new Date("2026-09-13T12:00:00Z"),
        "Traspaso ahorro",
        null,
        false,
        "tx-to",
        null,
        new Date(),
        new Date(),
      );

      const toTx = new TransactionEntity(
        "tx-to",
        "user-owner-id",
        "acc-owner-2",
        null,
        BigInt(15000),
        TransactionType.TRANSFER,
        new Date("2026-09-13T12:00:00Z"),
        "Traspaso ahorro",
        null,
        false,
        "tx-from",
        null,
        new Date(),
        new Date(),
      );

      mockTransactionRepository.createTransferWithBalances.mockResolvedValue({
        fromTransaction: fromTx,
        toTransaction: toTx,
        newFromBalanceCents: BigInt(85000),
        newToBalanceCents: BigInt(65000),
      });

      const result = await transactionsService.createTransfer("user-owner-id", {
        fromAccountId: "acc-owner-1",
        toAccountId: "acc-owner-2",
        amountCents: 15000,
        transactionDate: "2026-09-13T12:00:00.000Z",
        description: "Traspaso ahorro",
      });

      expect(
        mockTransactionRepository.createTransferWithBalances,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-owner-id",
          fromAccountId: "acc-owner-1",
          toAccountId: "acc-owner-2",
          amountCents: BigInt(15000),
        }),
      );
      expect(result.newFromBalanceCents).toBe(85000);
      expect(result.newToBalanceCents).toBe(65000);
      expect(result.fromTransaction.transferCounterpartId).toBe("tx-to");
      expect(result.toTransaction.transferCounterpartId).toBe("tx-from");
    });

    it("debe rechazar transferencias con la misma cuenta de origen y destino", async () => {
      await expect(
        transactionsService.createTransfer("user-owner-id", {
          fromAccountId: "acc-owner-1",
          toAccountId: "acc-owner-1",
          amountCents: 15000,
          transactionDate: "2026-09-13T12:00:00.000Z",
          description: "Misma cuenta",
        }),
      ).rejects.toThrow(InvalidTransferException);
    });

    it("debe rechazar transferencias con importe negativo o cero", async () => {
      mockAccountRepository.findById
        .mockResolvedValueOnce(mockAccount)
        .mockResolvedValueOnce(mockTargetAccount);

      await expect(
        transactionsService.createTransfer("user-owner-id", {
          fromAccountId: "acc-owner-1",
          toAccountId: "acc-owner-2",
          amountCents: -500,
          transactionDate: "2026-09-13T12:00:00.000Z",
          description: "Importe negativo",
        }),
      ).rejects.toThrow(InvalidTransferException);
    });
  });

  describe("Eliminación de transacciones", () => {
    it("debe eliminar la transacción y revertir saldos", async () => {
      const existingTx = new TransactionEntity(
        "tx-1",
        "user-owner-id",
        "acc-owner-1",
        null,
        BigInt(-5000),
        TransactionType.EXPENSE,
        new Date(),
        "Prueba",
        null,
        false,
        null,
        null,
        new Date(),
        new Date(),
      );
      mockTransactionRepository.findById.mockResolvedValue(existingTx);
      mockTransactionRepository.deleteTransactionWithBalance.mockResolvedValue({
        deletedId: "tx-1",
        affectedAccountIds: ["acc-owner-1"],
      });

      const result = await transactionsService.deleteTransaction(
        "user-owner-id",
        "tx-1",
      );

      expect(
        mockTransactionRepository.deleteTransactionWithBalance,
      ).toHaveBeenCalledWith("tx-1");
      expect(result.deletedId).toBe("tx-1");
    });

    it("debe eliminar múltiples transacciones y acumular cuentas afectadas", async () => {
      const tx1 = new TransactionEntity(
        "tx-1",
        "user-owner-id",
        "acc-owner-1",
        null,
        BigInt(-5000),
        TransactionType.EXPENSE,
        new Date(),
        "Prueba 1",
        null,
        false,
        null,
        null,
        new Date(),
        new Date(),
      );
      const tx2 = new TransactionEntity(
        "tx-2",
        "user-owner-id",
        "acc-owner-2",
        null,
        BigInt(-3000),
        TransactionType.EXPENSE,
        new Date(),
        "Prueba 2",
        null,
        false,
        null,
        null,
        new Date(),
        new Date(),
      );

      mockTransactionRepository.findById.mockImplementation((id: string) => {
        if (id === "tx-1") return Promise.resolve(tx1);
        if (id === "tx-2") return Promise.resolve(tx2);
        return Promise.resolve(null);
      });
      mockTransactionRepository.deleteTransactionWithBalance.mockImplementation(
        (id: string) =>
          Promise.resolve({
            deletedId: id,
            affectedAccountIds:
              id === "tx-1" ? ["acc-owner-1"] : ["acc-owner-2"],
          }),
      );

      const result = await transactionsService.deleteMultipleTransactions(
        "user-owner-id",
        ["tx-1", "tx-2"],
      );

      expect(result.deletedCount).toBe(2);
      expect(result.affectedAccountIds).toContain("acc-owner-1");
      expect(result.affectedAccountIds).toContain("acc-owner-2");
    });
  });

  describe("Modificación de transacciones (updateTransaction)", () => {
    it("debe actualizar concepto e importe y sincronizar saldos", async () => {
      const existingTx = new TransactionEntity(
        "tx-1",
        "user-owner-id",
        "acc-owner-1",
        null,
        BigInt(-5000),
        TransactionType.EXPENSE,
        new Date(),
        "Concepto Original",
        null,
        false,
        null,
        null,
        new Date(),
        new Date(),
      );

      const updatedTx = new TransactionEntity(
        "tx-1",
        "user-owner-id",
        "acc-owner-1",
        null,
        BigInt(-7500),
        TransactionType.EXPENSE,
        new Date(),
        "Concepto Modificado",
        null,
        false,
        null,
        null,
        new Date(),
        new Date(),
      );

      mockTransactionRepository.findById.mockResolvedValue(existingTx);
      mockTransactionRepository.updateTransactionWithBalance.mockResolvedValue({
        transaction: updatedTx,
        affectedAccountIds: ["acc-owner-1"],
      });

      const result = await transactionsService.updateTransaction(
        "user-owner-id",
        "tx-1",
        {
          description: "Concepto Modificado",
          amountCents: 7500,
        },
      );

      expect(result.transaction.description).toBe("Concepto Modificado");
      expect(result.transaction.amountCents).toBe(-7500);
      expect(
        mockTransactionRepository.updateTransactionWithBalance,
      ).toHaveBeenCalledWith(
        "tx-1",
        expect.objectContaining({
          description: "Concepto Modificado",
          amountCents: -7500n,
        }),
      );
    });

    it("debe rechazar la modificación de una transferencia directa", async () => {
      const transferTx = new TransactionEntity(
        "tx-transfer-1",
        "user-owner-id",
        "acc-owner-1",
        null,
        BigInt(-5000),
        TransactionType.TRANSFER,
        new Date(),
        "Traspaso",
        null,
        false,
        "tx-transfer-2",
        null,
        new Date(),
        new Date(),
      );

      mockTransactionRepository.findById.mockResolvedValue(transferTx);

      await expect(
        transactionsService.updateTransaction(
          "user-owner-id",
          "tx-transfer-1",
          {
            description: "Cambio no permitido",
          },
        ),
      ).rejects.toThrow(InvalidTransferException);
    });
  });

  describe("getTransactions con paginación y filtros", () => {
    it("debe retornar transacciones paginadas con valores por defecto (page=1, limit=20)", async () => {
      const mockTx = new TransactionEntity(
        "tx-page-1",
        "user-owner-id",
        "acc-owner-1",
        "cat-owner-1",
        BigInt(-2500),
        TransactionType.EXPENSE,
        new Date("2026-09-15T10:00:00.000Z"),
        "Cena",
        null,
        false,
        null,
        null,
        new Date(),
        new Date(),
      );

      mockTransactionRepository.findAllByUserId.mockResolvedValue({
        transactions: [mockTx],
        totalRecords: 1,
      });

      const result = await transactionsService.getTransactions("user-owner-id", {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalRecords).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe("tx-page-1");
      expect(mockTransactionRepository.findAllByUserId).toHaveBeenCalledWith(
        "user-owner-id",
        expect.objectContaining({
          page: 1,
          limit: 20,
        }),
      );
    });

    it("debe respetar parámetros de paginación personalizados (page=3, limit=10) y calcular totalPages", async () => {
      mockTransactionRepository.findAllByUserId.mockResolvedValue({
        transactions: [],
        totalRecords: 45,
      });

      const result = await transactionsService.getTransactions("user-owner-id", {
        page: 3,
        limit: 10,
      });

      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.totalRecords).toBe(45);
      expect(result.totalPages).toBe(5); // Math.ceil(45 / 10) = 5
      expect(mockTransactionRepository.findAllByUserId).toHaveBeenCalledWith(
        "user-owner-id",
        expect.objectContaining({
          page: 3,
          limit: 10,
        }),
      );
    });

    it("debe garantizar que totalPages sea al menos 1 cuando totalRecords es 0", async () => {
      mockTransactionRepository.findAllByUserId.mockResolvedValue({
        transactions: [],
        totalRecords: 0,
      });

      const result = await transactionsService.getTransactions("user-owner-id", {
        page: 1,
        limit: 10,
      });

      expect(result.totalRecords).toBe(0);
      expect(result.totalPages).toBe(1);
    });

    it("debe verificar que la cuenta pertenezca al usuario si se filtra por accountId", async () => {
      mockAccountRepository.findById.mockResolvedValue(mockAccount);
      mockTransactionRepository.findAllByUserId.mockResolvedValue({
        transactions: [],
        totalRecords: 0,
      });

      const result = await transactionsService.getTransactions("user-owner-id", {
        accountId: "acc-owner-1",
      });

      expect(mockAccountRepository.findById).toHaveBeenCalledWith("acc-owner-1");
      expect(result.totalRecords).toBe(0);
    });

    it("debe rechazar la consulta si la cuenta pertenece a otro usuario", async () => {
      const foreignAccount = new AccountEntity(
        "acc-foreign",
        "other-user",
        "Cuenta Ajena",
        AccountType.CHECKING,
        BigInt(10000),
        BigInt(10000),
        "EUR",
        false,
        new Date(),
        new Date(),
      );
      mockAccountRepository.findById.mockResolvedValue(foreignAccount);

      await expect(
        transactionsService.getTransactions("user-owner-id", {
          accountId: "acc-foreign",
        }),
      ).rejects.toThrow(UnauthorizedAccountAccessException);
    });
  });
});
