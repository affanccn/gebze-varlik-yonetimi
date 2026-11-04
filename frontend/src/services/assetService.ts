import { apiRequest } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { Asset, AssetDetailResponse } from '../types/asset';

export const assetService = {
  getAll: (params?: {
    query?: string;
    departmentId?: number;
    categoryId?: number;
    status?: string;
    assignedPersonnelId?: number;
  }): Promise<Asset[]> => {
    const searchParams = new URLSearchParams();
    if (params?.query) searchParams.set('query', params.query);
    if (params?.departmentId) searchParams.set('departmentId', String(params.departmentId));
    if (params?.categoryId) searchParams.set('categoryId', String(params.categoryId));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.assignedPersonnelId) searchParams.set('assignedPersonnelId', String(params.assignedPersonnelId));

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<Asset[]>(`${API_ENDPOINTS.ASSETS}${query}`);
  },

  getById: (id: number): Promise<AssetDetailResponse> => {
    return apiRequest<AssetDetailResponse>(`${API_ENDPOINTS.ASSETS}/${id}`);
  },
};

