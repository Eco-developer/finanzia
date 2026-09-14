import { describe, it, expect } from 'vitest';
import { CsvParserService } from '../../src/core/domain/services/csv-parser.service';

describe('CsvParserService (Unit Tests)', () => {
  describe('detectDelimiter', () => {
    it('debe detectar correctamente delimitadores de punto y coma (;)', () => {
      const csv = 'Fecha;Concepto;Importe\n10/09/2026;Mercadona;-45,20';
      expect(CsvParserService.detectDelimiter(csv)).toBe(';');
    });

    it('debe detectar correctamente delimitadores de coma (,)', () => {
      const csv = 'Date,Description,Amount\n2026-09-10,Netflix,-17.99';
      expect(CsvParserService.detectDelimiter(csv)).toBe(',');
    });

    it('debe detectar correctamente tabuladores si es TSV', () => {
      const tsv = 'Fecha\tConcepto\tImporte\n10/09/2026\tSueldo\t2500';
      expect(CsvParserService.detectDelimiter(tsv)).toBe('\t');
    });
  });

  describe('parse', () => {
    it('debe separar filas y respetar campos entrecomillados con delimitadores internos', () => {
      const csv =
        'Fecha;Concepto;Importe\n' +
        '10/09/2026;"Restaurante, Terraza y Tapas";-35,50\n' +
        '09/09/2026;"Compra con ""comillas""";-12,00';

      const result = CsvParserService.parse(csv, ';');
      expect(result.headers).toEqual(['Fecha', 'Concepto', 'Importe']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0][1]).toBe('Restaurante, Terraza y Tapas');
      expect(result.rows[1][1]).toBe('Compra con "comillas"');
    });
  });

  describe('sanitizeFormula (CSV Formula Injection Protection)', () => {
    it('debe anteponer un apóstrofe a cadenas que comiencen con =', () => {
      expect(CsvParserService.sanitizeFormula("=cmd|' /C calc'!A0")).toBe(
        "'=cmd|' /C calc'!A0",
      );
    });

    it('debe anteponer un apóstrofe a cadenas que comiencen con @', () => {
      expect(CsvParserService.sanitizeFormula('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");
    });

    it('debe anteponer un apóstrofe a cadenas que comiencen con + o -', () => {
      expect(CsvParserService.sanitizeFormula('+malicious()')).toBe("'+malicious()");
      expect(CsvParserService.sanitizeFormula('-calc')).toBe("'-calc");
    });

    it('no debe alterar conceptos legítimos normales', () => {
      expect(CsvParserService.sanitizeFormula('Mercadona Supermercados')).toBe(
        'Mercadona Supermercados',
      );
    });
  });

  describe('parseAmountCents', () => {
    it('debe convertir importes con coma decimal y formato español a céntimos enteros', () => {
      expect(CsvParserService.parseAmountCents('1.250,50 €')).toBe(125050);
      expect(CsvParserService.parseAmountCents('-45,20 €')).toBe(-4520);
      expect(CsvParserService.parseAmountCents('0,99')).toBe(99);
      expect(CsvParserService.parseAmountCents('-1200,00')).toBe(-120000);
    });

    it('debe convertir importes con punto decimal a céntimos enteros', () => {
      expect(CsvParserService.parseAmountCents('1250.50')).toBe(125050);
      expect(CsvParserService.parseAmountCents('-17.99')).toBe(-1799);
    });

    it('debe manejar importes enteros simples', () => {
      expect(CsvParserService.parseAmountCents('2500')).toBe(250000);
      expect(CsvParserService.parseAmountCents('-50')).toBe(-5000);
    });
  });

  describe('parseDate', () => {
    it('debe parsear fechas en formato DD/MM/YYYY o DD-MM-YYYY', () => {
      const date = CsvParserService.parseDate('10/09/2026');
      expect(date).not.toBeNull();
      expect(date?.getUTCFullYear()).toBe(2026);
      expect(date?.getUTCMonth()).toBe(8); // 8 = Septiembre
      expect(date?.getUTCDate()).toBe(10);
    });

    it('debe parsear fechas en formato ISO YYYY-MM-DD', () => {
      const date = CsvParserService.parseDate('2026-09-10');
      expect(date).not.toBeNull();
      expect(date?.getUTCFullYear()).toBe(2026);
      expect(date?.getUTCMonth()).toBe(8);
      expect(date?.getUTCDate()).toBe(10);
    });
  });

  describe('calculateRowHash', () => {
    it('debe generar un hash SHA-256 consistente de 64 caracteres', async () => {
      const hash1 = await CsvParserService.calculateRowHash(
        '10/09/2026',
        -4520,
        'MERCADONA S.A.',
      );
      const hash2 = await CsvParserService.calculateRowHash(
        '10/09/2026',
        -4520,
        'MERCADONA S.A.',
      );
      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
    });

    it('debe generar hashes distintos ante variaciones de importe o fecha', async () => {
      const hash1 = await CsvParserService.calculateRowHash(
        '10/09/2026',
        -4520,
        'MERCADONA S.A.',
      );
      const hash2 = await CsvParserService.calculateRowHash(
        '10/09/2026',
        -4521,
        'MERCADONA S.A.',
      );
      expect(hash1).not.toBe(hash2);
    });
  });
});
