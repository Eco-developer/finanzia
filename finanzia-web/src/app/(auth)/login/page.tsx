'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/core/application/auth/auth.context';
import { Input } from '@/presentation/components/ui/Input';
import { Button } from '@/presentation/components/ui/Button';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Por favor completa todos los campos');
      return;
    }

    try {
      setIsLoading(true);
      await login({ email, password });
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Revisa tus credenciales.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.authCard}>
        <div className={styles.brand}>
          <div className={styles.logoIcon}>⚡</div>
          <h1 className={styles.brandTitle}>
            Finan<span>ZIA</span>
          </h1>
          <p className={styles.brandSubtitle}>Inicia sesión para gestionar tus finanzas</p>
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
          />

          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <Button type="submit" variant="primary" disabled={isLoading} className={styles.submitBtn}>
            {isLoading ? 'Iniciando sesión...' : 'Entrar a FinanZIA'}
          </Button>
        </form>

        <div className={styles.footer}>
          <p>
            ¿Aún no tienes cuenta?{' '}
            <Link href="/register" className={styles.link}>
              Crear cuenta nueva
            </Link>
          </p>
          <div
            className={styles.demoCredentials}
            onClick={() => {
              setEmail('tester@finanzia.local');
              setPassword('Password123!');
            }}
            style={{ cursor: 'pointer' }}
            title="Haz clic para autocompletar credenciales de prueba"
          >
            <p><strong>Usuario de prueba (clic para autocompletar):</strong></p>
            <code>tester@finanzia.local</code> / <code>Password123!</code>
          </div>
        </div>
      </div>
    </div>
  );
}
