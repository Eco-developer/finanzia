'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/core/application/auth/auth.context';
import { Sidebar } from '@/presentation/components/navigation/Sidebar';
import { MobileTopBar } from '@/presentation/components/navigation/MobileTopBar';
import { MobileBottomNav } from '@/presentation/components/navigation/MobileBottomNav';
import { BudgetProgressBar } from '@/presentation/components/financial/BudgetProgressBar';
import { CreateBudgetModal } from '@/presentation/components/financial/CreateBudgetModal';
import { MoneyDisplay } from '@/presentation/components/financial/MoneyDisplay';
import { Button } from '@/presentation/components/ui/Button';
import {
  budgetsApi,
  BudgetPacingItem,
  BudgetPacingSummary,
} from '@/infrastructure/api/budgets.api';
import { categoriesApi, CategoryItem } from '@/infrastructure/api/categories.api';
import { ChevronLeft, ChevronRight, Plus, Target, PieChart } from 'lucide-react';
import styles from './budgets.module.css';

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export default function BudgetsPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [pacingItems, setPacingItems] = useState<BudgetPacingItem[]>([]);
  const [summary, setSummary] = useState<BudgetPacingSummary | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetPacingItem | null>(null);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const [pacingRes, cats] = await Promise.all([
        budgetsApi.getPacing(selectedMonth, selectedYear),
        categoriesApi.getCategories(),
      ]);

      setPacingItems(pacingRes.data || []);
      setSummary(pacingRes.summary || null);
      setCategories(cats || []);
    } catch (err) {
      console.error('Error al cargar presupuestos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, selectedMonth, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: BudgetPacingItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDeleteBudget = async (budgetId: string) => {
    if (window.confirm('¿Seguro que deseas eliminar este presupuesto mensual?')) {
      try {
        await budgetsApi.deleteBudget(budgetId);
        loadData();
      } catch (err) {
        console.error('Error al eliminar presupuesto:', err);
      }
    }
  };

  if (isAuthLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#090d16' }}>
        <p style={{ color: '#9ca3af' }}>Cargando sesión de FinanZIA...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#090d16', gap: '1rem' }}>
        <h2 style={{ color: '#ffffff' }}>Debes iniciar sesión para ver tus presupuestos</h2>
        <Link href="/login">
          <Button variant="primary">Ir a Iniciar Sesión</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.appContainer}>
      <Sidebar activeSection="budgets" />
      <MobileTopBar />

      <main className={styles.mainContent}>
        {/* Cabecera */}
        <header className={styles.header}>
          <div className={styles.headerTitles}>
            <h1 className={styles.pageTitle}>Control Presupuestario</h1>
            <p className={styles.pageSubtitle}>
              Monitoreo en tiempo real del ritmo de gasto contra tus techos mensuales
            </p>
          </div>

          <div className={styles.headerActions}>
            {/* Navegación por mes */}
            <div className={styles.periodSelector}>
              <button
                type="button"
                className={styles.periodBtn}
                onClick={handlePrevMonth}
                aria-label="Mes anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <div className={styles.periodLabel}>
                {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </div>
              <button
                type="button"
                className={styles.periodBtn}
                onClick={handleNextMonth}
                aria-label="Mes siguiente"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <Button variant="primary" onClick={handleOpenCreate}>
              <Plus size={16} /> Fijar Presupuesto
            </Button>
          </div>
        </header>

        {/* KPIs Consolidados del Periodo */}
        {summary && (
          <section className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Total Presupuestado</span>
              <span className={styles.kpiValue}>
                <MoneyDisplay cents={summary.totalBudgetedCents} colorCoded={false} />
              </span>
              <span className={styles.kpiSub}>Techo de gasto mensual</span>
            </div>

            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Gasto Consumido</span>
              <span className={styles.kpiValue} style={{ color: '#ef4444' }}>
                <MoneyDisplay cents={summary.totalSpentCents} colorCoded={false} />
              </span>
              <span className={styles.kpiSub}>En transacciones registradas</span>
            </div>

            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Disponible Restante</span>
              <span className={styles.kpiValue} style={{ color: '#10b981' }}>
                <MoneyDisplay cents={summary.totalRemainingCents} colorCoded={false} />
              </span>
              <span className={styles.kpiSub}>Margen de maniobra</span>
            </div>

            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Ritmo Global</span>
              <span className={styles.kpiValue} style={{ color: summary.overallPercentageUsed >= 90 ? '#ef4444' : summary.overallPercentageUsed >= 70 ? '#f59e0b' : '#10b981' }}>
                {summary.overallPercentageUsed.toFixed(1)}%
              </span>
              <span className={styles.kpiSub}>De capacidad consumida</span>
            </div>
          </section>
        )}

        {/* Listado de Presupuestos por Categoría */}
        <section>
          {pacingItems.length > 0 ? (
            <div className={styles.budgetsGrid}>
              {pacingItems.map((item) => (
                <BudgetProgressBar
                  key={item.budgetId}
                  item={item}
                  onEdit={handleOpenEdit}
                  onDelete={handleDeleteBudget}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🎯</div>
              <h3 className={styles.emptyTitle}>
                No hay presupuestos para {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </h3>
              <p className={styles.emptyDesc}>
                Fija límites mensuales en tus categorías de gasto para recibir alertas automáticas antes de sobrepasar tu capacidad financiera.
              </p>
              <Button variant="primary" onClick={handleOpenCreate}>
                <Plus size={16} /> Crear Primer Presupuesto
              </Button>
            </div>
          )}
        </section>
      </main>

      <MobileBottomNav />

      {/* Modal de Crear / Editar Presupuesto */}
      <CreateBudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        categories={categories}
        initialMonth={selectedMonth}
        initialYear={selectedYear}
        editingItem={editingItem}
      />
    </div>
  );
}
