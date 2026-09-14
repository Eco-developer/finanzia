import { apiClient } from './api-client';

export interface ImportRowPayload {
  rowId: string;
  date: string;
  description: string;
  amountCents: number;
  hash: string;
}

export interface PreviewImportPayload {
  accountId: string;
  rows: ImportRowPayload[];
}

export interface RowPreviewResult {
  rowId: string;
  isDuplicate: boolean;
  suggestedCategoryId: string | null;
  suggestedCategoryName: string | null;
}

export interface PreviewImportResult {
  totalRows: number;
  newCount: number;
  duplicateCount: number;
  preview: RowPreviewResult[];
}

export interface CommitRowPayload {
  date: string;
  description: string;
  amountCents: number;
  categoryId?: string | null;
  deduplicationHash?: string | null;
}

export interface CommitImportPayload {
  accountId: string;
  rows: CommitRowPayload[];
}

export interface CommitImportResult {
  importedCount: number;
  skippedCount: number;
  totalProcessed: number;
  newAccountBalanceCents: number;
}

export interface CsvTemplateItem {
  id: string;
  bankName: string;
  columnMapping: {
    dateCol: string;
    descCol: string;
    amountCol: string;
    incomeCol?: string;
    expenseCol?: string;
    delimiter?: string;
    dateFormat?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SaveTemplatePayload {
  bankName: string;
  columnMapping: {
    dateCol: string;
    descCol: string;
    amountCol: string;
    incomeCol?: string;
    expenseCol?: string;
    delimiter?: string;
    dateFormat?: string;
  };
}

export const importsApi = {
  async previewImport(payload: PreviewImportPayload): Promise<PreviewImportResult> {
    const res = await apiClient<PreviewImportResult>('/imports/preview', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async commitImport(payload: CommitImportPayload): Promise<CommitImportResult> {
    const res = await apiClient<CommitImportResult>('/imports/commit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async getTemplates(): Promise<CsvTemplateItem[]> {
    const res = await apiClient<CsvTemplateItem[]>('/imports/templates');
    return res.data || [];
  },

  async saveTemplate(payload: SaveTemplatePayload): Promise<CsvTemplateItem> {
    const res = await apiClient<CsvTemplateItem>('/imports/templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async deleteTemplate(id: string): Promise<boolean> {
    const res = await apiClient<{ success: boolean }>(`/imports/templates/${id}`, {
      method: 'DELETE',
    });
    return res.data?.success ?? true;
  },
};
