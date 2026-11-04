import { apiRequest } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import {
  Asset,
  AssetRequest,
  TransferRequest,
  TransitionRequest,
  AssetDetailResponse,
} from '../types/asset';

export const assetService = {
  getAll: (params?: {
    query?: string;
    departmentId?: number;
    categoryId?: number;
    status?: string;
    condition?: string;
    buildingId?: number;
    roomId?: number;
    assignedPersonnelId?: number;
  }): Promise<Asset[]> => {
    const searchParams = new URLSearchParams();
    if (params?.query) searchParams.set('query', params.query);
    if (params?.departmentId) searchParams.set('departmentId', String(params.departmentId));
    if (params?.categoryId) searchParams.set('categoryId', String(params.categoryId));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.condition) searchParams.set('condition', params.condition);
    if (params?.buildingId) searchParams.set('buildingId', String(params.buildingId));
    if (params?.roomId) searchParams.set('roomId', String(params.roomId));
    if (params?.assignedPersonnelId) searchParams.set('assignedPersonnelId', String(params.assignedPersonnelId));

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<Asset[]>(`${API_ENDPOINTS.ASSETS}${query}`);
  },

  getById: (id: number): Promise<AssetDetailResponse> => {
    return apiRequest<AssetDetailResponse>(`${API_ENDPOINTS.ASSETS}/${id}`);
  },

  create: (data: AssetRequest): Promise<Asset> => {
    return apiRequest<Asset>(API_ENDPOINTS.ASSETS, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: number, data: AssetRequest): Promise<Asset> => {
    return apiRequest<Asset>(`${API_ENDPOINTS.ASSETS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  transfer: (id: number, data: TransferRequest): Promise<Asset> => {
    return apiRequest<Asset>(`${API_ENDPOINTS.ASSETS}/${id}/transfer`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getTransitions: (id: number): Promise<string[]> => {
    return apiRequest<string[]>(`${API_ENDPOINTS.ASSETS}/${id}/transitions`);
  },

  transition: (id: number, data: TransitionRequest): Promise<Asset> => {
    return apiRequest<Asset>(`${API_ENDPOINTS.ASSETS}/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  delete: (id: number): Promise<{ success: boolean; deletedId: number; code: string }> => {
    return apiRequest<{ success: boolean; deletedId: number; code: string }>(
      `${API_ENDPOINTS.ASSETS}/${id}`,
      { method: 'DELETE' }
    );
  },
};
