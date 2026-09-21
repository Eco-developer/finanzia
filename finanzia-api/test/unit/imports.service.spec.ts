import { ImportsService } from "../../src/core/application/imports/imports.service";
import { AccountEntity } from "../../src/core/domain/entities/account.entity";
import { CategoryEntity } from "../../src/core/domain/entities/category.entity";
import { CsvTemplateEntity } from "../../src/core/domain/entities/csv-template.entity";
import {
  AccountType,
  CategoryType,
} from "../../src/core/domain/types/financial.types";
import { AccountNotFoundException } from "../../src/core/domain/exceptions/account-not-found.exception";
import { UnauthorizedAccountAccessException } from "../../src/core/domain/exceptions/unauthorized-account-access.exception";

describe("ImportsService (Unit Tests)", () => {
  let importsService: ImportsService;
  let mockAccountRepository: any;
  let mockTransactionRepository: any;
  let mockCategoryRepository: any;
  let mockCsvTemplateRepository: any;

  const mockUserAccount = new AccountEntity(
    "acc-123",
    "user-owner-id",
    "Cuenta Nómina",
    AccountType.CHECKING,
    BigInt(50000), // 500,00 €
    BigInt(50000),
    "EUR",
    false,
    new Date(),
    new Date(),
  );

  const mockForeignAccount = new AccountEntity(
    "acc-999",
    "other-user-id",
    "Cuenta Ajena",
    AccountType.CHECKING,
    BigInt(100000),
    BigInt(100000),
    "EUR",
    false,
    new Date(),
    new Date(),
  );

  const mockCategories = [
    new CategoryEntity(
      "cat-food",
      "user-owner-id",
      null,
      "Alimentación y Supermercado",
      "shopping-cart",
      "#10B981",
      CategoryType.EXPENSE,
      false,
      new Date(),
      new Date(),
    ),
    new CategoryEntity(
      "cat-fuel",
      "user-owner-id",
      null,
      "Transporte y Gasolina",
      "truck",
      "#F59E0B",
      CategoryType.EXPENSE,
      false,
      new Date(),
      new Date(),
    ),
    new CategoryEntity(
      "cat-salary",
      "user-owner-id",
      null,
      "Nómina Principal",
      "briefcase",
      "#059669",
      CategoryType.INCOME,
      false,
      new Date(),
      new Date(),
    ),
  ];

  beforeEach(() => {
    mockAccountRepository = {
      findById: jest.fn(),
    };
    mockTransactionRepository = {
      findExistingHashes: jest.fn(),
      createManyWithBalance: jest.fn(),
    };
    mockCategoryRepository = {
      findAllForUser: jest.fn(),
    };
    mockCsvTemplateRepository = {
      findAllByUserId: jest.fn(),
      findByUserIdAndBank: jest.fn(),
      upsertTemplate: jest.fn(),
      deleteById: jest.fn(),
    };

    importsService = new ImportsService(
      mockAccountRepository,
      mockTransactionRepository,
      mockCategoryRepository,
      mockCsvTemplateRepository,
    );
  });

  describe("previewImport", () => {
    it("debe lanzar AccountNotFoundException si la cuenta no existe", async () => {
      mockAccountRepository.findById.mockResolvedValue(null);

      await expect(
        importsService.previewImport("user-owner-id", {
          accountId: "acc-invalid",
          rows: [],
        }),
      ).rejects.toThrow(AccountNotFoundException);
    });

    it("debe lanzar UnauthorizedAccountAccessException si la cuenta pertenece a otro usuario", async () => {
      mockAccountRepository.findById.mockResolvedValue(mockForeignAccount);

      await expect(
        importsService.previewImport("user-owner-id", {
          accountId: "acc-999",
          rows: [],
        }),
      ).rejects.toThrow(UnauthorizedAccountAccessException);
    });

    it("debe previsualizar filas detectando duplicados y sugiriendo categorías por palabras clave", async () => {
      mockAccountRepository.findById.mockResolvedValue(mockUserAccount);
      // Hash de la segunda fila ya existe en DB
      mockTransactionRepository.findExistingHashes.mockResolvedValue([
        "hash-duplicate-123",
      ]);
      mockCategoryRepository.findAllForUser.mockResolvedValue(mockCategories);

      const result = await importsService.previewImport("user-owner-id", {
        accountId: "acc-123",
        rows: [
          {
            rowId: "row-1",
            date: "2026-09-10T00:00:00Z",
            description: "COMPRA EN MERCADONA MADRID",
            amountCents: -4520,
            hash: "hash-new-456",
          },
          {
            rowId: "row-2",
            date: "2026-09-08T00:00:00Z",
            description: "ESTACION REPSOL ALBACETE",
            amountCents: -6000,
            hash: "hash-duplicate-123",
          },
        ],
      });

      expect(result.totalRows).toBe(2);
      expect(result.newCount).toBe(1);
      expect(result.duplicateCount).toBe(1);

      // Fila 1: nueva, categoría sugerida Mercadona -> Alimentación
      expect(result.preview[0].isDuplicate).toBe(false);
      expect(result.preview[0].suggestedCategoryId).toBe("cat-food");

      // Fila 2: duplicada, categoría sugerida Repsol -> Transporte
      expect(result.preview[1].isDuplicate).toBe(true);
      expect(result.preview[1].suggestedCategoryId).toBe("cat-fuel");
    });

    it("debe neutralizar intentos de CSV Formula Injection en la descripción", async () => {
      mockAccountRepository.findById.mockResolvedValue(mockUserAccount);
      mockTransactionRepository.findExistingHashes.mockResolvedValue([]);
      mockCategoryRepository.findAllForUser.mockResolvedValue([]);

      const result = await importsService.previewImport("user-owner-id", {
        accountId: "acc-123",
        rows: [
          {
            rowId: "row-vuln",
            date: "2026-09-10T00:00:00Z",
            description: "=cmd|' /C calc'!A0",
            amountCents: -100,
            hash: "hash-vuln",
          },
        ],
      });

      expect(result.preview[0].isDuplicate).toBe(false);
    });
  });

  describe("commitImport", () => {
    it("debe insertar en bloque las transacciones no duplicadas y actualizar el saldo atómicamente", async () => {
      mockAccountRepository.findById.mockResolvedValue(mockUserAccount);
      // Hash2 ya existe en DB -> se debe omitir
      mockTransactionRepository.findExistingHashes.mockResolvedValue([
        "hash-duplicate-2",
      ]);
      mockTransactionRepository.createManyWithBalance.mockResolvedValue({
        count: 1,
        newAccountBalanceCents: BigInt(46500), // 50000 - 3500 = 46500
      });

      const result = await importsService.commitImport("user-owner-id", {
        accountId: "acc-123",
        rows: [
          {
            date: "2026-09-10T00:00:00Z",
            description: "Restaurante El Sol",
            amountCents: -3500,
            categoryId: "cat-food",
            deduplicationHash: "hash-new-1",
          },
          {
            date: "2026-09-09T00:00:00Z",
            description: "Duplicado ya importado",
            amountCents: -1200,
            deduplicationHash: "hash-duplicate-2",
          },
        ],
      });

      expect(result.importedCount).toBe(1);
      expect(result.skippedCount).toBe(1);
      expect(result.totalProcessed).toBe(2);
      expect(result.newAccountBalanceCents).toBe(46500);

      expect(
        mockTransactionRepository.createManyWithBalance,
      ).toHaveBeenCalledTimes(1);
      const passedRows =
        mockTransactionRepository.createManyWithBalance.mock.calls[0][2];
      expect(passedRows).toHaveLength(1);
      expect(passedRows[0].description).toBe("Restaurante El Sol");
      expect(passedRows[0].deduplicationHash).toBe("hash-new-1");
    });

    it("debe anteponer apóstrofe si la descripción contiene inyección de fórmula durante el commit", async () => {
      mockAccountRepository.findById.mockResolvedValue(mockUserAccount);
      mockTransactionRepository.findExistingHashes.mockResolvedValue([]);
      mockTransactionRepository.createManyWithBalance.mockResolvedValue({
        count: 1,
        newAccountBalanceCents: BigInt(49000),
      });

      await importsService.commitImport("user-owner-id", {
        accountId: "acc-123",
        rows: [
          {
            date: "2026-09-10T00:00:00Z",
            description: "@SUM(A1:A10)",
            amountCents: -1000,
            deduplicationHash: "hash-formula-1",
          },
        ],
      });

      const passedRows =
        mockTransactionRepository.createManyWithBalance.mock.calls[0][2];
      expect(passedRows[0].description).toBe("'@SUM(A1:A10)");
    });
  });

  describe("Templates Management", () => {
    it("debe listar plantillas guardadas por el usuario", async () => {
      const mockTemplate = new CsvTemplateEntity(
        "tpl-1",
        "user-owner-id",
        "BBVA",
        {
          dateCol: "Fecha",
          descCol: "Concepto",
          amountCol: "Importe",
          delimiter: ";",
        },
        new Date(),
        new Date(),
      );
      mockCsvTemplateRepository.findAllByUserId.mockResolvedValue([
        mockTemplate,
      ]);

      const result = await importsService.getTemplates("user-owner-id");
      expect(result).toHaveLength(1);
      expect(result[0].bankName).toBe("BBVA");
    });

    it("debe guardar o actualizar una plantilla bancaria", async () => {
      const mockTemplate = new CsvTemplateEntity(
        "tpl-1",
        "user-owner-id",
        "Santander",
        {
          dateCol: "FECHA OPERACIÓN",
          descCol: "CONCEPTO",
          amountCol: "IMPORTE EUR",
        },
        new Date(),
        new Date(),
      );
      mockCsvTemplateRepository.upsertTemplate.mockResolvedValue(mockTemplate);

      const result = await importsService.saveTemplate("user-owner-id", {
        bankName: "Santander",
        columnMapping: {
          dateCol: "FECHA OPERACIÓN",
          descCol: "CONCEPTO",
          amountCol: "IMPORTE EUR",
        },
      });

      expect(result.bankName).toBe("Santander");
    });

    it("debe eliminar una plantilla por ID", async () => {
      mockCsvTemplateRepository.deleteById.mockResolvedValue(true);

      const result = await importsService.deleteTemplate(
        "user-owner-id",
        "tpl-1",
      );
      expect(result).toBe(true);
    });
  });
});
