'use client';

import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  description?: string;
  maxWidth?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMaxWidthMap: Record<'sm' | 'md' | 'lg' | 'xl', string> = {
  sm: '420px',
  md: '520px',
  lg: '680px',
  xl: '840px',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  description,
  maxWidth,
  size = 'md',
}: ModalProps) {
  const effectiveMaxWidth = maxWidth || sizeMaxWidthMap[size] || '520px';

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.overlay} />
        <DialogPrimitive.Content
          className={styles.modal}
          style={{ maxWidth: effectiveMaxWidth }}
          {...(!description ? { 'aria-describedby': undefined } : {})}
        >
          <div className={styles.header}>
            <div>
              <DialogPrimitive.Title className={styles.title}>
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className={styles.description}>
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                className={styles.closeBtn}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </DialogPrimitive.Close>
          </div>

          <div className={styles.body}>{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
