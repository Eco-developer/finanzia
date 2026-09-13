import { Currency } from './currency.value-object';
import { InvalidMonetaryAmountException } from '../exceptions/invalid-monetary-amount.exception';

/**
 * Value Object inmutable para representar importes monetarios en FinanZIA.
 * Regla Innegociable: Todos los importes se almacenan y calculan internamente
 * como enteros en CÉNTIMOS (minor units). Queda prohibido el uso de flotantes.
 */
export class Money {
  public readonly amountInCents: bigint;
  public readonly currency: Currency;

  private constructor(amountInCents: bigint, currency: Currency) {
    this.amountInCents = amountInCents;
    this.currency = currency;
  }

  /**
   * Crea una instancia de Money a partir de céntimos enteros.
   * @param cents Entero que representa los céntimos (ej. 1550 para 15,50 €)
   */
  public static fromCents(cents: number | bigint, currency: Currency = Currency.EUR()): Money {
    if (typeof cents === 'number') {
      if (!Number.isFinite(cents) || !Number.isInteger(cents)) {
        throw new InvalidMonetaryAmountException(
          `Los céntimos deben ser un número entero finito sin decimales. Recibido: ${cents}`
        );
      }
      return new Money(BigInt(cents), currency);
    }
    return new Money(cents, currency);
  }

  /**
   * Crea una instancia de Money a partir de una cadena decimal en euros (ej. "15.50" o "-3.25").
   * Convierte de forma determinista sin pérdida de precisión de punto flotante.
   */
  public static fromDecimalString(decimalStr: string, currency: Currency = Currency.EUR()): Money {
    const cleaned = decimalStr.trim().replace(',', '.');
    const regex = /^-?\d+(\.\d{1,2})?$/;
    if (!regex.test(cleaned)) {
      throw new InvalidMonetaryAmountException(
        `Formato decimal inválido para importe monetario: "${decimalStr}". Debe ser ej. "15.50" o "15"`
      );
    }

    const isNegative = cleaned.startsWith('-');
    const unsignedStr = isNegative ? cleaned.slice(1) : cleaned;
    const parts = unsignedStr.split('.');
    const integerPart = BigInt(parts[0]);
    const fractionPart = parts[1] ? parts[1].padEnd(2, '0').slice(0, 2) : '00';
    const totalCents = integerPart * 100n + BigInt(fractionPart);

    return new Money(isNegative ? -totalCents : totalCents, currency);
  }

  public static zero(currency: Currency = Currency.EUR()): Money {
    return new Money(0n, currency);
  }

  public add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this.amountInCents + other.amountInCents, this.currency);
  }

  public subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this.amountInCents - other.amountInCents, this.currency);
  }

  public isPositive(): boolean {
    return this.amountInCents > 0n;
  }

  public isNegative(): boolean {
    return this.amountInCents < 0n;
  }

  public isZero(): boolean {
    return this.amountInCents === 0n;
  }

  public toCentsNumber(): number {
    if (this.amountInCents > BigInt(Number.MAX_SAFE_INTEGER) || this.amountInCents < BigInt(Number.MIN_SAFE_INTEGER)) {
      throw new InvalidMonetaryAmountException('El importe supera el rango entero seguro para conversión a Number');
    }
    return Number(this.amountInCents);
  }

  /**
   * Representación decimal formateada para presentación (ej. "15.50").
   */
  public toDecimalString(): string {
    const isNegative = this.amountInCents < 0n;
    const absCents = isNegative ? -this.amountInCents : this.amountInCents;
    const integerPart = absCents / 100n;
    const remainder = absCents % 100n;
    const fractionPart = remainder.toString().padStart(2, '0');
    return `${isNegative ? '-' : ''}${integerPart}.${fractionPart}`;
  }

  private ensureSameCurrency(other: Money): void {
    if (!this.currency.equals(other.currency)) {
      throw new InvalidMonetaryAmountException(
        `No se pueden operar monedas distintas: ${this.currency.code} y ${other.currency.code}`
      );
    }
  }
}
