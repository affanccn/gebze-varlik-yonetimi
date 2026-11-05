import { apiRequest } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import {
  DepreciationReportItem,
  Form13ReportItem,
  DisposalReportItem,
} from '../types/report';

export const reportService = {
  getDepreciationReport: (): Promise<DepreciationReportItem[]> => {
    return apiRequest<DepreciationReportItem[]>(API_ENDPOINTS.REPORTS_DEPRECIATION);
  },

  getForm13Report: (departmentId?: number): Promise<Form13ReportItem[]> => {
    const q = departmentId ? `?departmentId=${departmentId}` : '';
    return apiRequest<Form13ReportItem[]>(`${API_ENDPOINTS.REPORTS_FORM13}${q}`);
  },

  getDisposalReport: (): Promise<DisposalReportItem[]> => {
    return apiRequest<DisposalReportItem[]>(API_ENDPOINTS.REPORTS_DISPOSAL);
  },

  getExportUrl: (type: 'form13' | 'depreciation' | 'disposal', departmentId?: number): string => {
    const params = new URLSearchParams();
    params.set('type', type);
    if (departmentId) params.set('departmentId', String(departmentId));
    return `${API_ENDPOINTS.REPORTS_EXPORT}?${params.toString()}`;
  },
};
