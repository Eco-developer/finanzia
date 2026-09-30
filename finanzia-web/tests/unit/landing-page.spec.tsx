import React from 'react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LandingPage } from '@/presentation/components/landing/LandingPage';

describe('LandingPage Component', () => {
  it('renderiza el título del Hero, badges y botones principales', () => {
    render(<LandingPage />);

    expect(screen.getAllByText(/Finanzas Personales con IA Verificable/i)[0]).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Domina tu dinero/i);
    expect(screen.getAllByRole('link', { name: /Crear Cuenta/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Iniciar Sesión/i })[0]).toBeInTheDocument();
  });

  it('permite alternar entre los tabs del Showroom interactivo', () => {
    render(<LandingPage />);

    // Por defecto está en AI Advisor
    expect(screen.getByText(/FinanZIA AI Copilot/i)).toBeInTheDocument();

    // Cambiar a Panel & Cuentas
    const panelTabBtn = screen.getByRole('button', { name: /Panel & Cuentas/i });
    fireEvent.click(panelTabBtn);
    expect(screen.getByText(/Patrimonio Neto Total/i)).toBeInTheDocument();
    expect(screen.getByText(/Santander Nómina/i)).toBeInTheDocument();

    // Cambiar a Estrategia Deudas
    const debtsTabBtn = screen.getByRole('button', { name: /Estrategia Deudas/i });
    fireEvent.click(debtsTabBtn);
    expect(screen.getByText(/Motor Matemático de Liquidación Acelerada/i)).toBeInTheDocument();
    expect(screen.getByText(/Estrategia Avalancha/i)).toBeInTheDocument();
  });

  it('permite interactuar con la propuesta de acción determinista en el chat de IA', () => {
    render(<LandingPage />);

    // Botón de aprobar acción en la propuesta interactiva
    const approveBtn = screen.getByRole('button', { name: /Aprobar y Ejecutar/i });
    expect(approveBtn).toBeInTheDocument();

    fireEvent.click(approveBtn);

    // Debe mostrar banner de confirmación exitosa
    expect(screen.getByText(/¡Acción confirmada! Operación validada con éxito/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aprobar y Ejecutar/i })).not.toBeInTheDocument();
  });

  it('actualiza el simulador de ahorro al mover los controles de rango', () => {
    render(<LandingPage />);

    // Slider de ahorro mensual
    const monthlySlider = screen.getByLabelText(/Ahorro o amortización mensual/i);
    expect(monthlySlider).toBeInTheDocument();

    // Cambiar valor a 500 €/mes
    fireEvent.change(monthlySlider, { target: { value: '500' } });
    expect(screen.getByText(/500 € \/ mes/i)).toBeInTheDocument();
  });

  it('despliega y colapsa los ítems del FAQ Accordion', () => {
    render(<LandingPage />);

    // El primer FAQ está abierto por defecto
    expect(screen.getByText(/FinanZIA implementa una arquitectura determinista/i)).toBeInTheDocument();

    // Pulsar sobre la segunda pregunta para desplegarla
    const secondFaqBtn = screen.getByRole('button', {
      name: /¿Por qué se calculan todos los saldos en céntimos enteros/i,
    });
    fireEvent.click(secondFaqBtn);

    expect(screen.getByText(/Los números en coma flotante estándar de JavaScript/i)).toBeInTheDocument();
  });
});
