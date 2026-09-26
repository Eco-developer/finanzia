import { Injectable, Inject } from "@nestjs/common";
import { TransactionType } from "../../domain/types/financial.types";
import {
  IAccountRepository,
  ACCOUNT_REPOSITORY,
} from "../../domain/repositories/account.repository.interface";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from "../../domain/repositories/transaction.repository.interface";
import {
  ICategoryRepository,
  CATEGORY_REPOSITORY,
} from "../../domain/repositories/category.repository.interface";
import {
  ICsvTemplateRepository,
  CSV_TEMPLATE_REPOSITORY,
} from "../../domain/repositories/csv-template.repository.interface";
import { AccountNotFoundException } from "../../domain/exceptions/account-not-found.exception";
import { UnauthorizedAccountAccessException } from "../../domain/exceptions/unauthorized-account-access.exception";
import { sanitizeCsvField } from "../../domain/utils/csv-sanitizer.util";
import {
  PreviewImportDto,
  ImportRowDto,
} from "../../../presentation/dtos/imports/preview-import.dto";
import { CommitImportDto } from "../../../presentation/dtos/imports/commit-import.dto";
import {
  PreviewImportResponseDto,
  RowPreviewDto,
  CommitImportResponseDto,
} from "../../../presentation/dtos/imports/import-response.dto";
import { SaveCsvTemplateDto } from "../../../presentation/dtos/imports/save-csv-template.dto";
import { CsvTemplateResponseDto } from "../../../presentation/dtos/imports/csv-template-response.dto";
import { CreateTransactionData } from "../../domain/repositories/transaction.repository.interface";

interface KeywordCategoryRule {
  keywords: string[];
  categoryNameMatch: string[];
}

const CATEGORY_RULES: KeywordCategoryRule[] = [
  {
    keywords: [
      "mercadona",
      "carrefour",
      "lidl",
      "dia",
      "alcampo",
      "eroski",
      "supermercado",
      "consum",
      "hipercor",
      "aldi",
      "bonpreu",
    ],
    categoryNameMatch: ["alimentaci", "supermercado"],
  },
  {
    keywords: [
      "restaurante",
      "bar ",
      "cafeteria",
      "mcdonald",
      "burger",
      "uber eats",
      "glovo",
      "just eat",
      "kfc",
      "starbucks",
      "pizzeria",
      "tapas",
      "cerveceria",
    ],
    categoryNameMatch: ["restaurante", "ocio", "alimentaci"],
  },
  {
    keywords: [
      "gasolinera",
      "repsol",
      "cepsa",
      "bp ",
      "galp",
      "shell",
      "estacion de servicio",
      "combustible",
      "uber",
      "cabify",
      "taxi",
      "metro",
      "renfe",
      "parking",
      "peaje",
      "autovia",
    ],
    categoryNameMatch: ["transporte", "gasolina"],
  },
  {
    keywords: [
      "alquiler",
      "hipoteca",
      "comunidad",
      "iberdrola",
      "endesa",
      "naturgy",
      "totalenergies",
      "vodafone",
      "movistar",
      "orange",
      "digi",
      "yoigo",
      "canal de isabel",
      "aguas",
      "suministro",
    ],
    categoryNameMatch: ["vivienda", "suministros"],
  },
  {
    keywords: [
      "nomina",
      "salario",
      "paga extra",
      "transferencia a su favor",
      "abono de haberes",
      "retribucion",
    ],
    categoryNameMatch: ["nomina", "trabajo", "salario"],
  },
  {
    keywords: [
      "farmacia",
      "optica",
      "clinica",
      "hospital",
      "dentista",
      "gimnasio",
      "gym",
      "sanitas",
      "adeslas",
      "asisa",
    ],
    categoryNameMatch: ["salud", "bienestar"],
  },
  {
    keywords: [
      "netflix",
      "spotify",
      "hbo",
      "amazon prime",
      "disney",
      "cine",
      "teatro",
      "concierto",
      "steam",
      "playstation",
      "nintendo",
    ],
    categoryNameMatch: ["ocio", "suscripciones"],
  },
  {
    keywords: [
      "comision",
      "mantenimiento cuenta",
      "cuota tarjeta",
      "impuesto",
      "tasa",
      "hacienda",
      "aeat",
    ],
    categoryNameMatch: ["finanzas", "comisiones"],
  },
];

@Injectable()
export class ImportsService {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: ITransactionRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(CSV_TEMPLATE_REPOSITORY)
    private readonly csvTemplateRepository: ICsvTemplateRepository,
  ) {}

  async previewImport(
    userId: string,
    dto: PreviewImportDto,
  ): Promise<PreviewImportResponseDto> {
    // 1. Validar que la cuenta pertenezca al usuario
    const account = await this.accountRepository.findById(dto.accountId);
    if (!account) {
      throw new AccountNotFoundException(dto.accountId);
    }
    if (account.userId !== userId) {
      throw new UnauthorizedAccountAccessException(dto.accountId);
    }

    // 2. Extraer los hashes y consultar duplicados en la base de datos
    const rowHashes = dto.rows
      .map((r) => r.hash)
      .filter((h): h is string => Boolean(h));

    const existingHashes = await this.transactionRepository.findExistingHashes(
      userId,
      dto.accountId,
      rowHashes,
    );
    const existingHashSet = new Set<string>(existingHashes);

    // 3. Obtener categorías del usuario para sugerir categorización automática
    const categories = await this.categoryRepository.findAllForUser(userId);

    let duplicateCount = 0;
    let newCount = 0;

    // 4. Analizar cada fila
    const preview: RowPreviewDto[] = dto.rows.map((row: ImportRowDto) => {
      // Neutralizar fórmula en la descripción (ej. =cmd|...)
      const sanitizedDesc = sanitizeCsvField(row.description);
      const isDuplicate = existingHashSet.has(row.hash);

      if (isDuplicate) {
        duplicateCount++;
      } else {
        newCount++;
      }

      // Sugerir categoría
      const suggestion = this.matchCategory(sanitizedDesc, categories);

      return {
        rowId: row.rowId,
        isDuplicate,
        suggestedCategoryId: suggestion ? suggestion.id : null,
        suggestedCategoryName: suggestion ? suggestion.name : null,
      };
    });

    return {
      totalRows: dto.rows.length,
      newCount,
      duplicateCount,
      preview,
    };
  }

  async commitImport(
    userId: string,
    dto: CommitImportDto,
  ): Promise<CommitImportResponseDto> {
    // 1. Validar que la cuenta pertenezca al usuario
    const account = await this.accountRepository.findById(dto.accountId);
    if (!account) {
      throw new AccountNotFoundException(dto.accountId);
    }
    if (account.userId !== userId) {
      throw new UnauthorizedAccountAccessException(dto.accountId);
    }

    if (!dto.rows || dto.rows.length === 0) {
      return {
        importedCount: 0,
        skippedCount: 0,
        totalProcessed: 0,
        newAccountBalanceCents: Number(account.currentBalanceCents),
      };
    }

    // 2. Filtrar hashes duplicados existentes en DB para no colisionar
    const incomingHashes = dto.rows
      .map((r) => r.deduplicationHash)
      .filter((h): h is string => Boolean(h));

    const existingHashes = await this.transactionRepository.findExistingHashes(
      userId,
      dto.accountId,
      incomingHashes,
    );
    const existingHashSet = new Set<string>(existingHashes);

    // Mantener un set local para evitar duplicados repetidos dentro del mismo lote entrante
    const seenBatchHashes = new Set<string>();

    const rowsByAccount = new Map<string, CreateTransactionData[]>();
    let skippedCount = 0;

    for (const row of dto.rows) {
      const targetAccountId = row.accountId || dto.accountId;

      if (row.deduplicationHash) {
        if (
          existingHashSet.has(row.deduplicationHash) ||
          seenBatchHashes.has(row.deduplicationHash)
        ) {
          skippedCount++;
          continue;
        }
        seenBatchHashes.add(row.deduplicationHash);
      }

      const amountCentsBigInt = BigInt(row.amountCents);
      const isExpense = amountCentsBigInt < 0n;

      const txData: CreateTransactionData = {
        userId,
        accountId: targetAccountId,
        categoryId: row.categoryId ?? null,
        amountCents: amountCentsBigInt,
        type: isExpense ? TransactionType.EXPENSE : TransactionType.INCOME,
        transactionDate: new Date(row.date),
        description: sanitizeCsvField(row.description),
        deduplicationHash: row.deduplicationHash ?? null,
      };

      const list = rowsByAccount.get(targetAccountId) || [];
      list.push(txData);
      rowsByAccount.set(targetAccountId, list);
    }

    // 3. Inserción atómica en bloque por cuenta
    let importedCount = 0;
    let finalMainAccountBalanceCents = Number(account.currentBalanceCents);

    for (const [accId, txs] of rowsByAccount.entries()) {
      const result = await this.transactionRepository.createManyWithBalance(
        userId,
        accId,
        txs,
      );
      importedCount += result.count;
      if (accId === dto.accountId) {
        finalMainAccountBalanceCents = Number(result.newAccountBalanceCents);
      }
    }

    return {
      importedCount,
      skippedCount,
      totalProcessed: dto.rows.length,
      newAccountBalanceCents: finalMainAccountBalanceCents,
    };
  }

  async getTemplates(userId: string): Promise<CsvTemplateResponseDto[]> {
    const templates = await this.csvTemplateRepository.findAllByUserId(userId);
    return templates.map((t) => ({
      id: t.id,
      bankName: t.bankName,
      columnMapping: t.columnMapping,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }

  async saveTemplate(
    userId: string,
    dto: SaveCsvTemplateDto,
  ): Promise<CsvTemplateResponseDto> {
    const template = await this.csvTemplateRepository.upsertTemplate(
      userId,
      dto.bankName,
      dto.columnMapping,
    );

    return {
      id: template.id,
      bankName: template.bankName,
      columnMapping: template.columnMapping,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  async deleteTemplate(userId: string, id: string): Promise<boolean> {
    return this.csvTemplateRepository.deleteById(userId, id);
  }

  private matchCategory(
    description: string,
    categories: any[],
  ): { id: string; name: string } | null {
    if (!description || categories.length === 0) {
      return null;
    }

    const lowerDesc = description.toLowerCase();

    // 1. Coincidencia por diccionario de reglas
    for (const rule of CATEGORY_RULES) {
      const keywordHit = rule.keywords.some((kw) => lowerDesc.includes(kw));
      if (keywordHit) {
        const found = categories.find((cat) => {
          const catLower = cat.name.toLowerCase();
          return rule.categoryNameMatch.some((m) => catLower.includes(m));
        });
        if (found) {
          return { id: found.id, name: found.name };
        }
      }
    }

    // 2. Coincidencia directa con el nombre de la categoría
    for (const cat of categories) {
      const catName = cat.name.toLowerCase();
      if (catName.length > 3 && lowerDesc.includes(catName)) {
        return { id: cat.id, name: cat.name };
      }
    }

    return null;
  }
}
