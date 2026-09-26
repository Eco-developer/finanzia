'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/infrastructure/api/auth.api';
import { useAuth } from '@/presentation/context/auth.context';
import { Button } from '@/presentation/components/ui/Button';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import styles from './verify-email.module.css';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  const tokenParam = searchParams.get('token');
  const emailParam = searchParams.get('email');
  const unverifiedParam = searchParams.get('unverified');

  const [isVerifying, setIsVerifying] = useState(!!tokenParam);
  const [verificationStatus, setVerificationStatus] = useState<
    'idle' | 'success' | 'error'
  >(tokenParam ? 'idle' : 'idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [emailInput, setEmailInput] = useState(emailParam || '');
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Temporizador para el cooldown de reenvío
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Si se provee un token en la URL, validar automáticamente
  const verifyToken = useCallback(
    async (token: string) => {
      setIsVerifying(true);
      setErrorMessage(null);
      try {
        const res = await authApi.verifyEmail(token);
        setVerificationStatus('success');

        // Si la respuesta incluye token de sesión activa, registrarlo y refrescar contexto
        if ((res as any)?.token && typeof window !== 'undefined') {
          localStorage.setItem('finanzia_token', (res as any).token);
          await refreshUser();
        }
      } catch (err: any) {
        setVerificationStatus('error');
        setErrorMessage(
          err?.message ||
            'El enlace de verificación no es válido o ha expirado. Por favor, solicita uno nuevo.'
        );
      } finally {
        setIsVerifying(false);
      }
    },
    [refreshUser]
  );

  useEffect(() => {
    if (tokenParam) {
      verifyToken(tokenParam);
    }
  }, [tokenParam, verifyToken]);

  // Manejar el reenvío del correo
  const handleResend = async () => {
    const targetEmail = (emailParam || emailInput).trim();
    if (!targetEmail) {
      setErrorMessage('Por favor introduce tu dirección de correo electrónico.');
      return;
    }

    try {
      setIsResending(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const res = await authApi.resendVerification(targetEmail);
      setSuccessMessage(
        res.message || 'Se ha enviado un nuevo enlace de verificación a tu correo.'
      );
      setResendCooldown(60); // 60 segundos de cooldown anti-spam
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Error al reenviar el correo. Inténtalo de nuevo más tarde.'
      );
    } finally {
      setIsResending(false);
    }
  };

  // 1. MODO: Validación por Token (Enlace pulsado)
  if (tokenParam) {
    return (
      <div className={styles.authCard}>
        {isVerifying && (
          <>
            <div className={`${styles.iconWrapper} ${styles.iconWrapperPulse}`}>
              <ShieldCheck size={32} />
            </div>
            <h1 className={styles.title}>Verificando tu cuenta</h1>
            <p className={styles.subtitle}>
              Estamos validando tu enlace de seguridad. Un momento por favor...
            </p>
            <div className={styles.spinner} />
          </>
        )}

        {!isVerifying && verificationStatus === 'success' && (
          <>
            <div className={`${styles.iconWrapper} ${styles.iconWrapperSuccess}`}>
              <CheckCircle2 size={36} />
            </div>
            <h1 className={styles.title}>¡Correo verificado con éxito!</h1>
            <p className={styles.subtitle}>
              Tu cuenta de FinanZIA ha sido confirmada y activada. Ya tienes acceso
              completo a la plataforma financiera.
            </p>
            <div className={styles.actions}>
              <Button
                variant="primary"
                onClick={() => router.push('/')}
                className={styles.actionBtn}
              >
                Continuar a la aplicación <ArrowRight size={18} />
              </Button>
            </div>
          </>
        )}

        {!isVerifying && verificationStatus === 'error' && (
          <>
            <div className={`${styles.iconWrapper} ${styles.iconWrapperError}`}>
              <AlertCircle size={36} />
            </div>
            <h1 className={styles.title}>Enlace no válido o caducado</h1>
            <div className={styles.errorAlert}>
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
            <p className={styles.subtitle}>
              Los enlaces de verificación son de un solo uso y caducan a las 24 horas de
              su emisión por razones de seguridad.
            </p>
            <div className={styles.actions}>
              <Button
                variant="primary"
                onClick={() => router.push('/verify-email' + (emailParam ? `?email=${encodeURIComponent(emailParam)}` : ''))}
                className={styles.actionBtn}
              >
                Solicitar nuevo enlace
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.push('/login')}
                className={styles.actionBtn}
              >
                Volver a Iniciar sesión
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  // 2. MODO: Pantalla de Espera / Reenvío (Post-registro o Login bloqueado)
  const displayEmail = emailParam || emailInput;

  return (
    <div className={styles.authCard}>
      <div className={`${styles.iconWrapper} ${styles.iconWrapperPulse}`}>
        <Mail size={32} />
      </div>

      <h1 className={styles.title}>Verifica tu correo electrónico</h1>

      {unverifiedParam && (
        <div className={styles.warningAlert}>
          <AlertCircle size={18} />
          <span>
            Tu cuenta aún no ha sido verificada. Debes confirmar tu correo para poder
            iniciar sesión.
          </span>
        </div>
      )}

      {errorMessage && (
        <div className={styles.errorAlert}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className={styles.successAlert}>
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      <p className={styles.subtitle}>
        Hemos enviado un mensaje con un enlace de confirmación a:
      </p>

      {displayEmail ? (
        <div className={styles.emailBadge}>
          <Mail size={14} />
          {displayEmail}
        </div>
      ) : (
        <div style={{ marginBottom: '1.25rem' }}>
          <input
            type="email"
            placeholder="Introduce tu correo electrónico"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              borderRadius: 'var(--radius-sm, 6px)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--bg-card-border, #333)',
              color: 'var(--text-primary, #fff)',
              fontSize: '0.875rem',
            }}
          />
        </div>
      )}

      <div className={styles.instructionsBox}>
        <p><strong>¿No has recibido el correo?</strong></p>
        <ul>
          <li>Revisa tu carpeta de correo no deseado (spam) o promociones.</li>
          <li>Asegúrate de que la dirección introducida es correcta.</li>
          <li>Puedes solicitar un reenvío con el botón inferior.</li>
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
            'Enviando correo...'
          ) : resendCooldown > 0 ? (
            `Reenviar en ${resendCooldown}s`
          ) : (
            <>
              <RefreshCw size={16} /> Reenviar correo de verificación
            </>
          )}
        </Button>

        {/* Acceso directo a Mailpit en entorno de desarrollo local */}
        {typeof window !== 'undefined' && window.location.hostname === 'localhost' && (
          <a
            href="http://localhost:8025"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.mailpitDevLink}
            title="Abrir Mailpit Web UI en nueva pestaña"
          >
            <ExternalLink size={14} /> Abrir Mailpit Web (Bandeja Local: localhost:8025)
          </a>
        )}
      </div>

      <div className={styles.footer}>
        <p>
          ¿Quieres acceder con otra cuenta?{' '}
          <Link href="/login" className={styles.link}>
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className={styles.container}>
      <Suspense
        fallback={
          <div className={styles.authCard}>
            <div className={styles.spinner} />
            <p className={styles.subtitle}>Cargando...</p>
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
