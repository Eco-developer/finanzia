'use client';

import React from 'react';
import { Button } from '@/presentation/components/ui/Button';
import {
  ShieldAlert,
  Lock,
  Eye,
  Scale,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import styles from './OnboardingWizard.module.css';

interface Step3DisclaimersProps {
  termsAccepted: boolean;
  onToggleTerms: (val: boolean) => void;
  onBack: () => void;
  onNext: () => void;
}

export const Step3Disclaimers: React.FC<Step3DisclaimersProps> = ({
  termsAccepted,
  onToggleTerms,
  onBack,
  onNext,
}) => {
  return (
    <div>
      <div className={styles.header}>
        <div className={styles.brandBadge}>
          <Lock size={14} /> Transparencia y Principios Fundamentales
        </div>
        <h1 className={styles.title}>Lo que Finanzia es, y lo que NUNCA será</h1>
        <p className={styles.subtitle}>
          Creemos en una relación de confianza absoluta. Antes de continuar, conoce las 4 garantías que definen nuestra plataforma.
        </p>
      </div>

      <div className={styles.disclaimersGrid}>
        {/* Pilar 1: Cero datos bancarios sensibles */}
        <div className={styles.disclaimerCard}>
          <div className={styles.disclaimerIcon}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <div className={styles.disclaimerTitle}>
              1. Cero credenciales ni datos bancarios confidenciales
            </div>
            <p className={styles.disclaimerText}>
              Finanzia <strong>nunca te pedirá ni almacenará</strong> tus contraseñas de acceso al banco, números de tarjeta de crédito, CVV ni firmas digitales. Todo se administra de forma local y soberana por ti.
            </p>
          </div>
        </div>

        {/* Pilar 2: Cero publicidad y 100% Privacidad */}
        <div className={styles.disclaimerCard}>
          <div className={styles.disclaimerIcon}>
            <Lock size={22} />
          </div>
          <div>
            <div className={styles.disclaimerTitle}>
              2. 100% Privacidad garantizada · Cero Anuncios (Zero Ads)
            </div>
            <p className={styles.disclaimerText}>
              Tus finanzas no son un producto publicitario. No vendemos tus datos a corredores ni instituciones financieras, no insertamos anuncios comerciales y no rastreamos tus hábitos de consumo para terceros.
            </p>
          </div>
        </div>

        {/* Pilar 3: Read-only manual sin transferencias */}
        <div className={styles.disclaimerCard}>
          <div className={styles.disclaimerIcon}>
            <Eye size={22} />
          </div>
          <div>
            <div className={styles.disclaimerTitle}>
              3. Modo estrictamente analítico y manual (Sin pagos ni transferencias)
            </div>
            <p className={styles.disclaimerText}>
              Finanzia opera exclusivamente en modalidad informativa y de control personal. Desde esta aplicación <strong>no es posible mover dinero, ejecutar transferencias ni realizar cobros</strong>. Tu capital permanece intacto en tus entidades oficiales.
            </p>
          </div>
        </div>

        {/* Pilar 4: No asesoramiento financiero regulado */}
        <div className={styles.disclaimerCard}>
          <div className={styles.disclaimerIcon}>
            <Scale size={22} />
          </div>
          <div>
            <div className={styles.disclaimerTitle}>
              4. Herramienta educativa y de apoyo (No asesoramiento financiero oficial)
            </div>
            <p className={styles.disclaimerText}>
              Conforme a la normativa legal vigente, ni Finanzia ni su Asistente de Inteligencia Artificial proporcionan asesoramiento financiero personalizado, recomendaciones de inversión ni incitación a contratar productos. Las simulaciones y cálculos son herramientas de apoyo para que tomes tus propias decisiones informadas.
            </p>
          </div>
        </div>
      </div>

      {/* Checkbox de Aceptación Obligatoria */}
      <div className={styles.termsAgreementBox}>
        <input
          id="termsCheckbox"
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => onToggleTerms(e.target.checked)}
          className={styles.checkboxInput}
        />
        <label htmlFor="termsCheckbox" className={styles.termsLabel}>
          He leído y comprendo las condiciones de privacidad, el modelo de gestión manual y los límites legales del servicio.
        </label>
      </div>

      <div className={styles.actionsBar}>
        <Button variant="ghost" onClick={onBack} icon={<ArrowLeft size={18} />}>
          Atrás
        </Button>
        <Button
          variant="primary"
          onClick={onNext}
          disabled={!termsAccepted}
          icon={<ArrowRight size={18} />}
        >
          Continuar a Crear mi Cuenta
        </Button>
      </div>
    </div>
  );
};
