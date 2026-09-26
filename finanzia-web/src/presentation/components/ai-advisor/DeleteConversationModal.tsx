'use client';

import React, { useState } from 'react';
import { Modal } from '@/presentation/components/ui/Modal';
import { Badge } from '@/presentation/components/ui/Badge';
import { Trash2, AlertTriangle, MessageSquare, Calendar } from 'lucide-react';
import type { ConversationItem } from '@/infrastructure/api/advisor.api';
import styles from './DeleteConversationModal.module.css';

export interface DeleteConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  conversation: ConversationItem | null;
}

export function DeleteConversationModal({
  isOpen,
  onClose,
  onConfirm,
  conversation,
}: DeleteConversationModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!conversation) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const formattedDate = conversation.updatedAt
    ? new Date(conversation.updatedAt).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="¿Eliminar conversación?"
      description="Por favor, confirma la eliminación de la conversación seleccionada con FinanZIA AI."
      size="md"
    >
      <div className={styles.container}>
        <div className={styles.warningBox}>
          <AlertTriangle size={18} className={styles.warningIcon} />
          <span>
            Esta acción eliminará de forma permanente el historial completo de esta
            conversación y sus recomendaciones asociadas. Esta acción no se puede deshacer.
          </span>
        </div>

        <div className={styles.singleCard}>
          <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
            <span className={styles.fieldLabel}>Conversación</span>
            <div className={styles.convTitle}>
              <div className={styles.iconWrap}>
                <MessageSquare size={18} color="#818cf8" />
              </div>
              <span>{conversation.title || 'Conversación'}</span>
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Mensajes registrados</span>
            <div className={styles.fieldValue}>
              <Badge variant="ai" size="sm">
                {conversation.messageCount}{' '}
                {conversation.messageCount === 1 ? 'mensaje' : 'mensajes'}
              </Badge>
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Última actividad</span>
            <span className={styles.fieldValue} style={{ fontSize: '0.85rem' }}>
              {formattedDate ? (
                <>
                  <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                  {formattedDate}
                </>
              ) : (
                'Sin actividad'
              )}
            </span>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            <Trash2 size={16} />
            {isDeleting ? 'Eliminando...' : 'Eliminar conversación'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
