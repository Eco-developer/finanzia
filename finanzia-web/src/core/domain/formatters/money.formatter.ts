/**
 * Utilidades de formateo monetario para el frontend de FinanZIA.
 * Regla Innegociable: Todos los importes se reciben como ENTEROS en céntimos.
 */

export interface FormatMoneyOptions {
  currency?: string;
  locale?: string;
  showSign?: boolean;
}

/**
 * Convierte un importe en céntimos enteros a una cadena localizada formateada (ej. 1550 -> "15,50 €").
 */
export function formatCentsToCurrency(
  cents: number | bigint,
  options: FormatMoneyOptions = {}
): string {
  const { currency = 'EUR', locale = 'es-ES', showSign = false } = options;
  const numCents = typeof cents === 'bigint' ? Number(cents) : cents;
  const decimalValue = numCents / 100;

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: showSign ? 'always' : 'auto'
  });

  return formatter.format(decimalValue);
}

/**
 * Parsea una cadena de entrada del usuario a céntimos enteros (ej. "15,50" -> 1550).
 */
export function parseInputToCents(input: string): number {
  const cleaned = input.trim().replace(/\s/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) {
    throw new Error(`Entrada numérica no válida: "${input}"`);
  }
  return Math.round(parsed * 100);
}
