import { Injectable, Logger, Inject } from "@nestjs/common";
import {
  IFinancialAnalyticsPort,
  FINANCIAL_ANALYTICS_PORT,
} from "../ports/financial-analytics.port";
import { CategorizationResult } from "./ai-tools.service";

interface BuiltinKeywordRule {
  keywords: string[];
  categoryName: string;
  categoryType: "FIXED" | "VARIABLE";
}

const BUILTIN_RULES: BuiltinKeywordRule[] = [
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
      "aldi",
      "bonpreu",
    ],
    categoryName: "Supermercado",
    categoryType: "VARIABLE",
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
    ],
    categoryName: "Restaurantes",
    categoryType: "VARIABLE",
  },
  {
    keywords: [
      "gasolinera",
      "repsol",
      "cepsa",
      "bp ",
      "galp",
      "shell",
      "combustible",
      "uber",
      "cabify",
      "taxi",
      "metro",
      "renfe",
      "parking",
      "peaje",
    ],
    categoryName: "Transporte",
    categoryType: "VARIABLE",
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
      "aguas",
      "suministro",
    ],
    categoryName: "Vivienda y Suministros",
    categoryType: "FIXED",
  },
  {
    keywords: [
      "netflix",
      "spotify",
      "hbo",
      "disney",
      "amazon prime",
      "cine",
      "teatro",
      "concierto",
      "steam",
      "playstation",
    ],
    categoryName: "Ocio y Suscripciones",
    categoryType: "VARIABLE",
  },
  {
    keywords: [
      "farmacia",
      "clinica",
      "hospital",
      "dental",
      "medico",
      "optica",
      "seguro salud",
    ],
    categoryName: "Salud y Bienestar",
    categoryType: "FIXED",
  },
  {
    keywords: [
      "zara",
      "mango",
      "h&m",
      "pull&bear",
      "bershka",
      "decathlon",
      "nike",
      "adidas",
      "corte ingles",
      "amazon",
    ],
    categoryName: "Compras y Ropa",
    categoryType: "VARIABLE",
  },
  {
    keywords: [
      "nomina",
      "salario",
      "transferencia recibida",
      "ingreso",
      "pension",
    ],
    categoryName: "Nómina e Ingresos",
    categoryType: "FIXED",
  },
];

@Injectable()
export class TransactionLearningService {
  private readonly logger = new Logger(TransactionLearningService.name);

  constructor(
    @Inject(FINANCIAL_ANALYTICS_PORT)
    private readonly analytics: IFinancialAnalyticsPort,
  ) {}

  /**
   * Normaliza una cadena de texto para comparación de patrones (mayúsculas, sin tildes ni caracteres extraños)
   */
  normalizePattern(input: string): string {
    return input
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9\s]/g, " ")
      .replace(/\s+/g, " ");
  }

  /**
   * Clasifica una transacción con arquitectura híbrida en 3 capas:
   * 1. Reglas aprendidas del usuario (Feedback Loop).
   * 2. Diccionario de patrones deterministas de alta frecuencia.
   * 3. Fallback heurístico.
   */
  async categorizeTransaction(
    userId: string,
    description: string,
  ): Promise<CategorizationResult> {
    const normalized = this.normalizePattern(description);
    this.logger.log(
      `[Categorizer] Clasificando concepto: "${description}" (norm: "${normalized}")`,
    );

    // Capa 1: Reglas aprendidas del usuario
    const tokens = normalized.split(" ").filter((t) => t.length >= 3);
    for (const token of tokens) {
      const learned = await this.analytics.findUserCategoryRule(userId, token);
      if (learned) {
        this.logger.log(
          `[Categorizer] Regla aprendida encontrada para token "${token}": ${learned.categoryName}`,
        );
        return {
          suggestedCategoryId: learned.categoryId,
          suggestedCategoryName: learned.categoryName,
          source: "LEARNED_USER_RULE",
          confidence: 0.98,
        };
      }
    }

    // Capa 2: Diccionario determinista incorporado
    const descLower = description.toLowerCase();
    for (const rule of BUILTIN_RULES) {
      for (const kw of rule.keywords) {
        if (descLower.includes(kw)) {
          return {
            suggestedCategoryId:
              "builtin-" + rule.categoryName.toLowerCase().replace(/\s+/g, "-"),
            suggestedCategoryName: rule.categoryName,
            source: "PATTERN_MATCH",
            confidence: 0.9,
          };
        }
      }
    }

    // Capa 3: Fallback general
    return {
      suggestedCategoryId: "uncategorized",
      suggestedCategoryName: "Otros Gastos",
      source: "SEMANTIC_FALLBACK",
      confidence: 0.5,
    };
  }

  /**
   * Registra o actualiza una regla aprendida tras la confirmación o corrección del usuario (Feedback Loop)
   */
  async learnRule(
    userId: string,
    rawPattern: string,
    categoryId: string,
  ): Promise<{ pattern: string; categoryId: string }> {
    const pattern = this.normalizePattern(rawPattern);
    this.logger.log(
      `[Learning] Guardando regla aprendida para usuario ${userId}: "${pattern}" -> ${categoryId}`,
    );
    return await this.analytics.saveUserCategoryRule(
      userId,
      pattern,
      categoryId,
    );
  }
}
