'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/core/application/auth/auth.context';
import { MoneyDisplay } from '@/presentation/components/financial/MoneyDisplay';
import { Button } from '@/presentation/components/ui/Button';
import { Badge } from '@/presentation/components/ui/Badge';
import { AccountCard } from '@/presentation/components/financial/AccountCard';
import { TransactionTable } from '@/presentation/components/financial/TransactionTable';
import { CreateAccountModal } from '@/presentation/components/financial/CreateAccountModal';
import { CreateTransactionModal } from '@/presentation/components/financial/CreateTransactionModal';
import { CreateTransferModal } from '@/presentation/components/financial/CreateTransferModal';
import { accountsApi, AccountItem } from '@/infrastructure/api/accounts.api';
import { categoriesApi, CategoryItem } from '@/infrastructure/api/categories.api';
import {
  transactionsApi,
  TransactionItem,
  TransactionType,
} from '@/infrastructure/api/transactions.api';
import {
  PlusCircle,
  ArrowLeftRight,
  LogOut,
  Wallet,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import styles from './page.module.css';

export default function HomePage() {
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();

  // Estados de datos
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [activeFilterType, setActiveFilterType] = useState<TransactionType | 'ALL'>('ALL');
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Estados de modales
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Carga de datos
  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsDataLoading(true);
    try {
      const [accs, cats, txs] = await Promise.all([
        accountsApi.getAccounts(),
        categoriesApi.getCategories(),
        transactionsApi.getTransactions({ limit: 50 }),
      ]);
      setAccounts(accs);
      setCategories(cats);
      setTransactions(txs.items);
    } catch (err) {
      console.error('Error al cargar datos del dashboard:', err);
    } finally {
      setIsDataLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  // Borrar transacción
  const handleDeleteTransaction = async (id: string) => {
    try {
      await transactionsApi.deleteTransaction(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la transacción');
    }
  };

  // Cálculos consolidados en céntimos enteros (cero floats)
  const totalBalanceCents = accounts.reduce(
    (total, acc) => total + acc.currentBalanceCents,
    0,
  );

  // Filtrado de transacciones
  const filteredTransactions = transactions.filter((tx) => {
    if (activeFilterType === 'ALL') return true;
    return tx.type === activeFilterType;
  });

  // Estado cargando autenticación
  if (isAuthLoading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
        <p>Iniciando FinanZIA...</p>
      </div>
    );
  }

  // Vista desautenticada (Landing promocional)
  if (!isAuthenticated) {
    return (
      <main className={styles.landingMain}>
        <header className={styles.landingHeader}>
          <div className={styles.brand}>
            <div className={styles.logoIcon}>⚡</div>
            <h1 className={styles.logoText}>
              Finan<span>ZIA</span>
            </h1>
          </div>
          <div className={styles.headerActions}>
            <a
              href="http://localhost:3001/api/docs"
              target="_blank"
              rel="noreferrer"
              className={styles.headerLink}
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
            Registra tus cuentas bancarias, categoriza tus ingresos y gastos con precisión
            estricta de céntimos (cero floats) y prepárate para interactuar con un asesor
            financiero determinista.
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

  // Vista Autenticada (Dashboard en Vivo)
  return (
    <main className={styles.main}>
      {/* Barra de Navegación Superior */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logoIcon}>⚡</div>
          <div>
            <h1 className={styles.logoText}>
              Finan<span>ZIA</span>
            </h1>
            <p className={styles.logoSubtitle}>
              Bienvenido, <strong>{user?.firstName} {user?.lastName || ''}</strong>
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <a
            href="http://localhost:3001/api/docs"
            target="_blank"
            rel="noreferrer"
            className={styles.headerLink}
          >
            📖 Swagger API
          </a>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <LogOut size={14} /> Cerrar Sesión
          </Button>
        </div>
      </header>

      {/* Grid de Métricas Principales */}
      <section className={styles.dashboardGrid}>
        {/* Tarjeta: Patrimonio Total Consolidado */}
        <div className={`glass-card ${styles.metricCard}`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Patrimonio Total Líquido</span>
            <Badge variant="income">En vivo</Badge>
          </div>
          <div className={styles.cardValue}>
            <MoneyDisplay cents={totalBalanceCents} size="xl" colorCoded={false} />
          </div>
          <p className={styles.cardFooter}>
            Consolidado en {accounts.length} {accounts.length === 1 ? 'cuenta activa' : 'cuentas activas'}
          </p>
        </div>

        {/* Tarjeta: Acciones Rápidas */}
        <div className={`glass-card ${styles.metricCard}`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Operaciones Rápidas</span>
          </div>
          <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsTransactionModalOpen(true)}
              disabled={accounts.length === 0}
            >
              <PlusCircle size={15} style={{ marginRight: '0.375rem' }} /> Movimiento
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTransferModalOpen(true)}
              disabled={accounts.length < 2}
            >
              <ArrowLeftRight size={15} style={{ marginRight: '0.375rem' }} /> Transferencia
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAccountModalOpen(true)}
            >
              <CreditCard size={15} style={{ marginRight: '0.375rem' }} /> Nueva Cuenta
            </Button>
          </div>
          {accounts.length === 0 && (
            <p className={styles.cardNotice}>⚠️ Crea primero una cuenta bancaria para operar.</p>
          )}
        </div>
      </section>

      {/* Sección: Cuentas Financieras */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Tus Cuentas Financieras</h2>
            <p className={styles.sectionSubtitle}>
              Saldos en tiempo real auditados en céntimos
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAccountModalOpen(true)}
          >
            + Añadir Cuenta
          </Button>
        </div>

        {accounts.length === 0 ? (
          <div className={styles.emptyAccountsCard}>
            <p>No tienes cuentas financieras registradas todavía.</p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAccountModalOpen(true)}
              style={{ marginTop: '0.75rem' }}
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
      </section>

      {/* Sección: Transacciones y Movimientos */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Histórico de Movimientos</h2>
            <p className={styles.sectionSubtitle}>
              Transacciones atómicas registradas en base de datos
            </p>
          </div>

          <div className={styles.filtersGroup}>
            {(['ALL', 'EXPENSE', 'INCOME', 'TRANSFER'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                className={`${styles.filterBtn} ${
                  activeFilterType === filter ? styles.filterBtnActive : ''
                }`}
                onClick={() => setActiveFilterType(filter)}
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
          transactions={filteredTransactions}
          accounts={accounts}
          categories={categories}
          onDelete={handleDeleteTransaction}
          isLoading={isDataLoading}
        />
      </section>

      {/* Modales Interactivos */}
      <CreateAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSuccess={() => loadData()}
      />

      <CreateTransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSuccess={() => loadData()}
        accounts={accounts}
        categories={categories}
      />

      <CreateTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={() => loadData()}
        accounts={accounts}
      />
    </main>
  );
}
