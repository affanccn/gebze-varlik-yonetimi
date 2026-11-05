import { apiRequest } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { PageResponse, PageParams } from '../types/api';
import {
  AssetAssignment,
  AssignmentRequest,
  AssignmentReturnRequest,
} from '../types/assignment';

export const assignmentService = {
  getAll: (params?: PageParams & {
    assetId?: number;
    personnelId?: number;
    status?: string;
  }): Promise<PageResponse<AssetAssignment>> => {
    const searchParams = new URLSearchParams();
    if (params?.page !== undefined) searchParams.set('page', String(params.page));
    if (params?.size !== undefined) searchParams.set('size', String(params.size));
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.q) searchParams.set('q', params.q);
    if (params?.assetId) searchParams.set('assetId', String(params.assetId));
    if (params?.personnelId) searchParams.set('personnelId', String(params.personnelId));
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<PageResponse<AssetAssignment>>(`${API_ENDPOINTS.ASSIGNMENTS}${query}`);
  },

  create: (request: AssignmentRequest): Promise<AssetAssignment> => {
    return apiRequest<AssetAssignment>(API_ENDPOINTS.ASSIGNMENTS, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  returnAssignment: (id: number, request?: AssignmentReturnRequest): Promise<AssetAssignment> => {
    return apiRequest<AssetAssignment>(`${API_ENDPOINTS.ASSIGNMENTS}/${id}/return`, {
      method: 'POST',
      body: JSON.stringify(request || { returnNote: 'Depo yetkilisi tarafından teslim alındı.' }),
    });
  },
};

