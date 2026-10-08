'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/infrastructure/api/auth.api';
import { Input } from '@/presentation/components/ui/Input';
import { Button } from '@/presentation/components/ui/Button';
import {
  Mail,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import styles from './forgot-password.module.css';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Cooldown de reenvío
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedbackMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Por favor introduce tu correo electrónico.');
      return;
    }

    try {
      setIsLoading(true);
      await authApi.forgotPassword(cleanEmail);
      setIsSubmitted(true);
      setResendCooldown(60);
    } catch (err: any) {
      setError(
        err?.message ||
          'Ocurrió un error al procesar tu solicitud. Inténtalo de nuevo más tarde.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || resendCooldown > 0) return;

    try {
      setIsResending(true);
      setError(null);
      setFeedbackMessage(null);

      await authApi.forgotPassword(cleanEmail);
      setFeedbackMessage('Se ha reenviado el enlace de recuperación a tu correo.');
      setResendCooldown(60);
    } catch (err: any) {
      setError(
        err?.message ||
          'No se pudo reenviar el enlace. Por favor, espera unos minutos.'
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.authCard}>
        {/* ESTADO 1: Formulario de Solicitud */}
        {!isSubmitted ? (
          <>
            <div className={styles.brand}>
              <div className={styles.logoIcon}>⚡</div>
              <h1 className={styles.brandTitle}>
                Recuperar <span>Contraseña</span>
              </h1>
              <p className={styles.brandSubtitle}>
                Introduce tu correo electrónico y te enviaremos un enlace seguro para restablecer tu acceso.
              </p>
            </div>

            {error && <div className={styles.errorAlert}>{error}</div>}

            <form onSubmit={handleSubmit} className={styles.form}>
              <Input
                label="Correo Electrónico"
                type="email"
                placeholder="usuario@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />

              <div className={styles.buttonRow}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push('/login')}
                  disabled={isLoading}
                  className={styles.backBtn}
                >
                  <ArrowLeft size={16} /> Atrás
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isLoading}
                  className={styles.submitBtn}
                >
                  {isLoading ? 'Enviando...' : 'Enviar link de recuperación'}
                </Button>
              </div>
            </form>

            <div className={styles.footer}>
              <p>
                ¿Recordaste tu contraseña?{' '}
                <Link href="/login" className={styles.link}>
                  Iniciar sesión
                </Link>
              </p>
            </div>
          </>
        ) : (
          /* ESTADO 2: Pantalla de Confirmación de Envío */
          <>
            <div className={`${styles.iconWrapper} ${styles.iconWrapperPulse}`}>
              <Mail size={32} />
            </div>

            <h1 className={styles.brandTitle}>Revisa tu correo</h1>

            {error && (
              <div className={styles.errorAlert}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {feedbackMessage && (
              <div className={styles.successAlert}>
                <CheckCircle2 size={18} />
                <span>{feedbackMessage}</span>
              </div>
            )}

            <p className={styles.brandSubtitle}>
              Si tu dirección de correo electrónico coincide con una cuenta registrada en FinanZIA, te hemos enviado un enlace de recuperación a:
            </p>

            <div className={styles.emailBadge}>
              <Mail size={14} />
              {email}
            </div>

            <div className={styles.instructionsBox}>
              <p>Instrucciones de seguridad:</p>
              <ul>
                <li>Abre el enlace que recibirás en tu bandeja de entrada.</li>
                <li><strong>Revisa también tu carpeta de spam</strong> o correo no deseado.</li>
                <li>Por motivos de seguridad, el enlace caducará en <strong>30 minutos</strong> y es de un solo uso.</li>
              </ul>
            </div>

            <div className={styles.actions}>
              <Button
                variant="primary"
                onClick={handleResend}
                disabled={isResending || resendCooldown > 0}
                className={styles.actionBtn}
              >
                {isResending ? (
                  'Reenviando...'
                ) : resendCooldown > 0 ? (
                  `Reenviar link en ${resendCooldown}s`
                ) : (
                  <>
                    <RefreshCw size={16} /> Reenviar link de recuperación
                  </>
                )}
              </Button>

              <Button
                variant="secondary"
                onClick={() => router.push('/login')}
                className={styles.actionBtn}
              >
                <ArrowLeft size={16} /> Volver a Iniciar sesión
              </Button>

              {/* Acceso a Mailpit en entorno local de desarrollo */}
              {typeof window !== 'undefined' &&
                window.location.hostname === 'localhost' && (
                  <a
                    href="http://localhost:8025"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.mailpitDevLink}
                    title="Bandeja de correo local Mailpit en localhost:8025"
                  >
                    <ExternalLink size={14} /> Abrir Mailpit Web (Bandeja Local: localhost:8025)
                  </a>
                )}
            </div>

            <div className={styles.footer}>
              <p>
                ¿Quieres probar con otro correo?{' '}
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className={styles.link}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Cambiar email
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
