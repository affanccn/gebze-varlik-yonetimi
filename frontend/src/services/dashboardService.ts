import { apiRequest } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { DashboardSummary } from '../types/dashboard';

export const dashboardService = {
  getSummary: (): Promise<DashboardSummary> => {
    return apiRequest<DashboardSummary>(API_ENDPOINTS.DASHBOARD);
  },
  getAlerts: (): Promise<unknown[]> => {
    return apiRequest<unknown[]>(API_ENDPOINTS.ALERTS);
  },
};
