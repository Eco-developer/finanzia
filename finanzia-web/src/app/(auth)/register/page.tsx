'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/context/auth.context';
import { Input } from '@/presentation/components/ui/Input';
import { Button } from '@/presentation/components/ui/Button';
import { Eye, EyeClosed } from 'lucide-react';
import styles from './register.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Validación de contraseña en tiempo real
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasNumber && hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !email.trim() || !password) {
      setError('Por favor completa todos los campos obligatorios');
      return;
    }

    if (firstName.trim().length < 2) {
      setError('El nombre debe tener entre 2 y 50 caracteres');
      return;
    }

    if (lastName.trim() && lastName.trim().length < 2) {
      setError('Los apellidos deben tener al menos 2 caracteres');
      return;
    }

    if (!isPasswordValid) {
      setError('La contraseña debe cumplir todos los requisitos de seguridad');
      return;
    }

    try {
      setIsLoading(true);
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim().toLowerCase(),
        password,
        defaultCurrency: 'EUR',
      });
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Error al registrar la cuenta. El email puede estar ya en uso.');
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
            Crear Cuenta en Finan<span>ZIA</span>
          </h1>
          <p className={styles.brandSubtitle}>Empieza a controlar tus finanzas personales con rigor</p>
        </div>

        {error && <div className={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Input
              label="Nombre *"
              placeholder="Miguel"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="Apellidos"
              placeholder="García"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <Input
            label="Correo Electrónico *"
            type="email"
            placeholder="usuario@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Input
            label="Contraseña *"
            type={showPassword ? 'text' : 'password'}
            placeholder="Mínimo 8 caracteres"
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

          {/* Checklist de requisitos de seguridad de contraseña */}
          <div className={styles.passwordRules}>
            <p className={styles.rulesTitle}>Requisitos de seguridad (CA-01.1):</p>
            <ul>
              <li className={hasMinLength ? styles.ruleValid : styles.ruleInvalid}>
                {hasMinLength ? '✓' : '○'} Mínimo 8 caracteres
              </li>
              <li className={hasUppercase ? styles.ruleValid : styles.ruleInvalid}>
                {hasUppercase ? '✓' : '○'} Al menos una letra mayúscula
              </li>
              <li className={hasNumber ? styles.ruleValid : styles.ruleInvalid}>
                {hasNumber ? '✓' : '○'} Al menos un número
              </li>
              <li className={hasSpecial ? styles.ruleValid : styles.ruleInvalid}>
                {hasSpecial ? '✓' : '○'} Al menos un símbolo (!@#$%...)
              </li>
            </ul>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || !isPasswordValid}
            className={styles.submitBtn}
          >
            {isLoading ? 'Registrando...' : 'Completar Registro'}
          </Button>
        </form>

        <div className={styles.footer}>
          <p>
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className={styles.link}>
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
