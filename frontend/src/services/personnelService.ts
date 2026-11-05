import { apiRequest } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { PageResponse } from '../types/api';
import {
  Personnel,
  PersonnelImportValidationResult,
  PersonnelImportCommitResult,
} from '../types/personnel';

export interface PersonnelQueryParams {
  departmentId?: number;
  roomId?: number;
  query?: string;
  q?: string;
  sortBy?: string;
  sort?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
}

export const personnelService = {
  getAll: (params?: PersonnelQueryParams): Promise<PageResponse<Personnel>> => {
    const searchParams = new URLSearchParams();
    if (params?.departmentId) searchParams.set('departmentId', String(params.departmentId));
    if (params?.roomId) searchParams.set('roomId', String(params.roomId));
    if (params?.query) searchParams.set('query', params.query);
    if (params?.q) searchParams.set('q', params.q);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
    if (params?.page !== undefined) searchParams.set('page', String(params.page));
    if (params?.size !== undefined) searchParams.set('size', String(params.size));

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<PageResponse<Personnel>>(`${API_ENDPOINTS.PERSONNEL}${query}`);
  },

  getById: (id: number): Promise<Personnel> => {
    return apiRequest<Personnel>(`${API_ENDPOINTS.PERSONNEL}/${id}`);
  },

  create: (data: Partial<Personnel>): Promise<Personnel> => {
    return apiRequest<Personnel>(API_ENDPOINTS.PERSONNEL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: number, data: Partial<Personnel>): Promise<Personnel> => {
    return apiRequest<Personnel>(`${API_ENDPOINTS.PERSONNEL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: number): Promise<void> => {
    return apiRequest<void>(`${API_ENDPOINTS.PERSONNEL}/${id}`, {
      method: 'DELETE',
    });
  },

  exportTemplateUrl: (): string => {
    return API_ENDPOINTS.PERSONNEL_EXPORT_TEMPLATE;
  },

  validateImport: (file: File): Promise<PersonnelImportValidationResult> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequest<PersonnelImportValidationResult>(API_ENDPOINTS.PERSONNEL_IMPORT_VALIDATE, {
      method: 'POST',
      body: formData,
    });
  },

  commitImport: (file: File): Promise<PersonnelImportCommitResult> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequest<PersonnelImportCommitResult>(API_ENDPOINTS.PERSONNEL_IMPORT_COMMIT, {
      method: 'POST',
      body: formData,
    });
  },

  syncHr: (): Promise<{ status: string; message: string; addedCount: number; updatedCount: number; totalSynced: number }> => {
    return apiRequest<{ status: string; message: string; addedCount: number; updatedCount: number; totalSynced: number }>(
      API_ENDPOINTS.PERSONNEL_SYNC_HR,
      { method: 'POST' }
    );
  },
};
