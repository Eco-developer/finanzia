'use client';

import React, { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/infrastructure/api/auth.api';
import { Input } from '@/presentation/components/ui/Input';
import { Button } from '@/presentation/components/ui/Button';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeClosed,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';
import styles from './reset-password.module.css';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');

  // El token temporal se mantiene ESTRICTAMENTE en memoria (React state)
  const [token, setToken] = useState<string | null>(tokenParam);
  const [status, setStatus] = useState<'verifying' | 'error' | 'form' | 'success'>(
    'verifying'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Formulario
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verificación inicial del token al montar
  useEffect(() => {
    async function verify() {
      if (!tokenParam) {
        setStatus('error');
        setErrorMessage(
          'No se ha proporcionado ningún enlace de seguridad válido.'
        );
        return;
      }

      try {
        setStatus('verifying');
        setErrorMessage(null);
        await authApi.verifyResetToken(tokenParam);
        setToken(tokenParam);
        setStatus('form');
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(
          err?.message ||
            'El enlace de recuperación es inválido, ha caducado (superó los 30 minutos) o ya fue utilizado.'
        );
      }
    }

    verify();
  }, [tokenParam]);

  // Criterios reactivos en tiempo real
  const criteria = {
    length: password.length >= 8 && password.length <= 72,
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    matches: password.length > 0 && password === repeatPassword,
  };

  const allCriteriaMet =
    criteria.length &&
    criteria.hasUpper &&
    criteria.hasNumber &&
    criteria.hasSpecial &&
    criteria.matches;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allCriteriaMet || !token) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      // Enviamos el Bearer token directamente por cabecera, sin tocar localStorage
      await authApi.resetPassword(password, token);
      setStatus('success');
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Error al restablecer la contraseña. Es posible que el enlace haya caducado.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. ESTADO: Verificando enlace
  if (status === 'verifying') {
    return (
      <div className={styles.authCard}>
        <div className={`${styles.iconWrapper} ${styles.iconWrapperPulse}`}>
          <ShieldCheck size={32} />
        </div>
        <h1 className={styles.title}>Verificando enlace</h1>
        <p className={styles.subtitle}>
          Estamos comprobando la autenticidad y vigencia de tu enlace de seguridad. Un momento por favor...
        </p>
        <div className={styles.spinner} />
      </div>
    );
  }

  // 2. ESTADO: Enlace inválido, caducado o ya utilizado (> 30 min)
  if (status === 'error') {
    return (
      <div className={styles.authCard}>
        <div className={`${styles.iconWrapper} ${styles.iconWrapperError}`}>
          <AlertCircle size={36} />
        </div>
        <h1 className={styles.title}>Enlace no válido o caducado</h1>
        <div className={styles.errorAlert}>
          <AlertCircle size={18} />
          <span>
            {errorMessage ||
              'El enlace de recuperación es inválido o han transcurrido más de 30 minutos desde su generación.'}
          </span>
        </div>
        <p className={styles.subtitle}>
          Por motivos de seguridad, los enlaces de recuperación solo son válidos durante 30 minutos y quedan anulados tras su uso.
        </p>
        <div className={styles.actions}>
          <Button
            variant="primary"
            onClick={() => router.push('/forgot-password')}
            className={styles.actionBtn}
          >
            Solicitar nuevo enlace
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push('/login')}
            className={styles.actionBtn}
          >
            <ArrowLeft size={16} /> Volver a Iniciar sesión
          </Button>
        </div>
      </div>
    );
  }

  // 3. ESTADO: Éxito — Contraseña cambiada
  if (status === 'success') {
    return (
      <div className={styles.authCard}>
        <div className={`${styles.iconWrapper} ${styles.iconWrapperSuccess}`}>
          <CheckCircle2 size={36} />
        </div>
        <h1 className={styles.title}>¡Tu contraseña se ha cambiado!</h1>
        <p className={styles.subtitle}>
          Tu contraseña ha sido actualizada con éxito. Por seguridad, cualquier otra sesión activa ha sido cerrada. Ya puedes acceder con tus nuevas credenciales.
        </p>
        <div className={styles.actions}>
          <Button
            variant="primary"
            onClick={() => router.push('/login')}
            className={styles.actionBtn}
          >
            Ir a Iniciar sesión <ArrowRight size={18} />
          </Button>
        </div>
      </div>
    );
  }

  // 4. ESTADO: Formulario de Nueva Contraseña
  return (
    <div className={styles.authCard}>
      <div className={`${styles.iconWrapper} ${styles.iconWrapperPulse}`}>
        <KeyRound size={32} />
      </div>

      <h1 className={styles.title}>
        Nueva <span>Contraseña</span>
      </h1>
      <p className={styles.subtitle}>
        Introduce y confirma tu nueva clave de acceso para FinanZIA.
      </p>

      {errorMessage && (
        <div className={styles.errorAlert}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          label="Nueva Contraseña"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={styles.passwordToggle}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeClosed size={18} /> : <Eye size={18} />}
            </button>
          }
        />

        <Input
          label="Repetir Nueva Contraseña"
          type={showRepeatPassword ? 'text' : 'password'}
          placeholder="••••••••"
          value={repeatPassword}
          onChange={(e) => setRepeatPassword(e.target.value)}
          required
          autoComplete="new-password"
          rightElement={
            <button
              type="button"
              onClick={() => setShowRepeatPassword(!showRepeatPassword)}
              className={styles.passwordToggle}
              aria-label={showRepeatPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              title={showRepeatPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showRepeatPassword ? <EyeClosed size={18} /> : <Eye size={18} />}
            </button>
          }
        />

        {/* Checklist Reactivo en Tiempo Real */}
        <div className={styles.criteriaBox}>
          <span className={styles.criteriaTitle}>Requisitos de seguridad:</span>

          <div
            className={`${styles.criterion} ${
              criteria.length ? styles.criterionMet : styles.criterionUnmet
            }`}
          >
            {criteria.length ? <Check size={14} /> : <X size={14} />}
            <span>Entre 8 y 72 caracteres</span>
          </div>

          <div
            className={`${styles.criterion} ${
              criteria.hasUpper ? styles.criterionMet : styles.criterionUnmet
            }`}
          >
            {criteria.hasUpper ? <Check size={14} /> : <X size={14} />}
            <span>Al menos una letra mayúscula</span>
          </div>

          <div
            className={`${styles.criterion} ${
              criteria.hasNumber ? styles.criterionMet : styles.criterionUnmet
            }`}
          >
            {criteria.hasNumber ? <Check size={14} /> : <X size={14} />}
            <span>Al menos un número</span>
          </div>

          <div
            className={`${styles.criterion} ${
              criteria.hasSpecial ? styles.criterionMet : styles.criterionUnmet
            }`}
          >
            {criteria.hasSpecial ? <Check size={14} /> : <X size={14} />}
            <span>Al menos un carácter especial (!@#$%^&*)</span>
          </div>

          <div
            className={`${styles.criterion} ${
              criteria.matches ? styles.criterionMet : styles.criterionUnmet
            }`}
          >
            {criteria.matches ? <Check size={14} /> : <X size={14} />}
            <span>Ambas contraseñas coinciden</span>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={!allCriteriaMet || isSubmitting}
          className={styles.submitBtn}
        >
          {isSubmitting ? 'Cambiando contraseña...' : 'Cambiar contraseña'}
        </Button>
      </form>

      <div className={styles.footer}>
        <p>
          ¿Deseas volver sin cambiarla?{' '}
          <Link href="/login" className={styles.link}>
            Ir al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className={styles.container}>
      <Suspense
        fallback={
          <div className={styles.authCard}>
            <div className={styles.spinner} />
            <p className={styles.subtitle}>Cargando formulario seguro...</p>
          </div>
        }
      >
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
