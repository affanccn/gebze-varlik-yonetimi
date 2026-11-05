import { apiRequest } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { PageResponse } from '../types/api';
import { Personnel } from '../types/personnel';

export interface PersonnelQueryParams {
  departmentId?: number;
  roomId?: number;
  query?: string;
  q?: string;
  sortBy?: string;
  sort?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
}

export const personnelService = {
  getAll: (params?: PersonnelQueryParams): Promise<PageResponse<Personnel>> => {
    const searchParams = new URLSearchParams();
    if (params?.departmentId) searchParams.set('departmentId', String(params.departmentId));
    if (params?.roomId) searchParams.set('roomId', String(params.roomId));
    if (params?.query) searchParams.set('query', params.query);
    if (params?.q) searchParams.set('q', params.q);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
    if (params?.page !== undefined) searchParams.set('page', String(params.page));
    if (params?.size !== undefined) searchParams.set('size', String(params.size));

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<PageResponse<Personnel>>(`${API_ENDPOINTS.PERSONNEL}${query}`);
  },

  getById: (id: number): Promise<Personnel> => {
    return apiRequest<Personnel>(`${API_ENDPOINTS.PERSONNEL}/${id}`);
  },

  create: (data: Partial<Personnel>): Promise<Personnel> => {
    return apiRequest<Personnel>(API_ENDPOINTS.PERSONNEL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: number, data: Partial<Personnel>): Promise<Personnel> => {
    return apiRequest<Personnel>(`${API_ENDPOINTS.PERSONNEL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: number): Promise<void> => {
    return apiRequest<void>(`${API_ENDPOINTS.PERSONNEL}/${id}`, {
      method: 'DELETE',
    });
  },
};


