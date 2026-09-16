import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../../src/presentation/components/ui/Modal';
import { RadixProgress } from '../../src/presentation/components/ui/RadixProgress';
import { Tooltip } from '../../src/presentation/components/ui/Tooltip';

describe('Radix UI Primitives Integration Tests', () => {
  describe('Modal (Radix Dialog)', () => {
    it('debe renderizar el título y contenido cuando isOpen es true', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Modal de Prueba Radix">
          <p>Contenido accesible del modal</p>
        </Modal>,
      );

      expect(screen.getByText('Modal de Prueba Radix')).toBeDefined();
      expect(screen.getByText('Contenido accesible del modal')).toBeDefined();
    });

    it('no debe renderizar nada cuando isOpen es false', () => {
      render(
        <Modal isOpen={false} onClose={vi.fn()} title="Modal Oculto">
          <p>No visible</p>
        </Modal>,
      );

      expect(screen.queryByText('Modal Oculto')).toBeNull();
      expect(screen.queryByText('No visible')).toBeNull();
    });

    it('debe invocar onClose al hacer click en el botón de cerrar', () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose} title="Cerrar Modal">
          <p>Cuerpo del modal</p>
        </Modal>,
      );

      const closeBtn = screen.getByLabelText('Cerrar modal');
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('RadixProgress', () => {
    it('debe renderizar con el valor y rango adecuado', () => {
      const { container } = render(<RadixProgress value={65} max={100} variant="success" />);
      const progressRoot = container.querySelector('[role="progressbar"]');

      expect(progressRoot).not.toBeNull();
      expect(progressRoot?.getAttribute('aria-valuenow')).toBe('65');
      expect(progressRoot?.getAttribute('aria-valuemax')).toBe('100');
    });
  });

  describe('Tooltip', () => {
    it('debe renderizar el trigger del tooltip', () => {
      render(
        <Tooltip content="Información financiera">
          <button type="button">Pasa el ratón</button>
        </Tooltip>,
      );

      expect(screen.getByText('Pasa el ratón')).toBeDefined();
    });
  });
});
