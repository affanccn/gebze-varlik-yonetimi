export interface InventoryAudit {
  id: number;
  auditCode: string;
  title: string;
  buildingId?: number | null;
  departmentId?: number | null;
  scopeDescription?: string | null;
  totalExpected: number;
  totalScanned: number;
  totalMissing: number;
  totalExcess: number;
  status: string; // 'PLANLANDI' | 'DEVAM_EDIYOR' | 'TAMAMLANDI'
  startedAt?: string | null;
  completedAt?: string | null;
  leadAuditor: string;
  notes?: string | null;
}

export interface AuditScan {
  id: number;
  auditId: number;
  assetId?: number | null;
  assetCode: string;
  assetName: string;
  expectedLocation?: string | null;
  scannedLocation: string;
  matchStatus: string; // 'ESLESTI' | 'FARKLI_ODA' | 'TANIMSIZ'
  scannedAt: string;
  scannedBy: string;
  notes?: string | null;
}

export interface SystemAuditLog {
  id: number;
  actionType: string;
  entityType?: string | null;
  entityId?: string | null;
  actorUsername: string;
  actorName: string;
  ipAddress?: string | null;
  description: string;
  createdAt: string;
}

