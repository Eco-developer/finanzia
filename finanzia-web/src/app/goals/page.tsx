'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/presentation/context/auth.context';
import { Sidebar } from '@/presentation/components/navigation/Sidebar';
import { MobileTopBar } from '@/presentation/components/navigation/MobileTopBar';
import { MobileBottomNav } from '@/presentation/components/navigation/MobileBottomNav';
import { GoalCard } from '@/presentation/components/financial/GoalCard';
import { CreateGoalModal } from '@/presentation/components/financial/CreateGoalModal';
import { ContributeGoalModal } from '@/presentation/components/financial/ContributeGoalModal';
import { MoneyDisplay } from '@/presentation/components/financial/MoneyDisplay';
import { Button } from '@/presentation/components/ui/Button';
import { goalsApi, GoalItem } from '@/infrastructure/api/goals.api';
import { Plus, Trophy, Sparkles, TrendingUp } from 'lucide-react';
import styles from './goals.module.css';

export default function GoalsPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modales y menú móvil
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<GoalItem | null>(null);
  const [editingGoal, setEditingGoal] = useState<GoalItem | null>(null);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const items = await goalsApi.getGoals();
      setGoals(items || []);
    } catch (err) {
      console.error('Error al cargar metas de ahorro:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditingGoal(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (goal: GoalItem) => {
    setEditingGoal(goal);
    setIsCreateModalOpen(true);
  };

  const handleOpenContribute = (goal: GoalItem) => {
    setSelectedGoal(goal);
    setIsContributeModalOpen(true);
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (window.confirm('¿Seguro que deseas eliminar esta meta de ahorro?')) {
      try {
        await goalsApi.deleteGoal(goalId);
        loadData();
      } catch (err) {
        console.error('Error al eliminar meta:', err);
      }
    }
  };

  // KPIs
  const totalSavedCents = goals.reduce((acc, g) => acc + g.currentAmountCents, 0);
  const totalTargetCents = goals.reduce((acc, g) => acc + g.targetAmountCents, 0);
  const completedGoalsCount = goals.filter((g) => g.isCompleted).length;

  if (isAuthLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#090d16' }}>
        <p style={{ color: '#9ca3af' }}>Cargando metas de ahorro...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#090d16', gap: '1rem' }}>
        <h2 style={{ color: '#ffffff' }}>Debes iniciar sesión para gestionar tus metas</h2>
        <Link href="/login">
          <Button variant="primary">Ir a Iniciar Sesión</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.appContainer}>
      <Sidebar
        activeSection="goals"
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />
      <MobileTopBar onOpenMenu={() => setIsMobileMenuOpen(true)} />

      <main className={styles.mainContent}>
        {/* Cabecera */}
        <header className={styles.header}>
          <div className={styles.headerTitles}>
            <h1 className={styles.pageTitle}>Metas y Objetivos de Ahorro</h1>
            <p className={styles.pageSubtitle}>
              Construye tu patrimonio futuro con objetivos definidos y aportaciones controladas
            </p>
          </div>

          <div>
            <Button variant="primary" onClick={handleOpenCreate}>
              <Plus size={16} /> Nueva Meta
            </Button>
          </div>
        </header>

        {/* KPIs Consolidados */}
        <section className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Total Ahorrado Acumulado</span>
            <span className={styles.kpiValue} style={{ color: '#10b981' }}>
              <MoneyDisplay cents={totalSavedCents} colorCoded={false} />
            </span>
            <span className={styles.kpiSub}>Capital reservado en metas</span>
          </div>

          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Objetivo Total Planificado</span>
            <span className={styles.kpiValue} style={{ color: '#c084fc' }}>
              <MoneyDisplay cents={totalTargetCents} colorCoded={false} />
            </span>
            <span className={styles.kpiSub}>Suma de metas activas</span>
          </div>

          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Cumplimiento</span>
            <span className={styles.kpiValue}>
              {completedGoalsCount} / {goals.length}
            </span>
            <span className={styles.kpiSub}>
              {completedGoalsCount === 1 ? '1 meta alcanzada' : `${completedGoalsCount} metas alcanzadas`}
            </span>
          </div>
        </section>

        {/* Listado de Metas */}
        <section>
          {goals.length > 0 ? (
            <div className={styles.goalsGrid}>
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onContribute={handleOpenContribute}
                  onEdit={handleOpenEdit}
                  onDelete={handleDeleteGoal}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🏆</div>
              <h3 className={styles.emptyTitle}>Aún no has creado metas de ahorro</h3>
              <p className={styles.emptyDesc}>
                Define metas para un fondo de emergencia, vacaciones, o compras importantes. Cada aportación te acerca un paso más a tu tranquilidad financiera.
              </p>
              <Button variant="primary" onClick={handleOpenCreate}>
                <Plus size={16} /> Crear Primera Meta
              </Button>
            </div>
          )}
        </section>
      </main>

      <MobileBottomNav />

      {/* Modales */}
      <CreateGoalModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadData}
        editingGoal={editingGoal}
      />

      <ContributeGoalModal
        isOpen={isContributeModalOpen}
        onClose={() => setIsContributeModalOpen(false)}
        onSuccess={loadData}
        goal={selectedGoal}
      />
    </div>
  );
}
