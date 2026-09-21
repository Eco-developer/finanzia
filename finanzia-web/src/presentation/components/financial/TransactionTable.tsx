'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MoneyDisplay } from './MoneyDisplay';
import { Badge } from '@/presentation/components/ui/Badge';
import {
  Trash2,
  Pencil,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import type { TransactionItem } from '@/infrastructure/api/transactions.api';
import type { AccountItem } from '@/infrastructure/api/accounts.api';
import type { CategoryItem } from '@/infrastructure/api/categories.api';
import styles from './TransactionTable.module.css';

export interface TransactionTableProps {
  transactions: TransactionItem[];
  accounts: AccountItem[];
  categories: CategoryItem[];
  onDelete?: (id: string) => Promise<void>;
  onDeleteMultiple?: (ids: string[]) => Promise<void>;
  onRequestDelete?: (txs: TransactionItem[]) => void;
  onEdit?: (tx: TransactionItem) => void;
  isLoading?: boolean;
  // Propiedades de paginación
  page?: number;
  pageSize?: number;
  totalRecords?: number;
  totalPages?: number;
  onPageChange?: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
  pageSizeOptions?: number[];
}

export function TransactionTable({
  transactions,
  accounts,
  categories,
  onDelete,
  onDeleteMultiple,
  onRequestDelete,
  onEdit,
  isLoading = false,
  page,
  pageSize,
  totalRecords,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
}: TransactionTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const masterCheckboxRef = useRef<HTMLInputElement>(null);

  // Estados para modo no controlado (client-side pagination fallback)
  const [clientPage, setClientPage] = useState(1);
  const [clientPageSize, setClientPageSize] = useState(pageSize || 10);
  const [pageSizeInputValue, setPageSizeInputValue] = useState(
    String(pageSize || 10),
  );

  const isControlled = onPageChange !== undefined;
  const currentPage = isControlled ? page || 1 : clientPage;
  const currentPageSize = isControlled ? pageSize || 10 : clientPageSize;
  const currentTotalRecords =
    totalRecords !== undefined ? totalRecords : transactions.length;
  const currentTotalPages =
    totalPages !== undefined
      ? totalPages
      : Math.max(1, Math.ceil(currentTotalRecords / currentPageSize));

  useEffect(() => {
    setPageSizeInputValue(String(currentPageSize));
  }, [currentPageSize]);

  // Transacciones a mostrar en la página actual
  const displayedTransactions = isControlled
    ? transactions
    : transactions.slice(
        (currentPage - 1) * currentPageSize,
        currentPage * currentPageSize,
      );

  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  // Limpiar seleccionados que ya no existan tras borrado o cambio de filtro
  useEffect(() => {
    const currentIds = new Set(transactions.map((t) => t.id));
    setSelectedIds((prev) => {
      const updated = new Set<string>();
      prev.forEach((id) => {
        if (currentIds.has(id)) updated.add(id);
      });
      return updated;
    });
  }, [transactions]);

  const isAllSelected =
    displayedTransactions.length > 0 &&
    displayedTransactions.every((t) => selectedIds.has(t.id));
  const isSomeSelected =
    displayedTransactions.some((t) => selectedIds.has(t.id)) && !isAllSelected;

  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        displayedTransactions.forEach((t) => next.delete(t.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        displayedTransactions.forEach((t) => next.add(t.id));
        return next;
      });
    }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > currentTotalPages || newPage === currentPage) return;
    if (isControlled && onPageChange) {
      onPageChange(newPage);
    } else {
      setClientPage(newPage);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    if (isNaN(newSize) || newSize < 1) return;
    const clampedSize = Math.min(100, Math.max(1, newSize));
    setPageSizeInputValue(String(clampedSize));
    if (onPageSizeChange) {
      onPageSizeChange(clampedSize);
    } else {
      setClientPageSize(clampedSize);
      setClientPage(1);
    }
  };

  const handlePageSizeInputBlur = () => {
    const parsed = parseInt(pageSizeInputValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      handlePageSizeChange(parsed);
    } else {
      setPageSizeInputValue(String(currentPageSize));
    }
  };

  const handlePageSizeInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePageSizeInputBlur();
    }
  };

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (currentTotalPages <= 7) {
      for (let i = 1; i <= currentTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push('ellipsis');
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(currentTotalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < currentTotalPages - 2) {
        pages.push('ellipsis');
      }
      pages.push(currentTotalPages);
    }
    return pages;
  };

  const startRecord =
    currentTotalRecords === 0 ? 0 : (currentPage - 1) * currentPageSize + 1;
  const endRecord = Math.min(currentPage * currentPageSize, currentTotalRecords);

  const handleBatchDeleteClick = () => {
    const selectedTxs = transactions.filter((t) => selectedIds.has(t.id));
    if (selectedTxs.length === 0) return;

    if (onRequestDelete) {
      onRequestDelete(selectedTxs);
    } else if (
      confirm(
        `¿Eliminar las ${selectedTxs.length} transacciones seleccionadas y revertir sus saldos?`,
      )
    ) {
      if (onDeleteMultiple) {
        onDeleteMultiple(Array.from(selectedIds));
      } else if (onDelete) {
        Promise.all(Array.from(selectedIds).map((id) => onDelete(id)));
      }
    }
  };

  const handleSingleDeleteClick = (tx: TransactionItem) => {
    if (onRequestDelete) {
      onRequestDelete([tx]);
    } else if (
      confirm('¿Eliminar esta transacción y revertir el saldo de la cuenta?')
    ) {
      onDelete?.(tx.id);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Cargando transacciones...</p>
      </div>
    );
  }

  if (transactions.length === 0 && currentTotalRecords === 0) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyIcon}>💳</div>
        <h3 className={styles.emptyTitle}>Sin transacciones todavía</h3>
        <p className={styles.emptySubtitle}>
          Registra tus primeros ingresos, gastos o transferencias para ver el histórico detallado.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      {selectedIds.size > 0 && (
        <div className={styles.batchBar}>
          <span className={styles.batchCount}>
            {selectedIds.size}{' '}
            {selectedIds.size === 1
              ? 'transacción seleccionada'
              : 'transacciones seleccionadas'}
          </span>
          <div className={styles.batchActions}>
            <button
              type="button"
              className={styles.deselectBtn}
              onClick={() => setSelectedIds(new Set())}
            >
              Deseleccionar
            </button>
            <button
              type="button"
              className={styles.batchDeleteBtn}
              onClick={handleBatchDeleteClick}
            >
              <Trash2 size={14} />
              Eliminar seleccionadas ({selectedIds.size})
            </button>
          </div>
        </div>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.checkboxTh}>
              <input
                ref={masterCheckboxRef}
                type="checkbox"
                className={styles.checkboxInput}
                checked={isAllSelected}
                onChange={toggleSelectAll}
                aria-label="Seleccionar todas las transacciones"
              />
            </th>
            <th>Fecha</th>
            <th>Concepto / Detalle</th>
            <th>Categoría</th>
            <th>Cuenta</th>
            <th style={{ textAlign: 'right' }}>Importe</th>
            <th style={{ textAlign: 'center', width: '80px' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {displayedTransactions.length === 0 && currentTotalRecords > 0 ? (
            <tr className={styles.row}>
              <td
                colSpan={7}
                style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: 'var(--text-muted)',
                }}
              >
                No hay movimientos en esta página.
              </td>
            </tr>
          ) : (
            displayedTransactions.map((tx) => {
              const categoryName = tx.categoryId
              ? categoryMap.get(tx.categoryId) || 'General'
              : null;
            const accountName = accountMap.get(tx.accountId) || 'Cuenta';
            const isSelected = selectedIds.has(tx.id);
            const isTransfer = tx.type === 'TRANSFER';

            return (
              <tr
                key={tx.id}
                className={`${styles.row} ${isSelected ? styles.rowSelected : ''}`}
              >
                <td className={styles.checkboxTd}>
                  <input
                    type="checkbox"
                    className={styles.checkboxInput}
                    checked={isSelected}
                    onChange={() => toggleRow(tx.id)}
                    aria-label={`Seleccionar ${tx.description}`}
                  />
                </td>
                <td className={styles.dateCell}>{formatDate(tx.transactionDate)}</td>
                <td className={styles.descCell}>
                  <div className={styles.descWrapper}>
                    <span
                      className={`${styles.typeIcon} ${
                        tx.type === 'INCOME'
                          ? styles.typeIncome
                          : tx.type === 'TRANSFER'
                          ? styles.typeTransfer
                          : styles.typeExpense
                      }`}
                    >
                      {tx.type === 'INCOME' ? (
                        <ArrowDownLeft size={14} />
                      ) : tx.type === 'TRANSFER' ? (
                        <ArrowLeftRight size={14} />
                      ) : (
                        <ArrowUpRight size={14} />
                      )}
                    </span>
                    <span className={styles.descriptionText}>{tx.description}</span>
                  </div>
                </td>
                <td>
                  {categoryName ? (
                    <Badge variant={tx.type === 'INCOME' ? 'income' : 'expense'} size="sm">
                      {categoryName}
                    </Badge>
                  ) : isTransfer ? (
                    <Badge variant="ai" size="sm">
                      Traspaso
                    </Badge>
                  ) : (
                    <span className={styles.mutedText}>Sin categoría</span>
                  )}
                </td>
                <td className={styles.accountCell}>{accountName}</td>
                <td style={{ textAlign: 'right' }}>
                  <MoneyDisplay cents={tx.amountCents} size="sm" />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div className={styles.actionsCell}>
                    {!isTransfer && onEdit && (
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={() => onEdit(tx)}
                        title="Modificar transacción"
                        aria-label={`Editar ${tx.description}`}
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => handleSingleDeleteClick(tx)}
                      title="Eliminar transacción y revertir saldo"
                      aria-label={`Eliminar ${tx.description}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          }))}
        </tbody>
      </table>

      {/* Barra de Paginación */}
      {currentTotalRecords > 0 && (
        <div className={styles.paginationFooter}>
          <div className={styles.paginationLeft}>
            {/* Input y selector de items por página */}
            <div className={styles.pageSizeGroup}>
              <label
                htmlFor="items-per-page-input"
                className={styles.pageSizeLabel}
              >
                Mostrar
              </label>
              <input
                id="items-per-page-input"
                aria-label="Cantidad de items por página"
                type="number"
                min="1"
                max="100"
                className={styles.pageSizeInput}
                value={pageSizeInputValue}
                onChange={(e) => setPageSizeInputValue(e.target.value)}
                onBlur={handlePageSizeInputBlur}
                onKeyDown={handlePageSizeInputKeyDown}
              />
              <select
                aria-label="Seleccionar items por página predefinidos"
                className={styles.pageSizeSelect}
                value={currentPageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              >
                {(pageSizeOptions || [5, 10, 20, 50, 100]).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <span className={styles.pageSizeLabel}>por pág.</span>
            </div>

            {/* Rango de registros */}
            <span className={styles.paginationInfo}>
              Mostrando {startRecord} - {endRecord} de {currentTotalRecords}{' '}
              movimientos
            </span>
          </div>

          {/* Controles de Navegación */}
          <nav
            className={styles.paginationControls}
            aria-label="Navegación de páginas"
          >
            <button
              type="button"
              className={styles.pageNavBtn}
              onClick={() => handlePageChange(1)}
              disabled={currentPage <= 1 || isLoading}
              title="Primera página"
              aria-label="Primera página"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              type="button"
              className={styles.pageNavBtn}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
              title="Página anterior"
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} />
            </button>

            <div className={styles.pageNumbersList}>
              {getPageNumbers().map((p, idx) => {
                if (p === 'ellipsis') {
                  return (
                    <span
                      key={`ellipsis-${idx}`}
                      className={styles.pageEllipsis}
                    >
                      …
                    </span>
                  );
                }
                const isActive = p === currentPage;
                return (
                  <button
                    key={p}
                    type="button"
                    className={`${styles.pageNumberBtn} ${
                      isActive ? styles.pageNumberBtnActive : ''
                    }`}
                    onClick={() => handlePageChange(p)}
                    disabled={isLoading}
                    aria-label={`Página ${p}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className={styles.pageNavBtn}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= currentTotalPages || isLoading}
              title="Página siguiente"
              aria-label="Página siguiente"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              className={styles.pageNavBtn}
              onClick={() => handlePageChange(currentTotalPages)}
              disabled={currentPage >= currentTotalPages || isLoading}
              title="Última página"
              aria-label="Última página"
            >
              <ChevronsRight size={16} />
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
