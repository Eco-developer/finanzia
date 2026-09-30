import React from 'react';
import { Metadata } from 'next';
import { OnboardingWizard } from '@/presentation/components/onboarding/OnboardingWizard';

export const metadata: Metadata = {
  title: 'Configuración Inicial · FinanZIA',
  description:
    'Configura tus metas, preferencias del Asistente IA y tu primera cuenta para comenzar a organizar tus finanzas personales.',
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
