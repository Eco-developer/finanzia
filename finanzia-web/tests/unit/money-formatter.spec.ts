import { describe, it, expect } from 'vitest';
import { formatCentsToCurrency, parseInputToCents } from '../../src/core/domain/formatters/money.formatter';

describe('Frontend Money Formatter (formatCentsToCurrency)', () => {
  it('debe formatear céntimos positivos en formato español', () => {
    const formatted = formatCentsToCurrency(245050); // 2.450,50 €
    // Normalizar espacios no separables de Intl
    const normalized = formatted.replace(/\u00a0/g, ' ');
    expect(normalized).toContain('2.450,50');
    expect(normalized).toContain('€');
  });

  it('debe formatear céntimos negativos correctamente', () => {
    const formatted = formatCentsToCurrency(-8990); // -89,90 €
    const normalized = formatted.replace(/\u00a0/g, ' ');
    expect(normalized).toContain('-89,90');
  });

  it('debe soportar BigInt como argumento de entrada', () => {
    const formatted = formatCentsToCurrency(100000n);
    const normalized = formatted.replace(/\u00a0/g, ' ');
    expect(normalized).toContain('1.000,00');
  });
});

describe('Frontend Money Parser (parseInputToCents)', () => {
  it('debe parsear cadenas con coma decimal a céntimos enteros exactos', () => {
    expect(parseInputToCents('15,50')).toBe(1550);
    expect(parseInputToCents('0,99')).toBe(99);
    expect(parseInputToCents('100')).toBe(10000);
  });

  it('debe parsear cadenas con punto decimal', () => {
    expect(parseInputToCents('45.90')).toBe(4590);
  });

  it('debe rechazar entradas no numéricas', () => {
    expect(() => parseInputToCents('invalido')).toThrow();
  });
});
