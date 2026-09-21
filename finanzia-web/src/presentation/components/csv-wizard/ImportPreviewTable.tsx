'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Search,
  ArrowLeft,
  ArrowRight,
  Database,
  Tag,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { MoneyDisplay } from '../financial/MoneyDisplay';
import { RowPreviewResult } from '@/infrastructure/api/imports.api';
import styles from './ImportPreviewTable.module.css';

export interface EnrichedRowItem {
  rowId: string;
  date: string;
  description: string;
  amountCents: number;
  hash: string;
  isDuplicate: boolean;
  selected: boolean;
  accountId: string;
  type: 'EXPENSE' | 'INCOME';
  categoryId: string | null;
}

export interface CategorySelectItem {
  id: string;
  name: string;
  type: string;
  parentId?: string | null;
  icon?: string | null;
}

export interface AccountSelectItem {
  id: string;
  name: string;
  currency?: string;
}

export interface ImportPreviewTableProps {
  initialRows: Array<{
    rowId: string;
    date: string;
    description: string;
    amountCents: number;
    hash: string;
    preview: RowPreviewResult;
  }>;
  categories: CategorySelectItem[];
  accounts: AccountSelectItem[];
  defaultAccountId?: string;
  onCommit: (selectedRows: Array<{
    accountId?: string;
    date: string;
    description: string;
    amountCents: number;
    categoryId?: string | null;
    deduplicationHash?: string;
  }>) => void;
  onBack: () => void;
  isCommitting?: boolean;
}

export const ImportPreviewTable: React.FC<ImportPreviewTableProps> = ({
  initialRows,
  categories,
  accounts,
  defaultAccountId,
  onCommit,
  onBack,
  isCommitting = false,
}) => {
  const fallbackAccountId = defaultAccountId || accounts[0]?.id || '';

  const [rows, setRows] = useState<EnrichedRowItem[]>(() =>
    initialRows.map((item) => {
      // Inferencia inteligente de tipo: comprobar sugerencia o signo de importe
      const suggestedCat = item.preview?.suggestedCategoryId
        ? categories.find((c) => c.id === item.preview.suggestedCategoryId)
        : null;

      let inferredType: 'EXPENSE' | 'INCOME' = 'EXPENSE';
      if (suggestedCat) {
        inferredType = suggestedCat.type === 'INCOME' ? 'INCOME' : 'EXPENSE';
      } else {
        inferredType = item.amountCents >= 0 ? 'INCOME' : 'EXPENSE';
      }

      return {
        rowId: item.rowId,
        date: item.date,
        description: item.description,
        amountCents: item.amountCents,
        hash: item.hash,
        isDuplicate: item.preview?.isDuplicate ?? false,
        selected: !item.preview?.isDuplicate,
        accountId: fallbackAccountId,
        type: inferredType,
        categoryId: item.preview?.suggestedCategoryId || null,
      };
    }),
  );

  const [searchTerm, setSearchTerm] = useState('');

  // Estados de herramientas masivas
  const [bulkAccount, setBulkAccount] = useState('');
  const [bulkType, setBulkType] = useState<'EXPENSE' | 'INCOME' | ''>('');
  const [bulkCategory, setBulkCategory] = useState('');

  // Estadísticas KPI
  const stats = useMemo(() => {
    const total = rows.length;
    const duplicates = rows.filter((r) => r.isDuplicate).length;
    const newItems = total - duplicates;
    const selectedRows = rows.filter((r) => r.selected);
    const selectedCount = selectedRows.length;
    const netDeltaCents = selectedRows.reduce((acc, r) => acc + r.amountCents, 0);

    return { total, duplicates, newItems, selectedCount, netDeltaCents };
  }, [rows]);

  // Organizar categorías por tipo (Gastos vs Ingresos) con jerarquía visual
  const { expenseCategories, incomeCategories } = useMemo(() => {
    const buildCategoryTree = (type: 'EXPENSE' | 'INCOME') => {
      const typeCats = categories.filter((c) => c.type === type);
      const rootCats = typeCats.filter((c) => !c.parentId);
      const childCats = typeCats.filter((c) => c.parentId);

      const result: Array<{
        category: CategorySelectItem;
        formattedName: string;
      }> = [];

      rootCats.forEach((root) => {
        result.push({
          category: root,
          formattedName: `${root.icon ? root.icon + ' ' : ''}${root.name}`,
        });
        const children = childCats.filter((ch) => ch.parentId === root.id);
        children.forEach((child) => {
          result.push({
            category: child,
            formattedName: `  ↳ ${child.icon ? child.icon + ' ' : ''}${child.name}`,
          });
        });
      });

      // Incluir categorías huerfanas si existieran
      const listedIds = new Set(result.map((r) => r.category.id));
      typeCats
        .filter((c) => !listedIds.has(c.id))
        .forEach((orphan) => {
          result.push({
            category: orphan,
            formattedName: `${orphan.icon ? orphan.icon + ' ' : ''}${orphan.name}`,
          });
        });

      return result;
    };

    return {
      expenseCategories: buildCategoryTree('EXPENSE'),
      incomeCategories: buildCategoryTree('INCOME'),
    };
  }, [categories]);

  // Manejo de selecciones
  const toggleRow = (rowId: string) => {
    setRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, selected: !r.selected } : r)),
    );
  };

  const selectAllNew = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        selected: !r.isDuplicate,
      })),
    );
  };

  const selectAll = () => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: true })));
  };

  const deselectAll = () => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: false })));
  };

  const handleCategoryChange = (rowId: string, catId: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.rowId === rowId ? { ...r, categoryId: catId || null } : r,
      ),
    );
  };

  const handleTypeChange = (rowId: string, newType: 'EXPENSE' | 'INCOME') => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;

        // Invertir o ajustar el signo de amountCents
        const absVal = Math.abs(r.amountCents);
        const newAmountCents = newType === 'INCOME' ? absVal : -absVal;

        // Comprobar si la categoría actual sigue perteneciendo al nuevo tipo
        let newCategoryId = r.categoryId;
        if (newCategoryId) {
          const cat = categories.find((c) => c.id === newCategoryId);
          if (cat && cat.type !== newType) {
            newCategoryId = null;
          }
        }

        return {
          ...r,
          type: newType,
          amountCents: newAmountCents,
          categoryId: newCategoryId,
        };
      }),
    );
  };

  const handleAccountChange = (rowId: string, accId: string) => {
    setRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, accountId: accId } : r)),
    );
  };

  const handleApplyBulk = () => {
    if (!bulkAccount && !bulkType && !bulkCategory) return;

    setRows((prev) =>
      prev.map((r) => {
        if (!r.selected) return r;

        let newAcc = r.accountId;
        let newType = r.type;
        let newAmount = r.amountCents;
        let newCat = r.categoryId;

        if (bulkAccount) {
          newAcc = bulkAccount;
        }

        if (bulkType) {
          newType = bulkType;
          const absVal = Math.abs(r.amountCents);
          newAmount = bulkType === 'INCOME' ? absVal : -absVal;
          if (newCat) {
            const cat = categories.find((c) => c.id === newCat);
            if (cat && cat.type !== bulkType) {
              newCat = null;
            }
          }
        }

        if (bulkCategory !== '') {
          newCat = bulkCategory;
        }

        return {
          ...r,
          accountId: newAcc,
          type: newType,
          amountCents: newAmount,
          categoryId: newCat,
        };
      }),
    );
  };

  // Filtrado por buscador
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter((r) => r.description.toLowerCase().includes(term));
  }, [rows, searchTerm]);

  const handleConfirmCommit = () => {
    const selected = rows
      .filter((r) => r.selected)
      .map((r) => ({
        accountId: r.accountId,
        date: r.date,
        description: r.description,
        amountCents: r.amountCents,
        categoryId: r.categoryId && r.categoryId.trim() !== '' ? r.categoryId : undefined,
        deduplicationHash: r.hash,
      }));

    if (selected.length === 0) return;
    onCommit(selected);
  };

  return (
    <div className={styles.container}>
      {/* Metrics Row */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Total Detectadas</span>
          <span className={styles.metricValue}>{stats.total}</span>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>
            <CheckCircle2 size={14} className={styles.metricNew} />
            Nuevas Transacciones
          </span>
          <span className={`${styles.metricValue} ${styles.metricNew}`}>
            {stats.newItems}
          </span>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>
            <AlertTriangle size={14} className={styles.metricDuplicate} />
            Duplicados Omitidos
          </span>
          <span className={`${styles.metricValue} ${styles.metricDuplicate}`}>
            {stats.duplicates}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <button type="button" className={styles.quickSelectBtn} onClick={selectAllNew}>
            Seleccionar solo nuevas ({stats.newItems})
          </button>
          <span>•</span>
          <button type="button" className={styles.quickSelectBtn} onClick={selectAll}>
            Seleccionar todas
          </button>
          <span>•</span>
          <button type="button" className={styles.quickSelectBtn} onClick={deselectAll}>
            Deseleccionar todas
          </button>
        </div>

        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar por concepto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Herramientas de Asignación Masiva */}
      {stats.selectedCount > 0 && (
        <div className={styles.bulkToolsBar}>
          <span className={styles.bulkToolsLabel}>
            <Tag size={15} /> Asignar a seleccionadas ({stats.selectedCount}):
          </span>

          <select
            className={styles.bulkSelect}
            value={bulkAccount}
            onChange={(e) => setBulkAccount(e.target.value)}
          >
            <option value="">-- Asignar cuenta --</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>

          <select
            className={styles.bulkSelect}
            value={bulkType}
            onChange={(e) => {
              const val = e.target.value as 'EXPENSE' | 'INCOME' | '';
              setBulkType(val);
              setBulkCategory('');
            }}
          >
            <option value="">-- Asignar tipo --</option>
            <option value="EXPENSE">🔴 Gasto</option>
            <option value="INCOME">🟢 Ingreso</option>
          </select>

          <select
            className={styles.bulkSelect}
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            disabled={!bulkType}
          >
            <option value="">-- Asignar categoría --</option>
            {bulkType === 'EXPENSE' &&
              expenseCategories.map(({ category, formattedName }) => (
                <option key={category.id} value={category.id}>
                  {formattedName}
                </option>
              ))}
            {bulkType === 'INCOME' &&
              incomeCategories.map(({ category, formattedName }) => (
                <option key={category.id} value={category.id}>
                  {formattedName}
                </option>
              ))}
          </select>

          <button
            type="button"
            className={styles.bulkApplyBtn}
            onClick={handleApplyBulk}
            disabled={!bulkAccount && !bulkType && !bulkCategory}
          >
            Aplicar
          </button>
        </div>
      )}

      {/* Interactive Table */}
      <div className={styles.tableContainer}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '44px' }}>
                  <input
                    type="checkbox"
                    className={styles.checkboxInput}
                    checked={stats.selectedCount === rows.length && rows.length > 0}
                    onChange={(e) => (e.target.checked ? selectAll() : deselectAll())}
                  />
                </th>
                <th style={{ width: '110px' }}>Estado</th>
                <th style={{ width: '100px' }}>Fecha</th>
                <th>Concepto / Descripción</th>
                <th style={{ width: '160px' }}>Cuenta</th>
                <th style={{ width: '120px' }}>Tipo</th>
                <th style={{ width: '200px' }}>Categoría</th>
                <th style={{ textAlign: 'right', width: '120px' }}>Importe</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const parsedDate = new Date(row.date);
                const formattedDate = !isNaN(parsedDate.getTime())
                  ? parsedDate.toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })
                  : row.date;

                return (
                  <tr
                    key={row.rowId}
                    className={row.isDuplicate ? styles.rowDuplicate : ''}
                  >
                    <td>
                      <input
                        type="checkbox"
                        className={styles.checkboxInput}
                        checked={row.selected}
                        onChange={() => toggleRow(row.rowId)}
                      />
                    </td>
                    <td>
                      {row.isDuplicate ? (
                        <Badge variant="warning" size="sm">
                          DUPLICADA
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          NUEVA
                        </Badge>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{formattedDate}</td>
                    <td style={{ fontWeight: 500 }}>{row.description}</td>
                    <td>
                      <select
                        className={styles.accountSelectInRow}
                        value={row.accountId}
                        onChange={(e) => handleAccountChange(row.rowId, e.target.value)}
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className={styles.typeSelectInRow}
                        value={row.type}
                        onChange={(e) =>
                          handleTypeChange(row.rowId, e.target.value as 'EXPENSE' | 'INCOME')
                        }
                      >
                        <option value="EXPENSE">🔴 Gasto</option>
                        <option value="INCOME">🟢 Ingreso</option>
                      </select>
                    </td>
                    <td>
                      <select
                        className={styles.categorySelect}
                        value={row.categoryId || ''}
                        onChange={(e) => handleCategoryChange(row.rowId, e.target.value)}
                      >
                        <option value="">-- Sin categoría --</option>
                        {row.type === 'EXPENSE'
                          ? expenseCategories.map(({ category, formattedName }) => (
                              <option key={category.id} value={category.id}>
                                {formattedName}
                              </option>
                            ))
                          : incomeCategories.map(({ category, formattedName }) => (
                              <option key={category.id} value={category.id}>
                                {formattedName}
                              </option>
                            ))}
                      </select>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <MoneyDisplay cents={row.amountCents} size="sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Bar */}
      <div className={styles.footerBar}>
        <div className={styles.selectionSummary}>
          <div className={styles.summaryItem}>
            <span>Seleccionadas:</span>
            <span className={styles.summaryHighlight}>{stats.selectedCount}</span>
            <span>de {stats.total}</span>
          </div>
          <span>•</span>
          <div className={styles.summaryItem}>
            <span>Impacto neto:</span>
            <MoneyDisplay cents={stats.netDeltaCents} size="sm" />
          </div>
        </div>

        <div className={styles.footerActions}>
          <Button
            variant="secondary"
            icon={<ArrowLeft size={16} />}
            onClick={onBack}
            disabled={isCommitting}
          >
            Volver al mapeo
          </Button>
          <Button
            variant="primary"
            icon={<Database size={16} />}
            onClick={handleConfirmCommit}
            disabled={stats.selectedCount === 0 || isCommitting}
          >
            {isCommitting
              ? 'Importando transacciones...'
              : `Confirmar e Importar (${stats.selectedCount})`}
          </Button>
        </div>
      </div>
    </div>
  );
};
