import { apiRequest } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { AssetDocument } from '../types/document';

export const documentService = {
  getAll: (params?: { assetId?: number; documentType?: string }): Promise<AssetDocument[]> => {
    const searchParams = new URLSearchParams();
    if (params?.assetId) searchParams.set('assetId', String(params.assetId));
    if (params?.documentType) searchParams.set('documentType', params.documentType);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<AssetDocument[]>(`${API_ENDPOINTS.DOCUMENTS}${query}`);
  },
};

