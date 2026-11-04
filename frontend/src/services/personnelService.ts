import { apiRequest } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { Personnel } from '../types/personnel';

export const personnelService = {
  getAll: (params?: { departmentId?: number; roomId?: number; query?: string }): Promise<Personnel[]> => {
    const searchParams = new URLSearchParams();
    if (params?.departmentId) searchParams.set('departmentId', String(params.departmentId));
    if (params?.roomId) searchParams.set('roomId', String(params.roomId));
    if (params?.query) searchParams.set('query', params.query);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<Personnel[]>(`${API_ENDPOINTS.PERSONNEL}${query}`);
  },

  getById: (id: number): Promise<Personnel> => {
    return apiRequest<Personnel>(`${API_ENDPOINTS.PERSONNEL}/${id}`);
  },
};
