'use client';

import React from 'react';
import { ChatMessage } from '@/infrastructure/api/advisor.api';
import styles from './ChatBubble.module.css';

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'USER';

  return (
    <div className={`${styles.row} ${isUser ? styles.userRow : styles.assistantRow}`}>
      {!isUser && (
        <div className={styles.avatar}>
          <span className={styles.avatarIcon}>✨</span>
        </div>
      )}

      <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.assistantBubble}`}>
        {!isUser && (
          <div className={styles.header}>
            <span className={styles.advisorName}>FinanZIA Advisor</span>
          </div>
        )}

        <div className={styles.content}>
          {message.content.split('\n').map((line, i) => {
            if (!line.trim()) return <div key={i} className={styles.spacer} />;
            // Formatear negritas básicas **texto**
            const parts = line.split(/(\*\*.*?\*\*)/g);
            return (
              <p key={i} className={styles.textLine}>
                {parts.map((p, j) => {
                  if (p.startsWith('**') && p.endsWith('**')) {
                    return <strong key={j}>{p.slice(2, -2)}</strong>;
                  }
                  return p;
                })}
              </p>
            );
          })}
        </div>

        <div className={styles.time}>
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>

      {isUser && (
        <div className={`${styles.avatar} ${styles.userAvatar}`}>
          <span>👤</span>
        </div>
      )}
    </div>
  );
}
