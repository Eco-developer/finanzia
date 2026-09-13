import { Money } from '../../src/core/domain/value-objects/money.value-object';
import { Currency } from '../../src/core/domain/value-objects/currency.value-object';
import { InvalidMonetaryAmountException } from '../../src/core/domain/exceptions/invalid-monetary-amount.exception';

describe('Money Value Object (Zero-Float Financial Math)', () => {
  describe('Creación de importes desde céntimos', () => {
    it('debe crear un importe válido a partir de céntimos enteros', () => {
      const money = Money.fromCents(1550); // 15,50 €
      expect(money.amountInCents).toBe(1550n);
      expect(money.toDecimalString()).toBe('15.50');
    });

    it('debe crear un importe a partir de BigInt directamente', () => {
      const money = Money.fromCents(25000n);
      expect(money.amountInCents).toBe(25000n);
      expect(money.toDecimalString()).toBe('250.00');
    });

    it('debe rechazar números con decimales que intenten pasarse como céntimos (evitar float)', () => {
      expect(() => Money.fromCents(15.55)).toThrow(InvalidMonetaryAmountException);
      expect(() => Money.fromCents(NaN)).toThrow(InvalidMonetaryAmountException);
      expect(() => Money.fromCents(Infinity)).toThrow(InvalidMonetaryAmountException);
    });
  });

  describe('Creación desde cadenas decimales (fromDecimalString)', () => {
    it('debe convertir cadenas con punto y coma sin error de precisión', () => {
      const money1 = Money.fromDecimalString('12.34');
      const money2 = Money.fromDecimalString('12,34');
      expect(money1.amountInCents).toBe(1234n);
      expect(money2.amountInCents).toBe(1234n);
    });

    it('debe manejar importes negativos de gastos', () => {
      const expense = Money.fromDecimalString('-45.90');
      expect(expense.amountInCents).toBe(-4590n);
      expect(expense.isNegative()).toBe(true);
      expect(expense.toDecimalString()).toBe('-45.90');
    });

    it('debe normalizar cantidades enteras sin decimales', () => {
      const money = Money.fromDecimalString('100');
      expect(money.amountInCents).toBe(10000n);
      expect(money.toDecimalString()).toBe('100.00');
    });

    it('debe rechazar formatos no válidos', () => {
      expect(() => Money.fromDecimalString('abc')).toThrow(InvalidMonetaryAmountException);
      expect(() => Money.fromDecimalString('12.345')).toThrow(InvalidMonetaryAmountException); // más de 2 decimales
    });
  });

  describe('Operaciones aritméticas exactas (Sin problemas IEEE 754)', () => {
    it('debe sumar importes con precisión absoluta (ej. 0.10 € + 0.20 € = 0.30 € exactos)', () => {
      const tenCents = Money.fromCents(10);
      const twentyCents = Money.fromCents(20);
      const total = tenCents.add(twentyCents);

      expect(total.amountInCents).toBe(30n);
      expect(total.toDecimalString()).toBe('0.30');
    });

    it('debe restar importes correctamente', () => {
      const initial = Money.fromCents(10000); // 100,00 €
      const expense = Money.fromCents(3550);  // 35,50 €
      const balance = initial.subtract(expense);

      expect(balance.amountInCents).toBe(6450n);
      expect(balance.toDecimalString()).toBe('64.50');
    });

    it('debe impedir sumar importes de diferentes monedas', () => {
      const eur = Money.fromCents(1000, Currency.EUR());
      const usd = Money.fromCents(1000, Currency.of('USD'));

      expect(() => eur.add(usd)).toThrow(InvalidMonetaryAmountException);
    });
  });
});
