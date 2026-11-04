import { apiRequest } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type { UserSession, ChangePasswordRequest, ApiMessageResponse } from '../types/auth';

export const authService = {
  async login(username: string, password: string): Promise<UserSession> {
    // 1. Kimlik doğrulama isteği
    await apiRequest<UserSession>(API_ENDPOINTS.LOGIN, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    // 2. Giriş sonrası oturumu ve yeni XSRF-TOKEN çerezini tazelemek için /me çağrılır
    const session = await apiRequest<UserSession>(API_ENDPOINTS.ME, {
      method: 'GET',
    });

    return session;
  },

  async getCurrentUser(): Promise<UserSession> {
    return apiRequest<UserSession>(API_ENDPOINTS.ME, {
      method: 'GET',
      skipAuthRedirect: true,
    });
  },

  async logout(): Promise<ApiMessageResponse> {
    return apiRequest<ApiMessageResponse>(API_ENDPOINTS.LOGOUT, {
      method: 'POST',
    });
  },

  async changePassword(req: ChangePasswordRequest): Promise<ApiMessageResponse> {
    return apiRequest<ApiMessageResponse>(API_ENDPOINTS.CHANGE_PASSWORD, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },
};
