import { apiRequest } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { AssetMovement } from '../types/movement';

export const movementService = {
  getAll: (params?: { assetId?: number; type?: string }): Promise<AssetMovement[]> => {
    const searchParams = new URLSearchParams();
    if (params?.assetId) searchParams.set('assetId', String(params.assetId));
    if (params?.type) searchParams.set('type', params.type);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<AssetMovement[]>(`${API_ENDPOINTS.MOVEMENTS}${query}`);
  },
};
