import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MoneyDisplay } from '../../src/presentation/components/financial/MoneyDisplay';

describe('MoneyDisplay Component (React Testing Library)', () => {
  it('debe renderizar el importe formateado en el DOM', () => {
    render(<MoneyDisplay cents={1550} currency="EUR" />);
    const el = screen.getByTestId('money-display');
    expect(el).toBeDefined();
    expect(el.textContent?.replace(/\u00a0/g, ' ')).toContain('15,50');
  });

  it('debe incluir el atributo data-cents con el valor numérico exacto', () => {
    render(<MoneyDisplay cents={-4860} />);
    const el = screen.getByTestId('money-display');
    expect(el.getAttribute('data-cents')).toBe('-4860');
  });

  it('debe renderizar cero sin arrojar error', () => {
    render(<MoneyDisplay cents={0} />);
    const el = screen.getByTestId('money-display');
    expect(el.textContent?.replace(/\u00a0/g, ' ')).toContain('0,00');
  });
});
