import { apiRequest } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import {
  MaintenanceRecord,
  MaintenanceRequest,
  MaintenanceCompleteRequest,
} from '../types/maintenance';

export const maintenanceService = {
  getAll: (assetId?: number, status?: string): Promise<MaintenanceRecord[]> => {
    const params = new URLSearchParams();
    if (assetId) params.set('assetId', String(assetId));
    if (status) params.set('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<MaintenanceRecord[]>(`${API_ENDPOINTS.MAINTENANCES}${query}`);
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

