import { apiRequest } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { FleetVehicle, FleetStatusUpdateRequest } from '../types/fleet';
import { ProcurementOrder } from '../types/procurement';
import { InventoryAudit, AuditScan, SystemAuditLog } from '../types/audit';
import { SystemSetting } from '../types/settings';

export const enterpriseService = {
  // Fleet
  getFleet: (params?: {
    departmentId?: number;
    vehicleType?: string;
    status?: string;
  }): Promise<FleetVehicle[]> => {
    const searchParams = new URLSearchParams();
    if (params?.departmentId) searchParams.set('departmentId', String(params.departmentId));
    if (params?.vehicleType) searchParams.set('vehicleType', params.vehicleType);
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<FleetVehicle[]>(`${API_ENDPOINTS.FLEET}${query}`);
  },

  updateFleetStatus: (id: number, payload: FleetStatusUpdateRequest): Promise<{ status: string; message: string }> => {
    return apiRequest<{ status: string; message: string }>(`${API_ENDPOINTS.FLEET}/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Procurement
  getProcurement: (params?: {
    departmentId?: number;
    status?: string;
  }): Promise<ProcurementOrder[]> => {
    const searchParams = new URLSearchParams();
    if (params?.departmentId) searchParams.set('departmentId', String(params.departmentId));
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<ProcurementOrder[]>(`${API_ENDPOINTS.PROCUREMENT}${query}`);
  },

  // Audits & Physical Counting
  getAudits: (): Promise<InventoryAudit[]> => {
    return apiRequest<InventoryAudit[]>(API_ENDPOINTS.AUDITS);
  },

  getAuditScans: (auditId: number): Promise<AuditScan[]> => {
    return apiRequest<AuditScan[]>(`${API_ENDPOINTS.AUDITS}/${auditId}/scans`);
  },

  recordAuditScan: (
    auditId: number,
    payload: { assetCode: string; scannedLocation: string }
  ): Promise<{ status: string; message: string }> => {
    return apiRequest<{ status: string; message: string }>(`${API_ENDPOINTS.AUDITS}/${auditId}/scan`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // System Audit Logs
  getAuditLogs: (limit = 100): Promise<SystemAuditLog[]> => {
    return apiRequest<SystemAuditLog[]>(`${API_ENDPOINTS.AUDIT_LOGS}?limit=${limit}`);
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

