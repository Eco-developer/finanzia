export class Currency {
  private static readonly SUPPORTED_CURRENCIES = ["EUR", "USD", "GBP"] as const;
  public readonly code: string;

  private constructor(code: string) {
    const normalized = code.toUpperCase().trim();
    if (!Currency.SUPPORTED_CURRENCIES.includes(normalized as any)) {
      throw new Error(
        `Moneda no soportada: ${code}. Monedas válidas: ${Currency.SUPPORTED_CURRENCIES.join(", ")}`,
      );
    }
    this.code = normalized;
  }

  public static of(code: string): Currency {
    return new Currency(code);
  }

  public static EUR(): Currency {
    return new Currency("EUR");
  }

  public equals(other: Currency): boolean {
    return this.code === other.code;
  }
}
