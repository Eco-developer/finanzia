'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/presentation/context/auth.context';
import { Sidebar } from '@/presentation/components/navigation/Sidebar';
import { MobileTopBar } from '@/presentation/components/navigation/MobileTopBar';
import { MobileBottomNav } from '@/presentation/components/navigation/MobileBottomNav';
import { AccountCard } from '@/presentation/components/financial/AccountCard';
import { CreateAccountModal } from '@/presentation/components/financial/CreateAccountModal';
import { EditAccountModal } from '@/presentation/components/financial/EditAccountModal';
import { DeleteAccountModal } from '@/presentation/components/financial/DeleteAccountModal';
import { MoneyDisplay } from '@/presentation/components/financial/MoneyDisplay';
import { Button } from '@/presentation/components/ui/Button';
import { useAccounts, type AccountItem } from '@/presentation/hooks/useAccounts';
import { Plus, CreditCard, Landmark, Wallet } from 'lucide-react';
import styles from './accounts.module.css';

export default function AccountsPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { getAccounts, deleteAccount } = useAccounts();

  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<AccountItem | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<AccountItem | null>(null);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const items = await getAccounts(false);
      setAccounts(items || []);
    } catch (err) {
      console.error('Error al cargar cuentas financieras:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, getAccounts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Métricas consolidadas
  const totalBalanceCents = useMemo(() => {
    return accounts.reduce((acc, curr) => acc + curr.currentBalanceCents, 0);
  }, [accounts]);

  const checkingSavingsCount = useMemo(() => {
    return accounts.filter((a) => a.type === 'CHECKING' || a.type === 'SAVINGS').length;
  }, [accounts]);

  const creditCardsCount = useMemo(() => {
    return accounts.filter((a) => a.type === 'CREDIT_CARD').length;
  }, [accounts]);

  const handleConfirmDelete = async () => {
    if (!accountToDelete) return;
    try {
      await deleteAccount(accountToDelete.id);
      await loadData();
    } catch (err) {
      console.error('Error al eliminar la cuenta:', err);
    }
  };

  return (
    <div className={styles.appContainer}>
      {/* Barra de Navegación Lateral */}
      <Sidebar
        activeSection="accounts"
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Barra Superior Móvil */}
      <MobileTopBar onOpenMenu={() => setIsMobileMenuOpen(true)} />

      {/* Contenido Principal */}
      <main className={styles.mainContent}>
        <header className={styles.header}>
          <div className={styles.headerTitles}>
            <h1 className={styles.pageTitle}>Cuentas y Tarjetas</h1>
            <p className={styles.pageSubtitle}>
              Gestión centralizada de tus cuentas bancarias, efectivo y tarjetas de crédito.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            data-testid="create-account-btn"
          >
            <Plus size={16} /> Nueva Cuenta
          </Button>
        </header>

        {/* KPIs Consolidados */}
        <section className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Patrimonio Total Líquido</span>
            <div className={styles.kpiValue}>
              <MoneyDisplay cents={totalBalanceCents} size="2xl" colorCoded={false} />
            </div>
            <span className={styles.kpiSub}>Suma verificada en céntimos enteros</span>
          </div>

          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Cuentas Bancarias y Ahorro</span>
            <div className={styles.kpiValue} style={{ color: '#60a5fa' }}>
              {checkingSavingsCount}
            </div>
            <span className={styles.kpiSub}>Cuentas corrientes y depósitos</span>
          </div>

          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Tarjetas de Crédito</span>
            <div className={styles.kpiValue} style={{ color: '#c084fc' }}>
              {creditCardsCount}
            </div>
            <span className={styles.kpiSub}>Líneas de crédito y tarjetas asociadas</span>
          </div>
        </section>

        {/* Listado de Cuentas */}
        {isLoading && accounts.length === 0 ? (
          <div className={styles.loadingState}>
            <span>Cargando cuentas...</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>💳</div>
            <h2 className={styles.emptyTitle}>Sin cuentas registradas</h2>
            <p className={styles.emptyDesc}>
              Añade tus cuentas bancarias, de ahorro o efectivo para comenzar a organizar
              tus ingresos, gastos y transferencias.
            </p>
            <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
              <Plus size={16} /> Crear mi primera cuenta
            </Button>
          </div>
        ) : (
          <div className={styles.accountsGrid}>
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onEdit={(acc) => setAccountToEdit(acc)}
                onDelete={(acc) => setAccountToDelete(acc)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Navegación Inferior Móvil */}
      <MobileBottomNav
        activeTab="dashboard"
        onTabChange={(tab) => {
          if (tab === 'settings') setIsMobileMenuOpen(true);
        }}
      />

      {/* Modal: Crear Cuenta (mismo modal del dashboard) */}
      <CreateAccountModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Modal: Modificar Cuenta */}
      <EditAccountModal
        isOpen={Boolean(accountToEdit)}
        onClose={() => setAccountToEdit(null)}
        onSuccess={() => {
          loadData();
        }}
        account={accountToEdit}
      />

      {/* Modal: Eliminar Cuenta */}
      <DeleteAccountModal
        isOpen={Boolean(accountToDelete)}
        onClose={() => setAccountToDelete(null)}
        onConfirm={handleConfirmDelete}
        account={accountToDelete}
      />
    </div>
  );
}
