/**
 * FinanZIA — Servicio de Dominio para Parseo y Normalización de CSV Bancario
 * - Detección de delimitador (',' o ';')
 * - Soporte para campos con comillas y saltos de línea
 * - Neutralización de CSV Formula Injection (=, +, -, @, \t, \r)
 * - Parseo de fechas y cantidades monetarias en céntimos enteros (cero float)
 * - Cálculo determinista de Hash SHA-256 para deduplicación
 */

export interface ParsedCsvResult {
  delimiter: string;
  headers: string[];
  rows: string[][];
  totalRows: number;
}

export interface NormalizedImportRow {
  rowId: string;
  date: string; // ISO 8601 string
  description: string;
  amountCents: number; // En céntimos: Positivo para ingreso, Negativo para gasto
  hash: string; // SHA-256
}

export class CsvParserService {
  /**
   * Detecta automáticamente si el archivo está delimitado por coma (',') o punto y coma (';')
   */
  static detectDelimiter(content: string): "," | ";" | "\t" {
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const sample = lines.slice(0, 5).join("\n");

    const semicolons = (sample.match(/;/g) || []).length;
    const commas = (sample.match(/,/g) || []).length;
    const tabs = (sample.match(/\t/g) || []).length;

    if (tabs > semicolons && tabs > commas) return "\t";
    if (semicolons >= commas) return ";";
    return ",";
  }

  /**
   * Parsea el contenido CSV considerando campos entre comillas con posibles delimitadores internos
   */
  static parse(csvText: string, customDelimiter?: string): ParsedCsvResult {
    const delimiter = customDelimiter || this.detectDelimiter(csvText);
    const lines = this.splitCsvLines(csvText, delimiter);

    if (lines.length === 0) {
      return { delimiter, headers: [], rows: [], totalRows: 0 };
    }

    const rawHeaders = lines[0].map((h) => h.trim());
    const dataRows = lines
      .slice(1)
      .filter((row) => row.some((col) => col.trim().length > 0));

    return {
      delimiter,
      headers: rawHeaders,
      rows: dataRows,
      totalRows: dataRows.length,
    };
  }

  /**
   * Divide el texto CSV en matriz de celdas respetando comillas dobles
   */
  private static splitCsvLines(text: string, delimiter: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Escaped quote ("")
          currentCell += '"';
          i++;
        } else {
          // Toggle quotes
          insideQuotes = !insideQuotes;
        }
      } else if (char === delimiter && !insideQuotes) {
        currentRow.push(currentCell);
        currentCell = "";
      } else if ((char === "\r" || char === "\n") && !insideQuotes) {
        if (char === "\r" && nextChar === "\n") {
          i++; // Skip \n
        }
        currentRow.push(currentCell);
        currentCell = "";
        if (currentRow.some((c) => c.trim().length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentCell += char;
      }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell);
      if (currentRow.some((c) => c.trim().length > 0)) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  /**
   * Neutraliza intentos de inyección de fórmulas CSV (CSV Formula Injection)
   * Si el primer carácter es '=', '+', '-', '@', '\t' o '\r', antepone un apóstrofe
   */
  static sanitizeFormula(value: string): string {
    if (!value) return value;
    const trimmed = value.trim();
    const dangerousChars = ["=", "+", "-", "@", "\t", "\r"];

    if (dangerousChars.some((char) => trimmed.startsWith(char))) {
      return `'${trimmed}`;
    }

    return trimmed;
  }

  /**
   * Parsea importes bancarios (soportando formatos españoles e internacionales)
   * Formato español: "1.250,50 €", "-1250,50", "45,00"
   * Formato estándar: "1250.50", "-45.00"
   * Devuelve siempre céntimos enteros (cero float)
   */
  static parseAmountCents(amountStr: string): number {
    if (!amountStr || typeof amountStr !== "string") return 0;

    let clean = amountStr
      .replace(/[^\d.,+-]/g, "") // Mantener solo dígitos, comas, puntos y signos
      .trim();

    if (!clean) return 0;

    const isNegative = clean.includes("-");
    clean = clean.replace(/[+-]/g, "");

    let cents = 0;

    // Caso 1: Formato con coma como decimal (ej. 1.250,50 o 1250,50 o 45,00)
    if (clean.includes(",")) {
      // Eliminar puntos de millar
      const parts = clean.split(",");
      const integerPart = parts[0].replace(/\./g, "");
      let decimalPart = parts[1] || "";
      decimalPart = (decimalPart + "00").slice(0, 2); // Tomar exactamente 2 decimales

      const euros = parseInt(integerPart || "0", 10);
      const dec = parseInt(decimalPart, 10);
      cents = euros * 100 + dec;
    }
    // Caso 2: Formato con punto como decimal (ej. 1250.50)
    else if (clean.includes(".")) {
      const parts = clean.split(".");
      if (parts.length === 2 && parts[1].length <= 2) {
        // Decimal con punto
        const integerPart = parts[0];
        let decimalPart = parts[1];
        decimalPart = (decimalPart + "00").slice(0, 2);
        const euros = parseInt(integerPart || "0", 10);
        const dec = parseInt(decimalPart, 10);
        cents = euros * 100 + dec;
      } else {
        // Múltiples puntos o punto de millar sin decimales (ej. 1.250)
        const combined = clean.replace(/\./g, "");
        cents = parseInt(combined || "0", 10) * 100;
      }
    }
    // Caso 3: Solo enteros sin coma ni punto
    else {
      cents = parseInt(clean || "0", 10) * 100;
    }

    if (isNaN(cents)) return 0;
    return isNegative ? -cents : cents;
  }

  /**
   * Parsea cadenas de fecha comunes en extractos bancarios:
   * DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, YYYY/MM/DD
   */
  static parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const clean = dateStr.trim();

    // 1. Formato DD/MM/YYYY o DD-MM-YYYY
    const ddmmyyyy = clean.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1;
      const year = parseInt(ddmmyyyy[3], 10);
      const date = new Date(Date.UTC(year, month, day));
      return isNaN(date.getTime()) ? null : date;
    }

    // 2. Formato YYYY-MM-DD o YYYY/MM/DD
    const yyyymmdd = clean.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})$/);
    if (yyyymmdd) {
      const year = parseInt(yyyymmdd[1], 10);
      const month = parseInt(yyyymmdd[2], 10) - 1;
      const day = parseInt(yyyymmdd[3], 10);
      const date = new Date(Date.UTC(year, month, day));
      return isNaN(date.getTime()) ? null : date;
    }

    // 3. Fallback a Date.parse nativo
    const fallback = new Date(clean);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  /**
   * Calcula el Hash SHA-256 unívoco de la fila para deduplicación
   * Entrada canónica: `sha256(fecha_ISO_dia + "_" + amountCents + "_" + concepto_limpio_lowercase)`
   */
  static async calculateRowHash(
    dateStr: string,
    amountCents: number,
    description: string,
  ): Promise<string> {
    const parsedDate = this.parseDate(dateStr);
    const dayIso = parsedDate
      ? parsedDate.toISOString().split("T")[0]
      : dateStr.trim();
    const cleanDesc = description.trim().toLowerCase();
    const payload = `${dayIso}_${amountCents}_${cleanDesc}`;

    // Si estamos en entorno Node.js o navegador con Web Crypto API
    if (
      typeof crypto !== "undefined" &&
      crypto.subtle &&
      typeof TextEncoder !== "undefined"
    ) {
      const msgBuffer = new TextEncoder().encode(payload);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }

    // Fallback simple para entornos sin crypto.subtle (ej. SSR básico)
    return this.simpleHashFallback(payload);
  }

  private static simpleHashFallback(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, "0");
  }
}
