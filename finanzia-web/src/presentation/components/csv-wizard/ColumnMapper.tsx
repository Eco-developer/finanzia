'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, BookmarkCheck, Sparkles, Building2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { MoneyDisplay } from '../financial/MoneyDisplay';
import { BANK_PRESETS, BankPreset } from '@/core/domain/constants/bank-presets';
import { CsvParserService } from '@/core/domain/services/csv-parser.service';
import { CsvTemplateItem } from '@/infrastructure/api/imports.api';
import styles from './ColumnMapper.module.css';

export interface ColumnMappingConfig {
  dateCol: string;
  descCol: string;
  amountCol: string;
  incomeCol?: string;
  expenseCol?: string;
  dateFormat?: string;
  saveTemplateAsBank?: string;
}

export interface ColumnMapperProps {
  headers: string[];
  sampleRows: string[][];
  savedTemplates?: CsvTemplateItem[];
  onMappingConfirmed: (config: ColumnMappingConfig) => void;
  onBack: () => void;
  disabled?: boolean;
}

export const ColumnMapper: React.FC<ColumnMapperProps> = ({
  headers,
  sampleRows,
  savedTemplates = [],
  onMappingConfirmed,
  onBack,
  disabled,
}) => {
  const [dateCol, setDateCol] = useState<string>('');
  const [descCol, setDescCol] = useState<string>('');
  const [amountCol, setAmountCol] = useState<string>('');
  const [isSeparateAmounts, setIsSeparateAmounts] = useState<boolean>(false);
  const [incomeCol, setIncomeCol] = useState<string>('');
  const [expenseCol, setExpenseCol] = useState<string>('');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [saveTemplate, setSaveTemplate] = useState<boolean>(false);
  const [bankName, setBankName] = useState<string>('');

  // Auto-detección inicial inteligente basada en nombres habituales de cabeceras
  useEffect(() => {
    if (headers.length === 0) return;

    // Buscar si coincide exactamente con alguna plantilla guardada
    for (const tpl of savedTemplates) {
      if (
        headers.includes(tpl.columnMapping.dateCol) &&
        headers.includes(tpl.columnMapping.descCol)
      ) {
        setDateCol(tpl.columnMapping.dateCol);
        setDescCol(tpl.columnMapping.descCol);
        if (tpl.columnMapping.amountCol) setAmountCol(tpl.columnMapping.amountCol);
        setSelectedPresetId(`tpl-${tpl.id}`);
        return;
      }
    }

    // Buscar con presets conocidos (BBVA, Santander, Revolut, etc.)
    for (const preset of BANK_PRESETS) {
      const matchDate = preset.dateColNames.find((name) => headers.includes(name));
      const matchDesc = preset.descColNames.find((name) => headers.includes(name));
      const matchAmount = preset.amountColNames.find((name) => headers.includes(name));

      if (matchDate && matchDesc && matchAmount) {
        setDateCol(matchDate);
        setDescCol(matchDesc);
        setAmountCol(matchAmount);
        setSelectedPresetId(preset.id);
        return;
      }
    }

    // Fallback: auto-match por palabras clave genéricas
    const dateCandidate = headers.find((h) =>
      /fecha|date|dia|f\./i.test(h),
    );
    const descCandidate = headers.find((h) =>
      /concepto|descripci|detalle|beneficiario|payee/i.test(h),
    );
    const amountCandidate = headers.find((h) =>
      /importe|amount|saldo|monto|valor/i.test(h),
    );

    if (dateCandidate) setDateCol(dateCandidate);
    if (descCandidate) setDescCol(descCandidate);
    if (amountCandidate) setAmountCol(amountCandidate);
  }, [headers, savedTemplates]);

  const applyPreset = (preset: BankPreset) => {
    setSelectedPresetId(preset.id);

    const matchDate = preset.dateColNames.find((name) => headers.includes(name)) || headers[0];
    const matchDesc =
      preset.descColNames.find((name) => headers.includes(name)) ||
      headers[1] ||
      headers[0];
    const matchAmount =
      preset.amountColNames.find((name) => headers.includes(name)) ||
      headers[2] ||
      headers[0];

    setDateCol(matchDate);
    setDescCol(matchDesc);
    setAmountCol(matchAmount);
    setIsSeparateAmounts(false);
  };

  const applySavedTemplate = (tpl: CsvTemplateItem) => {
    setSelectedPresetId(`tpl-${tpl.id}`);
    if (headers.includes(tpl.columnMapping.dateCol)) {
      setDateCol(tpl.columnMapping.dateCol);
    }
    if (headers.includes(tpl.columnMapping.descCol)) {
      setDescCol(tpl.columnMapping.descCol);
    }
    if (tpl.columnMapping.amountCol && headers.includes(tpl.columnMapping.amountCol)) {
      setAmountCol(tpl.columnMapping.amountCol);
      setIsSeparateAmounts(false);
    } else if (
      tpl.columnMapping.incomeCol &&
      tpl.columnMapping.expenseCol &&
      headers.includes(tpl.columnMapping.incomeCol) &&
      headers.includes(tpl.columnMapping.expenseCol)
    ) {
      setIsSeparateAmounts(true);
      setIncomeCol(tpl.columnMapping.incomeCol);
      setExpenseCol(tpl.columnMapping.expenseCol);
    }
  };

  // Calcular previsualización dinámica de las primeras 5 filas
  const previewData = sampleRows.slice(0, 5).map((row, idx) => {
    const dateIdx = headers.indexOf(dateCol);
    const descIdx = headers.indexOf(descCol);

    const rawDate = dateIdx >= 0 ? row[dateIdx] : '';
    const rawDesc = descIdx >= 0 ? row[descIdx] : '';

    let amountCents = 0;
    if (isSeparateAmounts) {
      const incIdx = headers.indexOf(incomeCol);
      const expIdx = headers.indexOf(expenseCol);
      const incVal = incIdx >= 0 ? CsvParserService.parseAmountCents(row[incIdx]) : 0;
      const expVal = expIdx >= 0 ? CsvParserService.parseAmountCents(row[expIdx]) : 0;
      amountCents = incVal > 0 ? incVal : -Math.abs(expVal);
    } else {
      const amtIdx = headers.indexOf(amountCol);
      amountCents = amtIdx >= 0 ? CsvParserService.parseAmountCents(row[amtIdx]) : 0;
    }

    const parsedDate = CsvParserService.parseDate(rawDate);
    const formattedDate = parsedDate
      ? parsedDate.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : rawDate;

    return {
      key: idx,
      date: formattedDate,
      description: CsvParserService.sanitizeFormula(rawDesc),
      amountCents,
    };
  });

  const isFormValid =
    Boolean(dateCol) &&
    Boolean(descCol) &&
    (isSeparateAmounts ? Boolean(incomeCol && expenseCol) : Boolean(amountCol));

  const handleConfirm = () => {
    if (!isFormValid) return;

    onMappingConfirmed({
      dateCol,
      descCol,
      amountCol: isSeparateAmounts ? '' : amountCol,
      incomeCol: isSeparateAmounts ? incomeCol : undefined,
      expenseCol: isSeparateAmounts ? expenseCol : undefined,
      saveTemplateAsBank: saveTemplate && bankName.trim() ? bankName.trim() : undefined,
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Mapeo de Columnas Bancarias</h3>
        <p className={styles.sectionDesc}>
          Asocia las columnas de tu extracto CSV con los campos clave requeridos por FinanZIA.
        </p>
      </div>

      {/* Preset Pills */}
      <div className={styles.presetsSection}>
        <span className={styles.presetsLabel}>Plantillas Rápidas por Entidad</span>
        <div className={styles.presetPills}>
          {savedTemplates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              className={`${styles.presetPill} ${
                selectedPresetId === `tpl-${tpl.id}` ? styles.presetPillActive : ''
              }`}
              onClick={() => applySavedTemplate(tpl)}
            >
              <BookmarkCheck size={14} />
              <span>{tpl.bankName}</span>
            </button>
          ))}

          {BANK_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`${styles.presetPill} ${
                selectedPresetId === preset.id ? styles.presetPillActive : ''
              }`}
              onClick={() => applyPreset(preset)}
            >
              <span
                className={styles.presetDot}
                style={{ backgroundColor: preset.color }}
              />
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mapping Selectors Grid */}
      <div className={styles.mappingGrid}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            <span>Columna Fecha</span>
            <span className={styles.requiredStar}>*</span>
          </label>
          <select
            className={styles.selectInput}
            value={dateCol}
            onChange={(e) => setDateCol(e.target.value)}
            disabled={disabled}
          >
            <option value="">-- Selecciona columna --</option>
            {headers.map((h, i) => (
              <option key={i} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            <span>Columna Concepto / Descripción</span>
            <span className={styles.requiredStar}>*</span>
          </label>
          <select
            className={styles.selectInput}
            value={descCol}
            onChange={(e) => setDescCol(e.target.value)}
            disabled={disabled}
          >
            <option value="">-- Selecciona columna --</option>
            {headers.map((h, i) => (
              <option key={i} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        {!isSeparateAmounts ? (
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              <span>Columna Importe (con signo +/-)</span>
              <span className={styles.requiredStar}>*</span>
            </label>
            <select
              className={styles.selectInput}
              value={amountCol}
              onChange={(e) => setAmountCol(e.target.value)}
              disabled={disabled}
            >
              <option value="">-- Selecciona columna --</option>
              {headers.map((h, i) => (
                <option key={i} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Columna Ingresos</span>
                <span className={styles.requiredStar}>*</span>
              </label>
              <select
                className={styles.selectInput}
                value={incomeCol}
                onChange={(e) => setIncomeCol(e.target.value)}
                disabled={disabled}
              >
                <option value="">-- Selecciona columna --</option>
                {headers.map((h, i) => (
                  <option key={i} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Columna Gastos</span>
                <span className={styles.requiredStar}>*</span>
              </label>
              <select
                className={styles.selectInput}
                value={expenseCol}
                onChange={(e) => setExpenseCol(e.target.value)}
                disabled={disabled}
              >
                <option value="">-- Selecciona columna --</option>
                {headers.map((h, i) => (
                  <option key={i} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      <div className={styles.modeToggle}>
        <label className={styles.modeToggleLabel}>
          <input
            type="checkbox"
            checked={isSeparateAmounts}
            onChange={(e) => setIsSeparateAmounts(e.target.checked)}
            disabled={disabled}
          />
          <span>Mi extracto bancario tiene columnas separadas para Ingresos y Gastos</span>
        </label>
      </div>

      {/* Live Sample Preview */}
      <div className={styles.previewBox}>
        <div className={styles.sectionHeader}>
          <h4 className={styles.sectionTitle} style={{ fontSize: '1rem' }}>
            Vista Previa de Conversión (Primeras 5 filas)
          </h4>
          <span className={styles.sectionDesc}>
            Comprueba que la fecha, concepto e importe se interpretan correctamente.
          </span>
        </div>

        <div className={styles.previewTableWrapper}>
          <table className={styles.previewTable}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                <th style={{ textAlign: 'right' }}>Importe Calculado</th>
              </tr>
            </thead>
            <tbody>
              {previewData.map((row) => (
                <tr key={row.key}>
                  <td>{row.date || '—'}</td>
                  <td>{row.description || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <MoneyDisplay amountCents={row.amountCents} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Template Option */}
      <div className={styles.templateSaveSection}>
        <label className={styles.saveCheckboxLabel}>
          <input
            type="checkbox"
            checked={saveTemplate}
            onChange={(e) => setSaveTemplate(e.target.checked)}
            disabled={disabled}
          />
          <span>Guardar esta configuración como plantilla para futuros extractos</span>
        </label>

        {saveTemplate && (
          <input
            type="text"
            className={styles.bankNameInput}
            placeholder="Nombre de la entidad (ej. Santander, BBVA, etc.)"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            disabled={disabled}
          />
        )}
      </div>

      {/* Navigation Actions */}
      <div className={styles.footerActions}>
        <Button
          variant="secondary"
          icon={<ArrowLeft size={16} />}
          onClick={onBack}
          disabled={disabled}
        >
          Volver
        </Button>
        <Button
          variant="primary"
          icon={<Sparkles size={16} />}
          onClick={handleConfirm}
          disabled={!isFormValid || disabled}
        >
          Analizar y Comprobar Duplicados
        </Button>
      </div>
    </div>
  );
};
