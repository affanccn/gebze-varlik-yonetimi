import { apiRequest } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import {
  AssetAssignment,
  AssignmentRequest,
  AssignmentReturnRequest,
} from '../types/assignment';

export const assignmentService = {
  getAll: (assetId?: number, status?: string): Promise<AssetAssignment[]> => {
    const params = new URLSearchParams();
    if (assetId) params.set('assetId', String(assetId));
    if (status) params.set('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<AssetAssignment[]>(`${API_ENDPOINTS.ASSIGNMENTS}${query}`);
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

