import { apiRequest } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { CursorResponse } from '../types/api';
import { AssetMovement } from '../types/movement';

export const movementService = {
  getAll: (params?: {
    cursor?: string;
    size?: number;
    assetId?: number;
    type?: string;
    q?: string;
  }): Promise<CursorResponse<AssetMovement>> => {
    const searchParams = new URLSearchParams();
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.size) searchParams.set('size', String(params.size));
    if (params?.assetId) searchParams.set('assetId', String(params.assetId));
    if (params?.type) searchParams.set('type', params.type);
    if (params?.q) searchParams.set('q', params.q);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<CursorResponse<AssetMovement>>(`${API_ENDPOINTS.MOVEMENTS}${query}`);
  },
};

