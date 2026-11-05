import { apiRequest } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { PageResponse, PageParams } from '../types/api';
import { AssetDocument } from '../types/document';

export const documentService = {
  getAll: (params?: PageParams & {
    assetId?: number;
    documentType?: string;
  }): Promise<PageResponse<AssetDocument>> => {
    const searchParams = new URLSearchParams();
    if (params?.page !== undefined) searchParams.set('page', String(params.page));
    if (params?.size !== undefined) searchParams.set('size', String(params.size));
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.q) searchParams.set('q', params.q);
    if (params?.assetId) searchParams.set('assetId', String(params.assetId));
    if (params?.documentType) searchParams.set('documentType', params.documentType);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<PageResponse<AssetDocument>>(`${API_ENDPOINTS.DOCUMENTS}${query}`);
  },
};

