import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DeleteConversationModal } from '@/presentation/components/ai-advisor/DeleteConversationModal';
import type { ConversationItem } from '@/infrastructure/api/advisor.api';

describe('DeleteConversationModal Component', () => {
  const mockConversation: ConversationItem = {
    id: 'conv-test-123',
    title: 'Análisis de Ahorro y Gastos',
    messageCount: 5,
    createdAt: '2026-09-20T10:00:00.000Z',
    updatedAt: '2026-09-26T22:30:00.000Z',
  };

  it('no renderiza nada cuando conversation es null', () => {
    const { container } = render(
      <DeleteConversationModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        conversation={null}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('muestra el título, advertencia de irreversibilidad, título de la conversación y número de mensajes', () => {
    render(
      <DeleteConversationModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        conversation={mockConversation}
      />,
    );

    // Título y advertencia
    expect(screen.getByText('¿Eliminar conversación?')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Esta acción eliminará de forma permanente el historial completo de esta conversación/i,
      ),
    ).toBeInTheDocument();

    // Título de conversación
    expect(screen.getByText('Análisis de Ahorro y Gastos')).toBeInTheDocument();

    // Contador de mensajes con Badge
    expect(screen.getByText(/5 mensajes/i)).toBeInTheDocument();
  });

  it('muestra "1 mensaje" en singular si messageCount es 1', () => {
    const singleMsgConv: ConversationItem = {
      ...mockConversation,
      messageCount: 1,
    };

    render(
      <DeleteConversationModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        conversation={singleMsgConv}
      />,
    );

    expect(screen.getByText(/1 mensaje\b/i)).toBeInTheDocument();
  });

  it('ejecuta onConfirm al hacer clic en el botón de eliminar conversación', async () => {
    const onConfirmMock = vi.fn().mockResolvedValue(undefined);
    const onCloseMock = vi.fn();

    render(
      <DeleteConversationModal
        isOpen={true}
        onClose={onCloseMock}
        onConfirm={onConfirmMock}
        conversation={mockConversation}
      />,
    );

    const deleteBtn = screen.getByRole('button', { name: /Eliminar conversación/i });
    await act(async () => {
      fireEvent.click(deleteBtn);
    });

    expect(onConfirmMock).toHaveBeenCalledTimes(1);
  });

  it('ejecuta onClose al pulsar cancelar', () => {
    const onCloseMock = vi.fn();
    render(
      <DeleteConversationModal
        isOpen={true}
        onClose={onCloseMock}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        conversation={mockConversation}
      />,
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
