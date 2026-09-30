'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/presentation/context/auth.context';
import { Sidebar } from '@/presentation/components/navigation/Sidebar';
import { MobileTopBar } from '@/presentation/components/navigation/MobileTopBar';
import { MobileBottomNav } from '@/presentation/components/navigation/MobileBottomNav';
import { DebtCard } from '@/presentation/components/financial/DebtCard';
import { CreateDebtModal } from '@/presentation/components/financial/CreateDebtModal';
import { AmortizeDebtModal } from '@/presentation/components/financial/AmortizeDebtModal';
import { DeleteDebtModal } from '@/presentation/components/financial/DeleteDebtModal';
import { DebtSimulatorWidget } from '@/presentation/components/financial/DebtSimulatorWidget';
import { DebtHistoryTable } from '@/presentation/components/financial/DebtHistoryTable';
import { MoneyDisplay } from '@/presentation/components/financial/MoneyDisplay';
import { Button } from '@/presentation/components/ui/Button';
import { useDebts, type DebtItem, type DebtsSummary } from '@/presentation/hooks/useDebts';
import {
  Plus,
  Sparkles,
  TrendingDown,
  Layers,
  Calculator,
  Lock,
  Percent,
  CalendarClock,
  History,
} from 'lucide-react';
import styles from './debts.module.css';

type ActiveTab = 'ACTIVE' | 'SIMULATOR' | 'HISTORY';

export default function DebtsPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { getActiveDebts, getDebtHistory } = useDebts();

  const [activeTab, setActiveTab] = useState<ActiveTab>('ACTIVE');
  const [activeDebts, setActiveDebts] = useState<DebtItem[]>([]);
  const [historyDebts, setHistoryDebts] = useState<DebtItem[]>([]);
  const [summary, setSummary] = useState<DebtsSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Modals state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAmortizeModalOpen, setIsAmortizeModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null);
  const [editingDebt, setEditingDebt] = useState<DebtItem | null>(null);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const [activeRes, historyRes] = await Promise.all([
        getActiveDebts(),
        getDebtHistory(),
      ]);

      setActiveDebts(activeRes.debts || []);
      setSummary(activeRes.summary || null);
      setHistoryDebts(historyRes || []);
    } catch (err) {
      console.error('Error al cargar datos del módulo de deudas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, getActiveDebts, getDebtHistory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditingDebt(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (debt: DebtItem) => {
    setEditingDebt(debt);
    setIsCreateModalOpen(true);
  };

  const handleOpenAmortize = (debt: DebtItem) => {
    setSelectedDebt(debt);
    setIsAmortizeModalOpen(true);
  };

  const handleOpenDelete = (debt: DebtItem) => {
    setSelectedDebt(debt);
    setIsDeleteModalOpen(true);
  };

  if (isAuthLoading) {
    return (
      <div className={styles.loadingContainer}>
        <p style={{ color: '#9ca3af' }}>Cargando módulo de pasivos y deudas...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.unauthContainer}>
        <h2 style={{ color: '#ffffff' }}>Debes iniciar sesión para acceder al gestor de deudas</h2>
        <Link href="/login">
          <Button variant="primary">Ir a Iniciar Sesión</Button>
        </Link>
      </div>
    );
  }

  const weightedAverageRate = summary ? (summary.weightedAverageRateBasisPts / 100).toFixed(2) : '0.00';

  return (
    <div className={styles.appContainer}>
      <Sidebar
        activeSection="debts"
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />
      <MobileTopBar onOpenMenu={() => setIsMobileMenuOpen(true)} />

      <main className={styles.mainContent}>
        {/* Cabecera Principal */}
        <header className={styles.header}>
          <div className={styles.headerTitles}>
            <h1 className={styles.pageTitle}>
              <TrendingDown size={28} color="#fb7185" />
              Deudas y Pasivos
            </h1>
            <p className={styles.pageSubtitle}>
              Control riguroso de pasivos financieros, amortizaciones inteligentes y simulador de aceleración hacia tu libertad de deuda.
            </p>
          </div>

          <div className={styles.headerActions}>
            <Link
              href="/advisor?prompt=Analiza%20mi%20cartera%20de%20deudas%20y%20recomi%C3%A9ndame%20la%20estrategia%20m%C3%A1s%20eficiente%20de%20amortizaci%C3%B3n"
              className={styles.advisorButton}
              title="Consultar con el asesor inteligente de FinanZIA"
            >
              <Sparkles size={16} />
              Asesor IA de Deudas
            </Link>

            <Button variant="primary" onClick={handleOpenCreate}>
              <Plus size={16} /> Registrar Deuda
            </Button>
          </div>
        </header>

        {/* KPIs Consolidados de Cartera de Pasivos */}
        <section className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>
              <TrendingDown size={14} color="#f43f5e" />
              Total Pasivo Vivo
            </span>
            <span className={styles.kpiValue} style={{ color: '#fb7185' }}>
              <MoneyDisplay cents={summary ? summary.totalRemainingCents : 0} colorCoded={false} />
            </span>
            <span className={styles.kpiSub}>
              {summary && summary.totalInitialCents !== '0' ? (
                <>
                  Capital inicial:{' '}
                  <MoneyDisplay cents={summary.totalInitialCents} colorCoded={false} />
                </>
              ) : (
                'Saldo pendiente total'
              )}
            </span>
          </div>

          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>
              <CalendarClock size={14} color="#38bdf8" />
              Compromiso Mensual
            </span>
            <span className={styles.kpiValue} style={{ color: '#38bdf8' }}>
              <MoneyDisplay cents={summary ? summary.totalMonthlyCommitmentCents : 0} colorCoded={false} />
            </span>
            <span className={styles.kpiSub}>Cuota base obligatoria consolidada</span>
          </div>

          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>
              <Percent size={14} color="#f59e0b" />
              Coste Mensual Intereses
            </span>
            <span className={styles.kpiValue} style={{ color: '#fbbf24' }}>
              <MoneyDisplay cents={summary ? summary.totalMonthlyInterestCents : 0} colorCoded={false} />
            </span>
            <span className={styles.kpiSub}>Intereses generados cada mes</span>
          </div>

          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>
              <Percent size={14} color="#a855f7" />
              TAE Media Ponderada
            </span>
            <span className={styles.kpiValue} style={{ color: '#c084fc' }}>
              {weightedAverageRate} %
            </span>
            <span className={styles.kpiSub}>Ponderado sobre saldo vivo real</span>
          </div>
        </section>

        {/* Barra de Navegación por Pestañas */}
        <div className={styles.tabsContainer}>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'ACTIVE' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('ACTIVE')}
          >
            <Layers size={16} />
            Deudas Activas
            <span className={styles.tabBadge}>{activeDebts.length}</span>
          </button>

          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'SIMULATOR' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('SIMULATOR')}
          >
            <Calculator size={16} />
            Simulador de Aceleración
          </button>

          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'HISTORY' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('HISTORY')}
          >
            <Lock size={15} />
            Historial Liquidado
            <span className={styles.tabBadge}>{historyDebts.length}</span>
          </button>
        </div>

        {/* Contenido de la Pestaña Seleccionada */}
        {activeTab === 'ACTIVE' && (
          <section>
            {activeDebts.length > 0 ? (
              <div className={styles.debtsGrid}>
                {activeDebts.map((debt) => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    onAmortize={handleOpenAmortize}
                    onEdit={handleOpenEdit}
                    onDelete={handleOpenDelete}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🎉</div>
                <h3 className={styles.emptyTitle}>¡Sin deudas activas registradas!</h3>
                <p className={styles.emptyDesc}>
                  No tienes pasivos pendientes en seguimiento. Si tienes préstamos, tarjetas de crédito con aplazamiento o hipotecas, puedes registrarlas para optimizar su amortización con precisión matemática.
                </p>
                <Button variant="primary" onClick={handleOpenCreate}>
                  <Plus size={16} /> Registrar Préstamo o Tarjeta
                </Button>
              </div>
            )}
          </section>
        )}

        {activeTab === 'SIMULATOR' && (
          <section>
            <DebtSimulatorWidget hasActiveDebts={activeDebts.length > 0} />
          </section>
        )}

        {activeTab === 'HISTORY' && (
          <section>
            <DebtHistoryTable debts={historyDebts} />
          </section>
        )}
      </main>

      <MobileBottomNav />

      {/* Modales de Gestión de Deudas */}
      <CreateDebtModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadData}
        editingDebt={editingDebt}
      />

      <AmortizeDebtModal
        isOpen={isAmortizeModalOpen}
        onClose={() => {
          setIsAmortizeModalOpen(false);
          setSelectedDebt(null);
        }}
        onSuccess={loadData}
        debt={selectedDebt}
      />

      <DeleteDebtModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedDebt(null);
        }}
        onSuccess={loadData}
        debt={selectedDebt}
      />
    </div>
  );
}
