'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { CsvParserService, ParsedCsvResult } from '@/core/domain/services/csv-parser.service';
import styles from './CsvUploader.module.css';

export interface CsvUploaderProps {
  onFileParsed: (file: File, result: ParsedCsvResult, rawText: string) => void;
  disabled?: boolean;
}

export const CsvUploader: React.FC<CsvUploaderProps> = ({ onFileParsed, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedMeta, setParsedMeta] = useState<{
    delimiter: string;
    rowCount: number;
    headersCount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setError(null);

    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setError('Por favor selecciona un archivo con extensión .csv válido.');
      return;
    }

    try {
      const text = await file.text();
      if (!text.trim()) {
        setError('El archivo CSV está vacío.');
        return;
      }

      const result = CsvParserService.parse(text);

      if (result.headers.length === 0 || result.totalRows === 0) {
        setError('No se pudieron extraer columnas o transacciones del archivo.');
        return;
      }

      setSelectedFile(file);
      setParsedMeta({
        delimiter: result.delimiter,
        rowCount: result.totalRows,
        headersCount: result.headers.length,
      });

      onFileParsed(file, result, text);
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo CSV.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParsedMeta(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className={styles.container}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className={styles.fileInput}
        onChange={handleFileInputChange}
        disabled={disabled}
      />

      {error && (
        <div className={styles.errorBox}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {!selectedFile ? (
        <div
          className={`${styles.dropzone} ${isDragging ? styles.dropzoneDragging : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className={styles.iconWrapper}>
            <UploadCloud size={32} />
          </div>
          <h3 className={styles.title}>Arrastra tu extracto bancario CSV</h3>
          <p className={styles.subtitle}>
            Compatible con BBVA, Santander, CaixaBank, Revolut, Openbank y cualquier banco que exporte en CSV con comas o punto y coma.
          </p>
          <div className={styles.formatBadge}>
            <span>Archivos .csv</span>
            <span>•</span>
            <span>Hasta 10 MB</span>
          </div>
        </div>
      ) : (
        <div className={styles.fileCard}>
          <div className={styles.fileInfo}>
            <div className={styles.fileIcon}>
              <FileText size={24} />
            </div>
            <div className={styles.fileMeta}>
              <span className={styles.fileName}>{selectedFile.name}</span>
              <div className={styles.fileDetails}>
                <span>{formatFileSize(selectedFile.size)}</span>
                <span>•</span>
                <span>{parsedMeta?.rowCount} transacciones detectadas</span>
                <span>•</span>
                <span>
                  Delimitador:{' '}
                  <span className={styles.delimiterTag}>
                    {parsedMeta?.delimiter === ';' ? 'Punto y coma (;)' : 'Coma (,)'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw size={14} />}
              onClick={handleReset}
              disabled={disabled}
            >
              Cambiar archivo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
