import { apiRequest } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { PageResponse, PageParams } from '../types/api';
import {
  MaintenanceRecord,
  MaintenanceRequest,
  MaintenanceCompleteRequest,
  MaintenanceWorkOrder,
} from '../types/maintenance';

export const maintenanceService = {
  getAll: (params?: PageParams & {
    assetId?: number;
    status?: string;
    maintenanceType?: string;
  }): Promise<PageResponse<MaintenanceRecord>> => {
    const searchParams = new URLSearchParams();
    if (params?.page !== undefined) searchParams.set('page', String(params.page));
    if (params?.size !== undefined) searchParams.set('size', String(params.size));
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.q) searchParams.set('q', params.q);
    if (params?.assetId) searchParams.set('assetId', String(params.assetId));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.maintenanceType) searchParams.set('maintenanceType', params.maintenanceType);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<PageResponse<MaintenanceRecord>>(`${API_ENDPOINTS.MAINTENANCES}${query}`);
  },

  getById: (id: number): Promise<MaintenanceRecord> => {
    return apiRequest<MaintenanceRecord>(`${API_ENDPOINTS.MAINTENANCES}/${id}`);
  },

  getWorkOrder: (id: number): Promise<MaintenanceWorkOrder> => {
    return apiRequest<MaintenanceWorkOrder>(`${API_ENDPOINTS.MAINTENANCES}/${id}/work-order`);
  },

  create: (request: MaintenanceRequest): Promise<MaintenanceRecord> => {
    return apiRequest<MaintenanceRecord>(API_ENDPOINTS.MAINTENANCES, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  complete: (id: number, request?: MaintenanceCompleteRequest): Promise<MaintenanceRecord> => {
    return apiRequest<MaintenanceRecord>(`${API_ENDPOINTS.MAINTENANCES}/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(request || {}),
    });
  },
};

