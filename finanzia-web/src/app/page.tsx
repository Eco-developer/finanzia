'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/presentation/context/auth.context';
import { MoneyDisplay } from '@/presentation/components/financial/MoneyDisplay';
import { Button } from '@/presentation/components/ui/Button';
import { Badge } from '@/presentation/components/ui/Badge';
import { AccountCard } from '@/presentation/components/financial/AccountCard';
import { RecommendationCard } from '@/presentation/components/financial/RecommendationCard';
import { TransactionTable } from '@/presentation/components/financial/TransactionTable';
import { Sidebar } from '@/presentation/components/navigation/Sidebar';
import { MobileTopBar } from '@/presentation/components/navigation/MobileTopBar';
import { MobileBottomNav } from '@/presentation/components/navigation/MobileBottomNav';
import { CreateAccountModal } from '@/presentation/components/financial/CreateAccountModal';
import { CreateTransactionModal } from '@/presentation/components/financial/CreateTransactionModal';
import { CreateTransferModal } from '@/presentation/components/financial/CreateTransferModal';
import { DeleteTransactionModal } from '@/presentation/components/financial/DeleteTransactionModal';
import { EditTransactionModal } from '@/presentation/components/financial/EditTransactionModal';
import { accountsApi, AccountItem } from '@/infrastructure/api/accounts.api';
import { categoriesApi, CategoryItem } from '@/infrastructure/api/categories.api';
import {
  transactionsApi,
  TransactionItem,
  TransactionType,
} from '@/infrastructure/api/transactions.api';
import {
  Plus,
  ArrowLeftRight,
  Upload,
  CreditCard,
  Sparkles,
  ShieldCheck,
  Wallet,
  TrendingUp,
} from 'lucide-react';
import styles from './page.module.css';

export default function HomePage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Estados de datos del dominio
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [monthlyTransactions, setMonthlyTransactions] = useState<TransactionItem[]>([]);
  const [activeFilterType, setActiveFilterType] = useState<TransactionType | 'ALL'>('ALL');
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');

  // Estados de paginación de movimientos
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Estados de modales y navegación móvil
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<TransactionItem | null>(null);
  const [transactionsToDelete, setTransactionsToDelete] = useState<TransactionItem[] | null>(null);

  // Función dedicada para paginar y filtrar movimientos desde el backend
  const loadTransactions = useCallback(
    async (p: number, s: number, f: TransactionType | 'ALL') => {
      if (!isAuthenticated) return;
      try {
        const res = await transactionsApi.getTransactions({
          page: p,
          limit: s,
          type: f === 'ALL' ? undefined : f,
        });
        setTransactions(res.items);
        setCurrentPage(res.page);
        setTotalRecords(res.totalRecords);
        setTotalPages(res.totalPages);
      } catch (err) {
        console.error('Error al paginar transacciones:', err);
      }
    },
    [isAuthenticated],
  );

  // Carga reactiva de datos consolidados del dashboard
  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsDataLoading(true);
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      ).toISOString();

      const [accs, cats, monthlyRes, txsRes] = await Promise.all([
        accountsApi.getAccounts(),
        categoriesApi.getCategories(),
        transactionsApi.getTransactions({
          startDate: startOfMonth,
          endDate: endOfMonth,
          limit: 100,
        }),
        transactionsApi.getTransactions({
          page: currentPage,
          limit: pageSize,
          type: activeFilterType === 'ALL' ? undefined : activeFilterType,
        }),
      ]);
      setAccounts(accs);
      setCategories(cats);
      setMonthlyTransactions(monthlyRes.items);
      setTransactions(txsRes.items);
      setCurrentPage(txsRes.page);
      setTotalRecords(txsRes.totalRecords);
      setTotalPages(txsRes.totalPages);
    } catch (err) {
      console.error('Error al cargar datos del dashboard:', err);
    } finally {
      setIsDataLoading(false);
    }
  }, [isAuthenticated, currentPage, pageSize, activeFilterType]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  // Manejadores para modal de eliminación (individual y masiva)
  const handleRequestDelete = (txs: TransactionItem[]) => {
    setTransactionsToDelete(txs);
  };

  const handleConfirmDelete = async () => {
    if (!transactionsToDelete || transactionsToDelete.length === 0) return;
    try {
      if (transactionsToDelete.length === 1) {
        await transactionsApi.deleteTransaction(transactionsToDelete[0].id);
      } else {
        await transactionsApi.deleteMultipleTransactions(
          transactionsToDelete.map((t) => t.id),
        );
      }
      setTransactionsToDelete(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar las transacciones');
    }
  };

  // Manejador para modal de edición
  const handleEditTransaction = (tx: TransactionItem) => {
    setTransactionToEdit(tx);
  };

  // Manejadores de paginación y filtrado
  const handleFilterChange = (filter: TransactionType | 'ALL') => {
    setActiveFilterType(filter);
    setCurrentPage(1);
    loadTransactions(1, pageSize, filter);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    loadTransactions(newPage, pageSize, activeFilterType);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    loadTransactions(1, newPageSize, activeFilterType);
  };

  // Cálculos matemáticos en céntimos enteros (cero números flotantes)
  const totalBalanceCents = useMemo(() => {
    return accounts.reduce((total, acc) => total + acc.currentBalanceCents, 0);
  }, [accounts]);

  // Cálculos del mes en curso para los KPIs
  const { monthlyIncomeCents, monthlyExpenseCents, incomeCount, expenseCount } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const txsToUse = monthlyTransactions.length > 0 ? monthlyTransactions : transactions;

    const currentMonthTxs = txsToUse.filter((tx) => {
      const d = new Date(tx.transactionDate);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    const incomeTxs = currentMonthTxs.filter((tx) => tx.type === 'INCOME');
    const expenseTxs = currentMonthTxs.filter((tx) => tx.type === 'EXPENSE');

    const incCents = incomeTxs.reduce((acc, tx) => acc + tx.amountCents, 0);
    const expCents = expenseTxs.reduce((acc, tx) => acc + tx.amountCents, 0);

    return {
      monthlyIncomeCents: incCents,
      monthlyExpenseCents: expCents,
      incomeCount: incomeTxs.length,
      expenseCount: expenseTxs.length,
    };
  }, [monthlyTransactions, transactions]);

  // Navegación por secciones
  const handleNavigateSection = (sectionKey: string) => {
    if (sectionKey === 'settings') {
      setIsMobileMenuOpen(true);
      return;
    }
    setActiveSection(sectionKey);
    if (sectionKey === 'accounts') {
      document.getElementById('accounts-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (sectionKey === 'transactions') {
      document.getElementById('transactions-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (sectionKey === 'ai') {
      document.getElementById('ai-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (sectionKey === 'dashboard') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Estado cargando sesión
  if (isAuthLoading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
        <p>Iniciando FinanZIA...</p>
      </div>
    );
  }

  // Vista desautenticada: Landing Promocional Dark Glassmorphism
  if (!isAuthenticated) {
    return (
      <main className={styles.landingMain}>
        <header className={styles.landingHeader}>
          <div className={styles.landingBrand}>
            <div className={styles.logoIcon}>⚡</div>
            <h1 className={styles.logoText}>
              Finan<span>ZIA</span>
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <a
              href="http://localhost:3001/api/docs"
              target="_blank"
              rel="noreferrer"
              className={styles.swaggerLink}
            >
              📖 Swagger API
            </a>
            <Link href="/login">
              <Button variant="outline" size="sm">
                Iniciar Sesión
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" size="sm">
                Crear Cuenta
              </Button>
            </Link>
          </div>
        </header>

        <section className={styles.heroSection}>
          <div className={styles.heroBadge}>
            <Sparkles size={14} /> Finanzas Personales con IA Verificable
          </div>
          <h2 className={styles.heroTitle}>
            Control riguroso de tus finanzas sin alucinaciones
          </h2>
          <p className={styles.heroDescription}>
            Registra tus cuentas bancarias, concilia extractos CSV y opera con precisión estricta
            en céntimos enteros auditados por un asistente financiero determinista.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/register">
              <Button variant="primary" size="lg">
                Comenzar Gratis
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Acceder a mi Panel
              </Button>
            </Link>
          </div>

          <div className={styles.heroGrid}>
            <div className={`glass-card ${styles.featureCard}`}>
              <ShieldCheck className={styles.featureIcon} size={28} />
              <h3>Cero Floats y Precisión</h3>
              <p>Todos los saldos se operan en números enteros en céntimos con integridad matemática.</p>
            </div>
            <div className={`glass-card ${styles.featureCard}`}>
              <Wallet className={styles.featureIcon} size={28} />
              <h3>Multi-cuenta y Traspasos</h3>
              <p>Maneja cuentas corrientes, depósitos de ahorro y efectivo con movimientos atómicos.</p>
            </div>
            <div className={`glass-card ${styles.featureCard}`}>
              <TrendingUp className={styles.featureIcon} size={28} />
              <h3>Aislamiento Multi-tenant</h3>
              <p>Tus datos financieros viajan encriptados y aislados estrictamente para tu usuario.</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // Vista Autenticada: Dashboard con Shell Responsive
  return (
    <div className={styles.appContainer}>
      {/* Sidebar (Desktop fija 260px / Mobile Drawer offcanvas con backdrop) */}
      <Sidebar
        activeSection={activeSection}
        onNavigateSection={handleNavigateSection}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Barra Superior Móvil con botón hamburguesa */}
      <MobileTopBar onOpenMenu={() => setIsMobileMenuOpen(true)} />

      {/* Contenedor Principal de Contenido */}
      <main className={styles.mainContent}>
        {/* Cabecera Superior Consolidada (Desktop) */}
        <header className={styles.header}>
          <div className={styles.headerTitles}>
            <h1 className={styles.pageTitle}>Panel Financiero Consolidado</h1>
            <p className={styles.pageSubtitle}>
              Control riguroso de tus finanzas en céntimos enteros con IA determinista
            </p>
          </div>

          <div className={styles.headerActions}>
            <a
              href="http://localhost:3001/api/docs"
              target="_blank"
              rel="noreferrer"
              className={styles.swaggerLink}
            >
              📖 Swagger API
            </a>

            <button
              type="button"
              className={styles.primaryActionBtn}
              onClick={() => setIsTransactionModalOpen(true)}
              disabled={accounts.length === 0}
            >
              <Plus size={16} /> + Movimiento
            </button>

            <button
              type="button"
              className={styles.secondaryActionBtn}
              onClick={() => setIsTransferModalOpen(true)}
              disabled={accounts.length < 2}
            >
              <ArrowLeftRight size={15} /> ↔ Transferir
            </button>

            <Link href="/imports" className={styles.secondaryActionBtn}>
              <Upload size={15} /> ↑ Subir CSV
            </Link>
          </div>
        </header>

        {/* Tarjeta Hero Móvil (Exclusiva < 1024px) */}
        <div className={styles.mobileHeroCard}>
          <div className={styles.mobileHeroTop}>
            <span className={styles.mobileHeroLabel}>Patrimonio Total Líquido</span>
            <span className={styles.liveBadge}>EN VIVO</span>
          </div>
          <MoneyDisplay cents={totalBalanceCents} size="xl" colorCoded={false} />
          <div className={styles.mobileHeroDivider} />
          <div className={styles.mobileHeroMiniStats}>
            <div className={styles.mobileMiniCol}>
              <span className={styles.mobileMiniLabel}>Ingresos Mes</span>
              <div className={styles.incomeValue}>
                <MoneyDisplay cents={monthlyIncomeCents} size="sm" colorCoded={false} />
              </div>
            </div>
            <div className={styles.mobileMiniCol}>
              <span className={styles.mobileMiniLabel}>Gastos Mes</span>
              <div className={styles.expenseValue}>
                <MoneyDisplay cents={monthlyExpenseCents} size="sm" colorCoded={false} />
              </div>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas Circulares (Exclusivas Mobile) */}
        <div className={styles.mobileQuickActions}>
          <button
            type="button"
            className={styles.mobileQuickActionBtn}
            onClick={() => setIsTransactionModalOpen(true)}
            disabled={accounts.length === 0}
          >
            <div className={`${styles.mobileActionCircle} ${styles.mobileActionCircleBrand}`}>
              +
            </div>
            <span className={styles.mobileActionLabel}>Gasto</span>
          </button>

          <button
            type="button"
            className={styles.mobileQuickActionBtn}
            onClick={() => setIsTransferModalOpen(true)}
            disabled={accounts.length < 2}
          >
            <div className={`${styles.mobileActionCircle} ${styles.mobileActionCircleGlass}`}>
              ↔
            </div>
            <span className={styles.mobileActionLabel}>Transferir</span>
          </button>

          <Link href="/imports" className={styles.mobileQuickActionBtn}>
            <div className={`${styles.mobileActionCircle} ${styles.mobileActionCircleGlass}`}>
              ↑
            </div>
            <span className={styles.mobileActionLabel}>Subir CSV</span>
          </Link>

          <button
            type="button"
            className={styles.mobileQuickActionBtn}
            onClick={() => handleNavigateSection('ai')}
          >
            <div className={`${styles.mobileActionCircle} ${styles.mobileActionCircleAI}`}>
              ⚡
            </div>
            <span className={styles.mobileActionLabel}>AI Advisor</span>
          </button>
        </div>

        {/* Fila de 3 KPI Cards Principales (Desktop) */}
        <section className={styles.kpiGrid}>
          {/* KPI 1: Patrimonio Total Líquido */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Patrimonio Total Líquido</span>
              <span className={styles.liveBadge}>EN VIVO</span>
            </div>
            <div className={styles.kpiValue}>
              <MoneyDisplay cents={totalBalanceCents} size="2xl" colorCoded={false} />
            </div>
            <p className={styles.kpiFooter}>
              Consolidado en {accounts.length}{' '}
              {accounts.length === 1 ? 'cuenta bancaria activa' : 'cuentas bancarias activas'}
            </p>
          </div>

          {/* KPI 2: Ingresos del Mes */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Ingresos (Este Mes)</span>
            </div>
            <div className={`${styles.kpiValue} ${styles.incomeValue}`}>
              <MoneyDisplay cents={monthlyIncomeCents} size="2xl" colorCoded={false} />
            </div>
            <p className={styles.kpiFooterSuccess}>
              ↑ {incomeCount} {incomeCount === 1 ? 'ingreso registrado' : 'ingresos registrados'} este mes
            </p>
          </div>

          {/* KPI 3: Gastos del Mes */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Gastos (Este Mes)</span>
            </div>
            <div className={`${styles.kpiValue} ${styles.expenseValue}`}>
              <MoneyDisplay cents={monthlyExpenseCents} size="2xl" colorCoded={false} />
            </div>
            <p className={styles.kpiFooter}>
              {expenseCount} {expenseCount === 1 ? 'cargo registrado' : 'cargos registrados'} en el periodo
            </p>
          </div>
        </section>

        {/* Fila Intermedia: Cuentas Bancarias y Tarjeta Propuesta IA */}
        <section className={styles.middleRow} id="accounts-section">
          <div className={styles.accountsContainer}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Tus Cuentas Bancarias</h2>
                <p className={styles.sectionSubtitle}>
                  Saldos en tiempo real auditados en céntimos
                </p>
              </div>
              <button
                type="button"
                className={styles.secondaryActionBtn}
                onClick={() => setIsAccountModalOpen(true)}
              >
                <CreditCard size={14} /> + Nueva Cuenta
              </button>
            </div>

            {accounts.length === 0 ? (
              <div className={styles.emptyAccountsCard}>
                <p>No tienes cuentas financieras registradas todavía.</p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAccountModalOpen(true)}
                >
                  Crear mi primera cuenta
                </Button>
              </div>
            ) : (
              <div className={styles.accountsGrid}>
                {accounts.map((acc) => (
                  <AccountCard key={acc.id} account={acc} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Sección: Histórico de Movimientos */}
        <section className={styles.transactionsSection} id="transactions-section">
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Movimientos Bancarios Recientes</h2>
              <p className={styles.sectionSubtitle}>
                Transacciones atómicas verificadas en base de datos
              </p>
            </div>

            <div className={styles.filtersGroup}>
              {(['ALL', 'EXPENSE', 'INCOME', 'TRANSFER'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`${styles.filterBtn} ${activeFilterType === filter ? styles.filterBtnActive : ''
                    }`}
                  onClick={() => handleFilterChange(filter)}
                >
                  {filter === 'ALL'
                    ? 'Todos'
                    : filter === 'EXPENSE'
                      ? 'Gastos'
                      : filter === 'INCOME'
                        ? 'Ingresos'
                        : 'Traspasos'}
                </button>
              ))}
            </div>
          </div>

          <TransactionTable
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            onRequestDelete={handleRequestDelete}
            onEdit={handleEditTransaction}
            isLoading={isDataLoading}
            page={currentPage}
            pageSize={pageSize}
            totalRecords={totalRecords}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </section>
      </main>

      {/* Barra de Navegación Inferior Móvil (64px fija) */}
      <MobileBottomNav
        activeTab={activeSection}
        onTabChange={handleNavigateSection}
      />

      {/* Modales Interactivos */}
      <CreateAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSuccess={() => loadData()}
      />
      {accounts.length > 0 ? (
        <CreateTransactionModal
          isOpen={isTransactionModalOpen}
          onClose={() => setIsTransactionModalOpen(false)}
          onSuccess={() => loadData()}
          accounts={accounts}
          categories={categories}
        />
      ) : null}

      <CreateTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={() => loadData()}
        accounts={accounts}
      />

      {/* Modal de Eliminación Detallada (Manual o Masiva) */}
      {transactionsToDelete && transactionsToDelete.length > 0 && (
        <DeleteTransactionModal
          isOpen={Boolean(transactionsToDelete)}
          onClose={() => setTransactionsToDelete(null)}
          onConfirm={handleConfirmDelete}
          transactions={transactionsToDelete}
          accounts={accounts}
          categories={categories}
        />
      )}

      {/* Modal de Edición de Gasto/Ingreso */}
      {transactionToEdit && (
        <EditTransactionModal
          isOpen={Boolean(transactionToEdit)}
          onClose={() => setTransactionToEdit(null)}
          onSuccess={() => loadData()}
          transaction={transactionToEdit}
          accounts={accounts}
          categories={categories}
        />
      )}
    </div>
  );
}
