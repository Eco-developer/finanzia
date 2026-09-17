'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/core/application/auth/auth.context';
import { Sidebar } from '@/presentation/components/navigation/Sidebar';
import { MobileTopBar } from '@/presentation/components/navigation/MobileTopBar';
import { MobileBottomNav } from '@/presentation/components/navigation/MobileBottomNav';
import { ChatBubble } from '@/presentation/components/ai-advisor/ChatBubble';
import { RecommendationCard } from '@/presentation/components/ai-advisor/RecommendationCard';
import { QuickPromptChips } from '@/presentation/components/ai-advisor/QuickPromptChips';
import {
  advisorApi,
  ChatMessage,
  ConversationItem,
} from '@/infrastructure/api/advisor.api';
import {
  recommendationsApi,
  RecommendationItem,
} from '@/infrastructure/api/recommendations.api';
import { Send, Plus, Trash2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import styles from './advisor.module.css';

export default function AdvisorPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirección si no está autenticado
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthLoading, isAuthenticated, router]);

  // Cargar lista de conversaciones
  const loadConversations = useCallback(async () => {
    try {
      const convs = await advisorApi.getConversations();
      setConversations(convs);
      if (convs.length > 0 && !activeConversationId) {
        setActiveConversationId(convs[0].id);
      }
    } catch (err) {
      console.error('Error al cargar conversaciones:', err);
    }
  }, [activeConversationId]);

  // Cargar recomendaciones pendientes
  const loadRecommendations = useCallback(async () => {
    try {
      setIsLoadingRecs(true);
      const recs = await recommendationsApi.getPending();
      setRecommendations(recs);
    } catch (err) {
      console.error('Error al cargar recomendaciones:', err);
    } finally {
      setIsLoadingRecs(false);
    }
  }, []);

  // Cargar mensajes de la conversación activa
  const loadMessages = useCallback(async (convId: string) => {
    try {
      setIsLoadingMessages(true);
      const msgs = await advisorApi.getConversationMessages(convId);
      setMessages(msgs);
    } catch (err) {
      console.error('Error al cargar mensajes:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadConversations();
      loadRecommendations();
    }
  }, [isAuthenticated, loadConversations, loadRecommendations]);

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleStartNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setInputText('');
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('¿Deseas eliminar esta conversación?')) return;
    try {
      await advisorApi.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        handleStartNewConversation();
      }
    } catch (err) {
      console.error('Error al eliminar conversación:', err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    setInputText('');
    setIsSending(true);

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversationId: activeConversationId || 'new',
      role: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await advisorApi.sendMessage(text, activeConversationId || undefined);

      const assistantMsg: ChatMessage = {
        id: response.messageId,
        conversationId: response.conversationId,
        role: 'ASSISTANT',
        content: response.content,
        toolCalls: response.toolExecutions,
        createdAt: response.createdAt,
      };

      setMessages((prev) => [...prev.filter((m) => m.id !== tempUserMsg.id), tempUserMsg, assistantMsg]);

      // Si era una conversación nueva, actualizar ID y lista
      if (!activeConversationId) {
        setActiveConversationId(response.conversationId);
      }
      await loadConversations();
      await loadRecommendations();
    } catch (err: any) {
      console.error('Error al enviar mensaje:', err);
      showToast(err?.message || 'Error al conectar con el asistente de IA.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleApplyRecommendation = async (id: string) => {
    try {
      const result = await recommendationsApi.apply(id);
      showToast(result.message || 'Recomendación aplicada exitosamente.', 'success');
      await loadRecommendations();
    } catch (err: any) {
      showToast(err?.message || 'Error al aplicar recomendación.', 'error');
    }
  };

  const handleRejectRecommendation = async (id: string) => {
    try {
      const result = await recommendationsApi.reject(id);
      showToast(result.message || 'Recomendación descartada.', 'success');
      await loadRecommendations();
    } catch (err: any) {
      showToast(err?.message || 'Error al descartar recomendación.', 'error');
    }
  };

  if (isAuthLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Verificando credenciales...</p>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <Sidebar activeSection="advisor" />
      <MobileTopBar />

      <main className={styles.main}>
        {/* Toast Notification */}
        {toastMessage && (
          <div
            className={`${styles.toast} ${
              toastMessage.type === 'error' ? styles.toastError : styles.toastSuccess
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle size={18} />
            ) : (
              <CheckCircle2 size={18} />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        <div className={styles.container}>
          {/* Columna Izquierda: Historial de Sesiones */}
          <aside className={styles.historyPanel}>
            <div className={styles.historyHeader}>
              <h3 className={styles.historyTitle}>Historial</h3>
              <button
                type="button"
                className={styles.newChatBtn}
                onClick={handleStartNewConversation}
                title="Iniciar nueva consulta"
              >
                <Plus size={16} />
                <span>Nueva</span>
              </button>
            </div>

            <div className={styles.conversationsList}>
              {conversations.length === 0 ? (
                <div className={styles.emptyHistory}>Sin conversaciones previas</div>
              ) : (
                conversations.map((c) => {
                  const isActive = c.id === activeConversationId;
                  return (
                    <div
                      key={c.id}
                      className={`${styles.convItem} ${isActive ? styles.convItemActive : ''}`}
                      onClick={() => setActiveConversationId(c.id)}
                    >
                      <div className={styles.convInfo}>
                        <span className={styles.convTitle}>{c.title}</span>
                        <span className={styles.convMeta}>
                          {c.messageCount} mensaje(s) · {new Date(c.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={styles.deleteConvBtn}
                        onClick={(e) => handleDeleteConversation(e, c.id)}
                        title="Eliminar conversación"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* Columna Central: Chat Interactivo */}
          <section className={styles.chatSection}>
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderBrand}>
                <div className={styles.sparkleIcon}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <h1 className={styles.chatHeaderTitle}>FinanZIA Advisor</h1>
                  <p className={styles.chatHeaderSubtitle}>
                    Asistente determinista ReAct · Conexión directa a PostgreSQL
                  </p>
                </div>
              </div>
              <div className={styles.statusPill}>
                <span className={styles.greenDot} /> Cero Alucinaciones
              </div>
            </div>

            <div className={styles.messagesContainer}>
              {isLoadingMessages ? (
                <div className={styles.messagesLoading}>
                  <div className={styles.spinner} />
                  <span>Cargando historial verificado...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className={styles.welcomeCard}>
                  <div className={styles.welcomeIcon}>⚡</div>
                  <h2 className={styles.welcomeTitle}>¿En qué puedo ayudarte hoy?</h2>
                  <p className={styles.welcomeDesc}>
                    Soy tu asesor financiero inteligente. Todas mis respuestas están basadas en
                    consultas SQL reales a tus cuentas, categorías y presupuestos. Nunca invento datos ni
                    asumo cifras.
                  </p>

                  <div className={styles.welcomeChips}>
                    <QuickPromptChips
                      onSelectPrompt={(p) => handleSendMessage(p)}
                      disabled={isSending}
                    />
                  </div>
                </div>
              ) : (
                messages.map((m) => <ChatBubble key={m.id} message={m} />)
              )}

              {isSending && (
                <div className={styles.typingIndicator}>
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                  <span className={styles.typingText}>
                    Ejecutando consultas SQL backend verificadas...
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <div className={styles.chatInputWrapper}>
              {messages.length > 0 && (
                <div className={styles.promptChipsBar}>
                  <QuickPromptChips
                    onSelectPrompt={(p) => handleSendMessage(p)}
                    disabled={isSending}
                  />
                </div>
              )}

              <div className={styles.inputBar}>
                <input
                  type="text"
                  className={styles.chatInput}
                  placeholder="Pregúntale a FinanZIA (ej. ¿Cuánto he gastado este mes en restaurantes?)..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSending}
                />
                <button
                  type="button"
                  className={styles.sendBtn}
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() || isSending}
                  aria-label="Enviar mensaje"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </section>

          {/* Columna Derecha: Recomendaciones Human-in-the-Loop */}
          <aside className={styles.recommendationsPanel}>
            <div className={styles.recsHeader}>
              <div className={styles.recsHeaderTitle}>
                <span className={styles.recsIcon}>💡</span>
                <h3>Recomendaciones</h3>
              </div>
              <span className={styles.recsBadge}>
                {recommendations.length} pendientes
              </span>
            </div>

            <p className={styles.recsDescription}>
              Propuestas de optimización generadas por la IA. Requieren tu aprobación explícita para
              aplicarse.
            </p>

            <div className={styles.recsList}>
              {isLoadingRecs ? (
                <div className={styles.recsLoading}>
                  <div className={styles.spinner} />
                  <span>Consultando propuestas...</span>
                </div>
              ) : recommendations.length === 0 ? (
                <div className={styles.emptyRecs}>
                  <span className={styles.emptyRecsIcon}>🎯</span>
                  <h4>Al día con tus finanzas</h4>
                  <p>
                    No hay recomendaciones pendientes en este momento. Pídele al asesor un análisis de
                    tus gastos para descubrir oportunidades de ahorro.
                  </p>
                </div>
              ) : (
                recommendations.map((rec) => (
                  <RecommendationCard
                    key={rec.id}
                    recommendation={rec}
                    onApply={handleApplyRecommendation}
                    onReject={handleRejectRecommendation}
                  />
                ))
              )}
            </div>
          </aside>
        </div>
      </main>

      <MobileBottomNav activeTab="ai" />
    </div>
  );
}
