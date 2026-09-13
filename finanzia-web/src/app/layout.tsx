import type { Metadata } from 'next';
import '@/presentation/styles/globals.css';
import { AuthProvider } from '@/core/application/auth/auth.context';

export const metadata: Metadata = {
  title: 'FinanZIA — Finanzas Personales con IA Verificable',
  description:
    'Gestiona tus cuentas, presupuestos y metas de ahorro con control total, trazabilidad rigurosa y un asistente de IA determinista sin alucinaciones.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
