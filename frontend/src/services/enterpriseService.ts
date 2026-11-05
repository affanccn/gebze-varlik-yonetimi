import { apiRequest } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { PageResponse, CursorResponse, PageParams } from '../types/api';
import { FleetVehicle, FleetStatusUpdateRequest } from '../types/fleet';
import { ProcurementOrder } from '../types/procurement';
import { InventoryAudit, AuditScan, AuditScanResult, AuditReconciliationSummary, SystemAuditLog } from '../types/audit';
import { SystemSetting } from '../types/settings';

export const enterpriseService = {
  // Fleet
  getFleet: (params?: PageParams & {
    departmentId?: number;
    vehicleType?: string;
    status?: string;
  }): Promise<PageResponse<FleetVehicle>> => {
    const searchParams = new URLSearchParams();
    if (params?.page !== undefined) searchParams.set('page', String(params.page));
    if (params?.size !== undefined) searchParams.set('size', String(params.size));
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.q) searchParams.set('q', params.q);
    if (params?.departmentId) searchParams.set('departmentId', String(params.departmentId));
    if (params?.vehicleType) searchParams.set('vehicleType', params.vehicleType);
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<PageResponse<FleetVehicle>>(`${API_ENDPOINTS.FLEET}${query}`);
  },

  updateFleetStatus: (id: number, payload: FleetStatusUpdateRequest): Promise<{ status: string; message: string }> => {
    return apiRequest<{ status: string; message: string }>(`${API_ENDPOINTS.FLEET}/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Procurement
  getProcurement: (params?: PageParams & {
    departmentId?: number;
    status?: string;
  }): Promise<PageResponse<ProcurementOrder>> => {
    const searchParams = new URLSearchParams();
    if (params?.page !== undefined) searchParams.set('page', String(params.page));
    if (params?.size !== undefined) searchParams.set('size', String(params.size));
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.q) searchParams.set('q', params.q);
    if (params?.departmentId) searchParams.set('departmentId', String(params.departmentId));
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<PageResponse<ProcurementOrder>>(`${API_ENDPOINTS.PROCUREMENT}${query}`);
  },

  // Audits & Physical Counting
  getAudits: (): Promise<InventoryAudit[]> => {
    return apiRequest<InventoryAudit[]>(API_ENDPOINTS.AUDITS);
  },

  getAuditScans: (auditId: number): Promise<AuditScan[]> => {
    return apiRequest<AuditScan[]>(`${API_ENDPOINTS.AUDITS}/${auditId}/scans`);
  },

  getAuditReconciliation: (auditId: number): Promise<AuditReconciliationSummary> => {
    return apiRequest<AuditReconciliationSummary>(`${API_ENDPOINTS.AUDITS}/${auditId}/reconciliation`);
  },

  recordAuditScan: (
    auditId: number,
    payload: { assetCode: string; scannedLocation: string }
  ): Promise<AuditScanResult> => {
    return apiRequest<AuditScanResult>(`${API_ENDPOINTS.AUDITS}/${auditId}/scan`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // System Audit Logs (Keyset)
  getAuditLogs: (params?: {
    cursor?: string;
    size?: number;
    actionType?: string;
    actor?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<CursorResponse<SystemAuditLog>> => {
    const searchParams = new URLSearchParams();
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.size) searchParams.set('size', String(params.size));
    if (params?.actionType) searchParams.set('actionType', params.actionType);
    if (params?.actor) searchParams.set('actor', params.actor);
    if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
    if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<CursorResponse<SystemAuditLog>>(`${API_ENDPOINTS.AUDIT_LOGS}${query}`);
  },

  // System Settings
  getSettings: (): Promise<SystemSetting[]> => {
    return apiRequest<SystemSetting[]>(API_ENDPOINTS.SETTINGS);
  },

  updateSetting: (paramKey: string, paramValue: string): Promise<{ status: string; message: string }> => {
    return apiRequest<{ status: string; message: string }>(API_ENDPOINTS.SETTINGS, {
      method: 'POST',
      body: JSON.stringify({ paramKey, paramValue }),
    });
  },
};

