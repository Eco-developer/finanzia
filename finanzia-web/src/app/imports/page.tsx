'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/context/auth.context';
import { Button } from '@/presentation/components/ui/Button';
import { CsvUploader } from '@/presentation/components/csv-wizard/CsvUploader';
import {
  ColumnMapper,
  ColumnMappingConfig,
} from '@/presentation/components/csv-wizard/ColumnMapper';
import { ImportPreviewTable } from '@/presentation/components/csv-wizard/ImportPreviewTable';
import { ImportSummaryModal } from '@/presentation/components/csv-wizard/ImportSummaryModal';
import {
  CsvParserService,
  ParsedCsvResult,
} from '@/core/domain/services/csv-parser.service';
import { accountsApi, AccountItem } from '@/infrastructure/api/accounts.api';
import { categoriesApi, CategoryItem } from '@/infrastructure/api/categories.api';
import {
  importsApi,
  CsvTemplateItem,
  PreviewImportResult,
  CommitImportResult,
} from '@/infrastructure/api/imports.api';
import {
  Wallet,
  CheckCircle2,
  FileSpreadsheet,
  Columns,
  Sparkles,
  ArrowLeft,
  Building2,
} from 'lucide-react';
import styles from './imports.module.css';

export default function ImportsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Paso actual: 1 = Upload, 2 = Mapping, 3 = Preview/Conciliación
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Datos base
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<CsvTemplateItem[]>([]);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);

  // Estados del asistente CSV
  const [parsedCsv, setParsedCsv] = useState<ParsedCsvResult | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [isProcessingPreview, setIsProcessingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewImportResult | null>(null);
  const [preparedRows, setPreparedRows] = useState<
    Array<{
      rowId: string;
      date: string;
      description: string;
      amountCents: number;
      hash: string;
    }>
  >([]);

  // Estado de Commit y Modal de Resumen
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<CommitImportResult | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  // Cargar cuentas, categorías y plantillas
  const loadInitialData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingInitialData(true);
    try {
      const [accs, cats, tpls] = await Promise.all([
        accountsApi.getAccounts(),
        categoriesApi.getCategories(),
        importsApi.getTemplates(),
      ]);
      setAccounts(accs);
      if (accs.length > 0) {
        setSelectedAccountId(accs[0].id);
      }
      setCategories(cats);
      setSavedTemplates(tpls);
    } catch (err) {
      console.error('Error al cargar datos iniciales:', err);
    } finally {
      setIsLoadingInitialData(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/login');
    } else if (isAuthenticated) {
      loadInitialData();
    }
  }, [isAuthenticated, isAuthLoading, router, loadInitialData]);

  // Manejador del Paso 1: Archivo subido y parseado
  const handleFileParsed = (file: File, result: ParsedCsvResult) => {
    setRawFile(file);
    setParsedCsv(result);
    setCurrentStep(2);
  };

  // Manejador del Paso 2: Columnas mapeadas -> Enviar a preview al backend
  const handleMappingConfirmed = async (config: ColumnMappingConfig) => {
    if (!parsedCsv || !selectedAccountId) return;

    setIsProcessingPreview(true);
    try {
      const { headers, rows } = parsedCsv;
      const dateIdx = headers.indexOf(config.dateCol);
      const descIdx = headers.indexOf(config.descCol);

      // Si el usuario pidió guardar como plantilla bancaria
      if (config.saveTemplateAsBank) {
        try {
          await importsApi.saveTemplate({
            bankName: config.saveTemplateAsBank,
            columnMapping: {
              dateCol: config.dateCol,
              descCol: config.descCol,
              amountCol: config.amountCol || '',
              incomeCol: config.incomeCol,
              expenseCol: config.expenseCol,
              delimiter: parsedCsv.delimiter,
              dateFormat: config.dateFormat,
            },
          });
        } catch (e) {
          console.warn('No se pudo guardar la plantilla:', e);
        }
      }

      // Normalizar filas y calcular hashes SHA-256
      const payloadRows: Array<{
        rowId: string;
        date: string;
        description: string;
        amountCents: number;
        hash: string;
      }> = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rawDate = dateIdx >= 0 ? row[dateIdx] : '';
        const rawDesc = descIdx >= 0 ? row[descIdx] : '';

        let amountCents = 0;
        if (config.incomeCol && config.expenseCol) {
          const incIdx = headers.indexOf(config.incomeCol);
          const expIdx = headers.indexOf(config.expenseCol);
          const incVal = incIdx >= 0 ? CsvParserService.parseAmountCents(row[incIdx]) : 0;
          const expVal = expIdx >= 0 ? CsvParserService.parseAmountCents(row[expIdx]) : 0;
          amountCents = incVal > 0 ? incVal : -Math.abs(expVal);
        } else {
          const amtIdx = headers.indexOf(config.amountCol);
          amountCents = amtIdx >= 0 ? CsvParserService.parseAmountCents(row[amtIdx]) : 0;
        }

        const parsedDate = CsvParserService.parseDate(rawDate) || new Date();
        const sanitizedDesc = CsvParserService.sanitizeFormula(rawDesc);
        const hash = await CsvParserService.calculateRowHash(
          rawDate,
          amountCents,
          sanitizedDesc,
        );

        payloadRows.push({
          rowId: `row-${i}`,
          date: parsedDate.toISOString(),
          description: sanitizedDesc,
          amountCents,
          hash,
        });
      }

      setPreparedRows(payloadRows);

      // Llamada al backend: verificación y deduplicación atómica
      const previewRes = await importsApi.previewImport({
        accountId: selectedAccountId,
        rows: payloadRows,
      });

      setPreviewData(previewRes);
      setCurrentStep(3);
    } catch (err: any) {
      alert(err.message || 'Error al analizar las filas del extracto.');
    } finally {
      setIsProcessingPreview(false);
    }
  };

  // Manejador del Paso 3: Confirmar inserción en bloque
  const handleCommit = async (
    selectedRows: Array<{
      accountId?: string;
      date: string;
      description: string;
      amountCents: number;
      categoryId?: string | null;
      deduplicationHash?: string;
    }>,
  ) => {
    if (!selectedAccountId) return;

    setIsCommitting(true);
    try {
      const result = await importsApi.commitImport({
        accountId: selectedAccountId,
        rows: selectedRows,
      });

      setCommitResult(result);
      setIsSummaryModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Error al importar las transacciones.');
    } finally {
      setIsCommitting(false);
    }
  };

  const selectedAccountName =
    accounts.find((a) => a.id === selectedAccountId)?.name || 'Cuenta seleccionada';

  if (isAuthLoading || isLoadingInitialData) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <span>Cargando asistente de importación...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link href="/" className={styles.logoArea}>
            <div className={styles.logoIcon}>
              <Wallet size={20} />
            </div>
            <span className={styles.logoText}>
              Finan<span className={styles.logoAccent}>ZIA</span>
            </span>
          </Link>

          <Link href="/">
            <Button variant="outline" size="sm" icon={<ArrowLeft size={16} />}>
              Volver al Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.mainContent}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Asistente de Importación de Extracto Bancario</h1>
          <p className={styles.pageSubtitle}>
            Carga tus movimientos bancarios en formato CSV, asocia las columnas y concilia
            duplicados con precisión matemática sin alterar tus balances.
          </p>
        </div>

        {/* Account Selector Bar */}
        <div className={styles.accountSelectorBar}>
          <div className={styles.accountSelectorLabel}>
            <Building2 size={18} style={{ color: 'var(--brand-primary)' }} />
            <span>Cuenta de Destino:</span>
          </div>

          <select
            className={styles.accountSelect}
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            disabled={currentStep > 1}
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.currency})
              </option>
            ))}
          </select>
        </div>

        {/* Stepper Progress Indicator */}
        <div className={styles.stepper}>
          <div
            className={`${styles.stepItem} ${
              currentStep === 1
                ? styles.stepActive
                : currentStep > 1
                ? styles.stepCompleted
                : ''
            }`}
          >
            <div className={styles.stepCircle}>
              {currentStep > 1 ? <CheckCircle2 size={18} /> : '1'}
            </div>
            <span className={styles.stepLabel}>Subir Extracto CSV</span>
          </div>

          <div
            className={`${styles.stepItem} ${
              currentStep === 2
                ? styles.stepActive
                : currentStep > 2
                ? styles.stepCompleted
                : ''
            }`}
          >
            <div className={styles.stepCircle}>
              {currentStep > 2 ? <CheckCircle2 size={18} /> : '2'}
            </div>
            <span className={styles.stepLabel}>Mapear Columnas</span>
          </div>

          <div
            className={`${styles.stepItem} ${
              currentStep === 3 ? styles.stepActive : ''
            }`}
          >
            <div className={styles.stepCircle}>3</div>
            <span className={styles.stepLabel}>Revisar y Conciliar</span>
          </div>
        </div>

        {/* Step Wizard Container */}
        <div className={styles.wizardStepBox}>
          {isProcessingPreview ? (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner} />
              <p>Analizando extracto bancario y detectando transacciones duplicadas...</p>
            </div>
          ) : (
            <>
              {currentStep === 1 && (
                <CsvUploader onFileParsed={handleFileParsed} />
              )}

              {currentStep === 2 && parsedCsv && (
                <ColumnMapper
                  headers={parsedCsv.headers}
                  sampleRows={parsedCsv.rows}
                  savedTemplates={savedTemplates}
                  onMappingConfirmed={handleMappingConfirmed}
                  onBack={() => setCurrentStep(1)}
                  disabled={isProcessingPreview}
                />
              )}

              {currentStep === 3 && previewData && (
                <ImportPreviewTable
                  initialRows={preparedRows.map((row, idx) => ({
                    ...row,
                    preview:
                      previewData.preview?.find((p) => p.rowId === row.rowId) ||
                      previewData.preview?.[idx] || {
                        rowId: row.rowId,
                        isDuplicate: false,
                        suggestedCategoryId: null,
                        suggestedCategoryName: null,
                      },
                  }))}
                  categories={categories}
                  accounts={accounts}
                  defaultAccountId={selectedAccountId}
                  onCommit={handleCommit}
                  onBack={() => setCurrentStep(2)}
                  isCommitting={isCommitting}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Completion Summary Modal */}
      <ImportSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => router.push('/')}
        result={commitResult}
        accountName={selectedAccountName}
        onGoToDashboard={() => router.push('/')}
      />
    </div>
  );
}
