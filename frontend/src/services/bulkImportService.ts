import { apiRequest } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import {
  BulkImportValidationResult,
  BulkImportCommitResult,
} from '../types/bulkImport';

export const bulkImportService = {
  downloadTemplate: async (): Promise<void> => {
    const res = await fetch(API_ENDPOINTS.ASSET_EXPORT_TEMPLATE, {
      credentials: 'same-origin',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Excel şablonu indirilemedi.');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gebze_varlik_ice_aktarim_sablonu.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  validate: async (file: File): Promise<BulkImportValidationResult> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequest<BulkImportValidationResult>(API_ENDPOINTS.ASSET_IMPORT_VALIDATE, {
      method: 'POST',
      body: formData,
    });
  },

  commit: async (file: File, partialImportAllowed = false): Promise<BulkImportCommitResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('partialImportAllowed', String(partialImportAllowed));
    return apiRequest<BulkImportCommitResult>(API_ENDPOINTS.ASSET_IMPORT_COMMIT, {
      method: 'POST',
      body: formData,
    });
  },
};

