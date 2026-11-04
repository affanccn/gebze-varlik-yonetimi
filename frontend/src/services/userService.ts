import { apiRequest } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import {
  UserResponse,
  UserCreateRequest,
  UserUpdateRequest,
  UserResetPasswordResponse,
} from '../types/user';

export const userService = {
  getAll: (params?: {
    role?: string;
    department_id?: number;
    is_active?: boolean;
  }): Promise<UserResponse[]> => {
    const searchParams = new URLSearchParams();
    if (params?.role) searchParams.set('role', params.role);
    if (params?.department_id) searchParams.set('department_id', String(params.department_id));
    if (params?.is_active !== undefined) searchParams.set('is_active', String(params.is_active));
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<UserResponse[]>(`${API_ENDPOINTS.USERS}${query}`);
  },

  getById: (id: number): Promise<UserResponse> => {
    return apiRequest<UserResponse>(`${API_ENDPOINTS.USERS}/${id}`);
  },

  create: (request: UserCreateRequest): Promise<UserResponse> => {
    return apiRequest<UserResponse>(API_ENDPOINTS.USERS, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  update: (id: number, request: UserUpdateRequest): Promise<UserResponse> => {
    return apiRequest<UserResponse>(`${API_ENDPOINTS.USERS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  },

  deactivate: (id: number): Promise<UserResponse> => {
    return apiRequest<UserResponse>(`${API_ENDPOINTS.USERS}/${id}/deactivate`, {
      method: 'POST',
    });
  },

  resetPassword: (id: number): Promise<UserResetPasswordResponse> => {
    return apiRequest<UserResetPasswordResponse>(`${API_ENDPOINTS.USERS}/${id}/reset-password`, {
      method: 'POST',
    });
  },
};

