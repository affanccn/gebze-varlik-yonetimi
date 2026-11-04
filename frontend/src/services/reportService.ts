import { apiRequest } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { DepreciationReportItem } from '../types/report';

export const reportService = {
  getDepreciationReport: (): Promise<DepreciationReportItem[]> => {
    return apiRequest<DepreciationReportItem[]>(API_ENDPOINTS.REPORTS_DEPRECIATION);
  },
};
